import { useState, useEffect, useCallback, useRef } from 'react';
import { ipcRenderer } from 'electron';
import { Task, NotionSettings, NotionSyncStatus, NotionSyncConflict, NotionSyncStats } from '../../shared/types';
import { NotionService } from '../services/NotionService';

/**
 * Notion同期フックの戻り値の型
 */
interface UseNotionSyncReturn {
  /** Notion設定 */
  notionSettings: NotionSettings | null;
  /** 同期状態 */
  syncStatus: NotionSyncStatus;
  /** 同期統計 */
  syncStats: NotionSyncStats;
  /** 未解決の競合リスト */
  conflicts: NotionSyncConflict[];
  /** 接続状態 */
  isConnected: boolean;
  /** 接続中かどうか */
  isConnecting: boolean;
  /** エラーメッセージ */
  errorMessage: string | null;
  
  /** 設定を更新する関数 */
  updateSettings: (settings: NotionSettings) => Promise<boolean>;
  /** 接続テストを実行する関数 */
  testConnection: () => Promise<boolean>;
  /** 手動同期を実行する関数 */
  performSync: (tasks: Task[]) => Promise<boolean>;
  /** 競合を解決する関数 */
  resolveConflict: (taskId: number, resolution: 'local_wins' | 'notion_wins') => Promise<boolean>;
  /** 自動同期の開始/停止 */
  toggleAutoSync: () => Promise<boolean>;
  /** 設定をリセットする関数 */
  resetSettings: () => Promise<boolean>;
  /** データをエクスポートする関数 */
  exportData: () => Promise<string | null>;
  /** データをインポートする関数 */
  importData: (jsonData: string) => Promise<boolean>;
}

/**
 * Notion連携を管理するカスタムフック
 */
export function useNotionSync(): UseNotionSyncReturn {
  const [notionSettings, setNotionSettings] = useState<NotionSettings | null>(null);
  const [syncStatus, setSyncStatus] = useState<NotionSyncStatus>({
    isSyncing: false,
    lastSyncResult: null,
    lastSyncTime: null,
    errorMessage: null,
    syncedCount: 0,
    conflictCount: 0,
    failedCount: 0,
  });
  const [syncStats, setSyncStats] = useState<NotionSyncStats>({
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    averageSyncTime: 0,
    totalConflicts: 0,
    resolvedConflicts: 0,
  });
  const [conflicts, setConflicts] = useState<NotionSyncConflict[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // NotionServiceのインスタンス
  const notionServiceRef = useRef<NotionService | null>(null);
  const autoSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * エラーを設定
   */
  const setError = useCallback((message: string): void => {
    console.error('Notion sync error:', message);
    setErrorMessage(message);
    setSyncStatus(prev => ({
      ...prev,
      lastSyncResult: 'error',
      errorMessage: message,
      isSyncing: false,
    }));
  }, []);

  /**
   * エラーをクリア
   */
  const clearError = useCallback((): void => {
    setErrorMessage(null);
    setSyncStatus(prev => ({
      ...prev,
      errorMessage: null,
    }));
  }, []);

  /**
   * 初期データの読み込み
   */
  const loadInitialData = useCallback(async (): Promise<void> => {
    try {
      // 各種データを並行して取得
      const [settings, stats, conflictList] = await Promise.all([
        ipcRenderer.invoke('get-notion-settings'),
        ipcRenderer.invoke('get-notion-sync-stats'),
        ipcRenderer.invoke('get-notion-conflicts'),
      ]);

      setNotionSettings(settings);
      setSyncStats(stats);
      setConflicts(conflictList);

      // Notion設定が有効な場合は接続を試行
      if (settings && settings.apiToken && settings.databaseId) {
        await initializeNotionService(settings);
      }
    } catch (error) {
      setError(`初期データの読み込みに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [setError]);

  /**
   * NotionServiceを初期化
   */
  const initializeNotionService = useCallback(async (settings: NotionSettings): Promise<void> => {
    try {
      if (!notionServiceRef.current) {
        notionServiceRef.current = new NotionService();
      }

      notionServiceRef.current.initialize(settings);
      console.log('Notion service initialized with new settings');
    } catch (error) {
      console.error('Failed to initialize Notion service:', error);
      throw error;
    }
  }, []);

  /**
   * 設定を更新
   */
  const updateSettings = useCallback(async (settings: NotionSettings): Promise<boolean> => {
    try {
      clearError();
      
      const success = await ipcRenderer.invoke('update-notion-settings', settings);
      if (success) {
        setNotionSettings(settings);
        
        // 設定が有効な場合はNotionサービスを初期化
        if (settings.apiToken && settings.databaseId) {
          await initializeNotionService(settings);
          
          // 自動同期の設定を適用
          if (settings.autoSyncEnabled) {
            await startAutoSync(settings.syncInterval);
          } else {
            stopAutoSync();
          }
        } else {
          setIsConnected(false);
          stopAutoSync();
        }
      }
      
      return success;
    } catch (error) {
      setError(`設定の更新に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }, [clearError, initializeNotionService]);

  /**
   * 接続テスト
   */
  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!notionServiceRef.current || !notionSettings) {
      setError('Notion設定が不完全です');
      return false;
    }

    setIsConnecting(true);
    clearError();

    try {
      const isConnected = await notionServiceRef.current.testConnection();
      setIsConnected(isConnected);
      
      if (isConnected) {
        console.log('Notion connection test successful');
      } else {
        setError('Notionへの接続に失敗しました');
      }
      
      return isConnected;
    } catch (error) {
      setError(`接続テストに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsConnected(false);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [notionSettings, clearError, setError]);

  /**
   * 手動同期を実行
   */
  const performSync = useCallback(async (tasks: Task[]): Promise<boolean> => {
    if (!notionServiceRef.current) {
      setError('Notion連携が初期化されていません');
      return false;
    }

    setSyncStatus(prev => ({
      ...prev,
      isSyncing: true,
      errorMessage: null,
    }));
    clearError();

    const startTime = Date.now();

    try {
      console.log('Starting manual Notion sync...');
      
      const result = await notionServiceRef.current.performSync(tasks);
      const duration = Date.now() - startTime;

      // 結果を状態に反映
      setSyncStatus(result.syncStatus);
      setConflicts(result.conflicts);

      // IPCを通じて結果を保存
      await Promise.all([
        ipcRenderer.invoke('notion-sync-completed', {
          success: result.syncStatus.lastSyncResult === 'success',
          syncedCount: result.syncStatus.syncedCount,
          conflictCount: result.syncStatus.conflictCount,
          duration,
        }),
        ipcRenderer.invoke('update-notion-conflicts', result.conflicts),
      ]);

      // 統計を更新
      const updatedStats = await ipcRenderer.invoke('get-notion-sync-stats');
      setSyncStats(updatedStats);

      console.log(`Manual sync completed in ${duration}ms`);
      return result.syncStatus.lastSyncResult !== 'error';
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      setError(`同期に失敗しました: ${errorMsg}`);
      
      // エラー結果を保存
      await ipcRenderer.invoke('notion-sync-completed', {
        success: false,
        syncedCount: 0,
        conflictCount: 0,
        duration,
        errorMessage: errorMsg,
      });

      return false;
    }
  }, [clearError, setError]);

  /**
   * 競合を解決
   */
  const resolveConflict = useCallback(async (taskId: number, resolution: 'local_wins' | 'notion_wins'): Promise<boolean> => {
    try {
      const success = await ipcRenderer.invoke('resolve-notion-conflict', taskId, resolution);
      
      if (success) {
        // ローカル状態から競合を削除
        setConflicts(prev => prev.filter(conflict => conflict.taskId !== taskId));
        
        // 統計を更新
        const updatedStats = await ipcRenderer.invoke('get-notion-sync-stats');
        setSyncStats(updatedStats);
        
        console.log(`Conflict resolved for task ${taskId}: ${resolution}`);
      }
      
      return success;
    } catch (error) {
      setError(`競合の解決に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }, [setError]);

  /**
   * 自動同期を開始
   */
  const startAutoSync = useCallback(async (intervalMinutes: number): Promise<void> => {
    stopAutoSync(); // 既存のタイマーをクリア

    if (intervalMinutes > 0) {
      autoSyncIntervalRef.current = setInterval(async () => {
        try {
          // 現在のタスクを取得して同期実行
          const tasks: Task[] = await ipcRenderer.invoke('get-tasks');
          await performSync(tasks);
        } catch (error) {
          console.error('Auto sync failed:', error);
        }
      }, intervalMinutes * 60 * 1000);

      console.log(`Auto sync started with ${intervalMinutes} minute interval`);
    }
  }, [performSync]);

  /**
   * 自動同期を停止
   */
  const stopAutoSync = useCallback((): void => {
    if (autoSyncIntervalRef.current) {
      clearInterval(autoSyncIntervalRef.current);
      autoSyncIntervalRef.current = null;
      console.log('Auto sync stopped');
    }
  }, []);

  /**
   * 自動同期の切り替え
   */
  const toggleAutoSync = useCallback(async (): Promise<boolean> => {
    if (!notionSettings) return false;

    const newSettings = {
      ...notionSettings,
      autoSyncEnabled: !notionSettings.autoSyncEnabled,
    };

    return updateSettings(newSettings);
  }, [notionSettings, updateSettings]);

  /**
   * 設定をリセット
   */
  const resetSettings = useCallback(async (): Promise<boolean> => {
    try {
      const defaultSettings: NotionSettings = {
        apiToken: '',
        databaseId: '',
        syncInterval: 30,
        autoSyncEnabled: false,
        statusPropertyName: 'Status',
        titlePropertyName: 'Name',
        estimatedTimePropertyName: 'Estimated Time',
        actualTimePropertyName: 'Actual Time',
      };

      const success = await updateSettings(defaultSettings);
      if (success) {
        setIsConnected(false);
        stopAutoSync();
        clearError();
      }
      
      return success;
    } catch (error) {
      setError(`設定のリセットに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }, [updateSettings, stopAutoSync, clearError, setError]);

  /**
   * データをエクスポート
   */
  const exportData = useCallback(async (): Promise<string | null> => {
    try {
      return await ipcRenderer.invoke('export-notion-data');
    } catch (error) {
      setError(`データのエクスポートに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }, [setError]);

  /**
   * データをインポート
   */
  const importData = useCallback(async (jsonData: string): Promise<boolean> => {
    try {
      const success = await ipcRenderer.invoke('import-notion-data', jsonData);
      
      if (success) {
        // データを再読み込み
        await loadInitialData();
      }
      
      return success;
    } catch (error) {
      setError(`データのインポートに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }, [setError, loadInitialData]);

  // コンポーネントマウント時の初期化
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // メインプロセスからの同期開始イベントをリッスン
  useEffect(() => {
    const handleSyncRequest = async () => {
      try {
        const tasks: Task[] = await ipcRenderer.invoke('get-tasks');
        await performSync(tasks);
      } catch (error) {
        console.error('Failed to handle sync request:', error);
      }
    };

    ipcRenderer.on('start-notion-sync', handleSyncRequest);

    return () => {
      ipcRenderer.removeListener('start-notion-sync', handleSyncRequest);
    };
  }, [performSync]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      stopAutoSync();
    };
  }, [stopAutoSync]);

  return {
    notionSettings,
    syncStatus,
    syncStats,
    conflicts,
    isConnected,
    isConnecting,
    errorMessage,
    updateSettings,
    testConnection,
    performSync,
    resolveConflict,
    toggleAutoSync,
    resetSettings,
    exportData,
    importData,
  };
} 