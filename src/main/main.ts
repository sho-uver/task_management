import { app, BrowserWindow, ipcMain, powerMonitor, IpcMainInvokeEvent, shell } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ElectronStore from 'electron-store';
import { Task, Settings, StoreSchema, WindowBounds, CompletedTask, TaskCompletionStats, NotionSettings, NotionSyncStats, NotionSyncConflict, ExtendedStoreSchema } from '../shared/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const store = new ElectronStore<ExtendedStoreSchema>({
  defaults: {
    tasks: [],
    completedTasks: [],
    settings: {
      isAlwaysOnTop: false,
      window: {
        width: 400,
        height: 600,
        x: undefined,
        y: undefined
      }
    },
    notionSettings: {
      apiToken: '',
      databaseId: '',
      syncInterval: 30,
      autoSyncEnabled: false,
      statusPropertyName: 'Status',
      titlePropertyName: 'Name',
      estimatedTimePropertyName: 'Estimated Time',
      actualTimePropertyName: 'Actual Time'
    },
    notionSyncStats: {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageSyncTime: 0,
      totalConflicts: 0,
      resolvedConflicts: 0
    },
    notionConflicts: []
  }
});

let mainWindow: BrowserWindow | null = null;

/**
 * バックグラウンド処理とタイマー状態管理クラス
 */
class BackgroundProcessManager {
  private isInitialized: boolean = false;
  private activeTimers: Map<number, { startTime: number; lastActivity: number }> = new Map();
  private suspendedTimers: Map<number, { timestamp: number; reason: string }> = new Map();
  private lastActivityTimes: Map<number, number> = new Map();
  private pendingResumeSuggestions: Map<number, string> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private baseMonitoringInterval: number = 5 * 60 * 1000; // 5分
  private minMonitoringInterval: number = 1 * 60 * 1000; // 1分
  private maxMonitoringInterval: number = 15 * 60 * 1000; // 15分
  private systemLoadHistory: number[] = [];
  private maxSystemLoadHistory: number = 10;
  private currentMonitoringInterval: number = this.baseMonitoringInterval;

  /**
   * バックグラウンド処理マネージャーを初期化
   */
  initialize(): void {
    if (this.isInitialized) return;

    this.setupPeriodicTasks();
    this.setupActivityMonitoring();
    this.isInitialized = true;
    console.log('Background Process Manager initialized');
  }

  /**
   * 定期タスクの設定
   */
  private setupPeriodicTasks(): void {
    // 5分ごとのデータ同期とクリーンアップ
    setInterval(() => {
      this.performMaintenanceTasks();
    }, 5 * 60 * 1000); // 5分

    // 30秒ごとのアクティブタイマー監視
    setInterval(() => {
      this.monitorActiveTimers();
    }, 30 * 1000); // 30秒

    // 1分ごとの復帰提案生成
    setInterval(() => {
      this.generateResumeSuggestions();
    }, 60 * 1000); // 1分
  }

  /**
   * アクティビティ監視の設定
   */
  private setupActivityMonitoring(): void {
    // タイマー開始時の記録
    ipcMain.handle('register-timer-activity', (event, taskId: number) => {
      this.registerTimerActivity(taskId);
    });

    // タイマー停止時の記録
    ipcMain.handle('unregister-timer-activity', (event, taskId: number) => {
      this.unregisterTimerActivity(taskId);
    });

    // システムサスペンド時の処理
    ipcMain.handle('handle-system-suspend', () => {
      return this.handleSystemSuspend();
    });

    // システム復帰時の処理
    ipcMain.handle('handle-system-resume', () => {
      return this.handleSystemResume();
    });
  }

  /**
   * 定期メンテナンスタスクの実行
   */
  private performMaintenanceTasks(): void {
    try {
      console.log('Running background maintenance tasks...');
      
      // 古いアクティビティ記録をクリーンアップ
      this.cleanupOldActivityRecords();
      
      // 長時間非アクティブなタイマーのチェック
      this.checkInactiveTimers();
      
      // データの整合性チェック
      this.validateDataIntegrity();
      
      console.log('Background maintenance completed');
    } catch (error) {
      console.error('Error in background maintenance:', error);
    }
  }

  /**
   * システム負荷を計算
   */
  private async calculateSystemLoad(): Promise<number> {
    try {
      const cpuUsage = await this.getCPUUsage();
      const memoryUsage = await this.getMemoryUsage();
      return (cpuUsage + memoryUsage) / 2;
    } catch (error) {
      console.warn('Failed to calculate system load:', error);
      return 0.5; // デフォルト値
    }
  }

  /**
   * CPU使用率を取得
   */
  private async getCPUUsage(): Promise<number> {
    // 実際のCPU使用率取得ロジックを実装
    return 0.5; // 仮の実装
  }

  /**
   * メモリ使用率を取得
   */
  private async getMemoryUsage(): Promise<number> {
    // 実際のメモリ使用率取得ロジックを実装
    return 0.5; // 仮の実装
  }

  /**
   * 監視間隔を動的に調整
   */
  private async adjustMonitoringInterval(): Promise<void> {
    const systemLoad = await this.calculateSystemLoad();
    this.systemLoadHistory.push(systemLoad);
    
    // 履歴の長さを制限
    if (this.systemLoadHistory.length > this.maxSystemLoadHistory) {
      this.systemLoadHistory.shift();
    }
    
    // 平均負荷を計算
    const avgLoad = this.systemLoadHistory.reduce((a, b) => a + b, 0) / this.systemLoadHistory.length;
    
    // 負荷に応じて監視間隔を調整
    if (avgLoad > 0.8) {
      // 高負荷時は間隔を延長
      this.currentMonitoringInterval = Math.min(
        this.currentMonitoringInterval * 1.2,
        this.maxMonitoringInterval
      );
    } else if (avgLoad < 0.3) {
      // 低負荷時は間隔を短縮
      this.currentMonitoringInterval = Math.max(
        this.currentMonitoringInterval * 0.8,
        this.minMonitoringInterval
      );
    }
    
    // 監視間隔を更新
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = setInterval(
        () => this.monitorActiveTimers(),
        this.currentMonitoringInterval
      );
    }
  }

  /**
   * アクティブタイマーの監視（改善版）
   */
  private async monitorActiveTimers(): Promise<void> {
    const now = Date.now();
    const inactiveThreshold = 15 * 60 * 1000; // 15分

    // システム負荷に応じて監視間隔を調整
    await this.adjustMonitoringInterval();

    this.lastActivityTimes.forEach((lastActivity, taskId) => {
      const inactiveTime = now - lastActivity;
      
      if (inactiveTime > inactiveThreshold && !this.suspendedTimers.has(taskId)) {
        console.log(`Timer ${taskId} has been inactive for ${Math.round(inactiveTime / 60000)} minutes`);
        
        // システム負荷に応じて警告の重要度を調整
        const warningLevel = this.systemLoadHistory.length > 0 && 
          this.systemLoadHistory[this.systemLoadHistory.length - 1] > 0.8
          ? 'high'
          : 'normal';
        
        this.suggestTimerPause(taskId, `Extended inactivity detected (${warningLevel} load)`);
      }
    });
  }

  /**
   * 復帰提案の生成
   */
  private generateResumeSuggestions(): void {
    const now = Date.now();
    const suggestionThreshold = 5 * 60 * 1000; // 5分

    this.suspendedTimers.forEach(taskId => {
      if (!this.pendingResumeSuggestions.has(taskId)) {
        // システムアクティビティベースの復帰提案
        try {
          const systemIdleTime = powerMonitor.getSystemIdleTime() * 1000;
          
          if (systemIdleTime < suggestionThreshold) {
            this.pendingResumeSuggestions.set(taskId, 'System activity detected after timer suspension');
            
            console.log(`Resume suggestion generated for task ${taskId}`);
          }
        } catch (error) {
          console.error('Error generating resume suggestion:', error);
        }
      }
    });
  }

  /**
   * システムサスペンド時の処理
   */
  public handleSystemSuspend(): void {
    const timestamp = Date.now();
    const suspendedList: number[] = [];

    this.lastActivityTimes.forEach((_, taskId) => {
      this.suspendedTimers.set(taskId, {
        timestamp,
        reason: 'System suspend'
      });
      suspendedList.push(taskId);
    });

    if (suspendedList.length > 0) {
      console.log(`System suspend detected, suspended ${suspendedList.length} timers`);
      mainWindow?.webContents.send('system-suspend', {
        timestamp,
        suspendedTasks: suspendedList
      });
    }
  }

  /**
   * システムレジューム時の処理
   */
  public handleSystemResume(): void {
    const timestamp = Date.now();
    const resumedList: number[] = [];

    this.suspendedTimers.forEach((data, taskId) => {
      if (data.reason === 'System suspend') {
        this.suspendedTimers.delete(taskId);
        resumedList.push(taskId);
      }
    });

    if (resumedList.length > 0) {
      console.log(`System resume detected, resuming ${resumedList.length} timers`);
      mainWindow?.webContents.send('system-resume', {
        timestamp,
        resumedTasks: resumedList
      });
    }
  }

  /**
   * タイマーの一時停止を提案
   */
  private suggestTimerPause(taskId: number, reason: string): void {
    if (!this.suspendedTimers.has(taskId)) {
      const now = Date.now();
      this.suspendedTimers.set(taskId, {
        timestamp: now,
        reason
      });
      
      // メインプロセスに通知
      mainWindow?.webContents.send('timer-pause-suggestion', {
        taskId,
        reason,
        timestamp: now
      });
    }
  }

  /**
   * タイマーの再開を提案
   */
  private suggestTimerResume(taskId: number, reason: string): void {
    if (this.suspendedTimers.has(taskId)) {
      const now = Date.now();
      this.suspendedTimers.delete(taskId);
      this.pendingResumeSuggestions.set(taskId, reason);
      
      // メインプロセスに通知
      mainWindow?.webContents.send('timer-resume-suggestion', {
        taskId,
        reason,
        timestamp: now
      });
    }
  }

  /**
   * 復帰理由の生成
   */
  private generateResumeReason(taskId: number): string {
    const suggestion = this.pendingResumeSuggestions.get(taskId);
    
    if (suggestion) {
      return suggestion;
    }
    
    return 'System resume detected - consider resuming work';
  }

  /**
   * 古いアクティビティ記録のクリーンアップ
   */
  private cleanupOldActivityRecords(): void {
    const threshold = Date.now() - 24 * 60 * 60 * 1000; // 24時間前
    let cleanedCount = 0;

    this.lastActivityTimes.forEach((timestamp, taskId) => {
      if (timestamp < threshold) {
        this.lastActivityTimes.delete(taskId);
        this.unregisterTimerActivity(taskId);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old activity records`);
    }
  }

  /**
   * 非アクティブタイマーのチェック
   */
  private checkInactiveTimers(): void {
    const now = Date.now();
    const warningThreshold = 30 * 60 * 1000; // 30分
    
    this.lastActivityTimes.forEach((lastActivity, taskId) => {
      const inactiveTime = now - lastActivity;
      
      if (inactiveTime > warningThreshold) {
        console.warn(`Timer ${taskId} has been inactive for ${Math.round(inactiveTime / 60000)} minutes`);
      }
    });
  }

  /**
   * データ整合性のチェック
   */
  private validateDataIntegrity(): void {
    try {
      const tasks: Task[] = store.get('tasks');
      const completedTasks: CompletedTask[] = store.get('completedTasks');
      
      // 重複IDのチェック
      const activeIds = new Set(tasks.map(t => t.id));
      const completedIds = new Set(completedTasks.map(t => t.id));
      
      const overlapping = [...activeIds].filter(id => completedIds.has(id));
      
      if (overlapping.length > 0) {
        console.warn(`Data integrity issue: ${overlapping.length} overlapping task IDs found`);
      }
      
      // 時間形式の検証
      tasks.forEach(task => {
        if (!this.isValidTimeFormat(task.actualTime) || !this.isValidTimeFormat(task.estimatedTime)) {
          console.warn(`Invalid time format in task ${task.id}: actual="${task.actualTime}", estimated="${task.estimatedTime}"`);
        }
      });
      
    } catch (error) {
      console.error('Error validating data integrity:', error);
    }
  }

  /**
   * 時間形式の検証
   */
  private isValidTimeFormat(timeString: string): boolean {
    const timePattern = /^([0-9]{1,2}):([0-5][0-9]):([0-5][0-9])$/;
    return timePattern.test(timeString);
  }

  /**
   * タイマーを登録
   */
  registerTimerActivity(taskId: number): void {
    const now = Date.now();
    this.activeTimers.set(taskId, {
      startTime: now,
      lastActivity: now
    });
    this.lastActivityTimes.set(taskId, now);
    console.log(`Timer activity registered for task ${taskId}`);
  }

  /**
   * タイマーを登録解除
   */
  unregisterTimerActivity(taskId: number): void {
    this.activeTimers.delete(taskId);
    this.lastActivityTimes.delete(taskId);
    this.suspendedTimers.delete(taskId);
    this.pendingResumeSuggestions.delete(taskId);
    console.log(`Timer activity unregistered for task ${taskId}`);
  }

  /**
   * バックグラウンド統計を取得
   */
  getBackgroundStats(): object {
    return {
      activeTimers: this.activeTimers.size,
      suspendedTimers: this.suspendedTimers.size,
      pendingResumeSuggestions: this.pendingResumeSuggestions.size,
      lastMaintenanceRun: new Date().toISOString()
    };
  }

  /**
   * シャットダウン
   */
  shutdown(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.activeTimers.clear();
    this.lastActivityTimes.clear();
    this.suspendedTimers.clear();
    this.pendingResumeSuggestions.clear();
    this.isInitialized = false;
    console.log('Background Process Manager shutdown completed');
  }
}

// グローバルインスタンス
const backgroundProcessManager = new BackgroundProcessManager();

function createWindow(): BrowserWindow {
  // 保存された設定を読み込む
  const settings: Settings = store.get('settings');
  const windowSettings: WindowBounds = settings.window;

  // ウィンドウを作成（改善版）
  const win = new BrowserWindow({
    width: windowSettings.width,
    height: windowSettings.height,
    x: windowSettings.x,
    y: windowSettings.y,
    frame: true,
    resizable: true,
    // ウィンドウフレーム設定の最適化
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    // カーソル表示問題の解決
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // スムーズなカーソル表示のため
      webSecurity: true
    },
    // ウィンドウ操作性の向上
    minimizable: true,
    maximizable: false,
    closable: true,
    alwaysOnTop: settings.isAlwaysOnTop,
    // ウィンドウアイコンの設定（存在する場合）
    icon: process.platform === 'win32' ? join(__dirname, '../assets/icon.ico') : undefined,
    // ウィンドウ表示設定
    show: false, // 初期化後に表示
    focusable: true,
    skipTaskbar: false,
    // レスポンシブ対応
    minWidth: 350,
    minHeight: 300,
    maxWidth: 800,
    maxHeight: 1200
  });

  // 開発モードの場合はwebpack-dev-serverから読み込み
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:8080');
    win.webContents.openDevTools();
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'));
  }

  // 設定の適用
  win.setAlwaysOnTop(settings.isAlwaysOnTop);

  // ウィンドウ表示の最適化
  win.once('ready-to-show', () => {
    win.show();
    if (process.env.NODE_ENV === 'development') {
      win.webContents.openDevTools();
    }
  });

  // カーソル表示問題の解決: ウィンドウフォーカス管理
  win.on('focus', () => {
    // フォーカス時にカーソル状態をリセット
    win.webContents.executeJavaScript(`
      document.body.style.cursor = 'default';
      // アクティブな要素のカーソルを適切に設定
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName === 'INPUT') {
        activeElement.style.cursor = 'text';
      }
    `).catch(() => {
      // エラーは無視（ページ読み込み前など）
    });
  });

  // ウィンドウ状態の管理強化
  win.on('blur', () => {
    // ブラー時の処理
    console.log('Window lost focus');
  });

  win.on('minimize', () => {
    console.log('Window minimized');
  });

  win.on('restore', () => {
    console.log('Window restored');
    // 復元時にカーソル状態をリセット
    win.webContents.executeJavaScript(`
      document.body.style.cursor = 'default';
    `).catch(() => {});
  });

  // ウィンドウの位置とサイズが変更されたときの処理（改善版）
  let saveWindowBoundsTimeout: NodeJS.Timeout | null = null;
  
  const saveWindowBounds = (): void => {
    if (win.isDestroyed()) return;
    
    try {
      const bounds: WindowBounds = win.getBounds();
      // 有効な値のみ保存
      if (bounds.width > 0 && bounds.height > 0) {
        store.set('settings.window', bounds);
      }
    } catch (error) {
      console.error('Failed to save window bounds:', error);
    }
  };

  win.on('resize', () => {
    if (saveWindowBoundsTimeout) {
      clearTimeout(saveWindowBoundsTimeout);
    }
    saveWindowBoundsTimeout = setTimeout(saveWindowBounds, 500);
  });

  win.on('move', () => {
    if (saveWindowBoundsTimeout) {
      clearTimeout(saveWindowBoundsTimeout);
    }
    saveWindowBoundsTimeout = setTimeout(saveWindowBounds, 500);
  });

  // ウィンドウ閉じる前の処理
  win.on('close', (event) => {
    // 設定を即座に保存
    saveWindowBounds();
    console.log('Window closing, settings saved');
  });

  mainWindow = win;
  return win;
}

/**
 * IPCハンドラーの設定
 * @param win メインウィンドウのインスタンス
 */
function setupIpcHandlers(win: BrowserWindow): void {
  // バックグラウンドプロセス管理のIPCハンドラーを追加
  ipcMain.handle('get-background-stats', () => {
    return backgroundProcessManager.getBackgroundStats();
  });

  ipcMain.handle('register-timer-activity', (event, taskId: number) => {
    return backgroundProcessManager.initialize();
  });

  // タスク関連
  ipcMain.handle('get-tasks', (): Task[] => {
    return store.get('tasks');
  });

  ipcMain.handle('save-tasks', (event: IpcMainInvokeEvent, tasks: Task[]): boolean => {
    store.set('tasks', tasks);
    return true;
  });

  // 設定関連
  ipcMain.handle('get-settings', (): Settings => {
    return store.get('settings');
  });

  ipcMain.handle('update-settings', (event: IpcMainInvokeEvent, settings: Settings): boolean => {
    store.set('settings', settings);
    win.setAlwaysOnTop(settings.isAlwaysOnTop);
    return true;
  });

  // システムのアイドル時間を取得（改善版）
  ipcMain.handle('get-system-idle-time', (): number => {
    try {
      // powerMonitorが利用可能かチェック
      if (!powerMonitor || typeof powerMonitor.getSystemIdleTime !== 'function') {
        console.warn('powerMonitor.getSystemIdleTime is not available');
        return 0;
      }

      const idleTimeSeconds: number = powerMonitor.getSystemIdleTime();
      const idleTimeMs: number = idleTimeSeconds * 1000; // 秒をミリ秒に変換

      // 異常値のチェック
      if (idleTimeMs < 0 || idleTimeMs > 86400000) { // 24時間を超える場合は異常とみなす
        console.warn(`Abnormal idle time detected: ${idleTimeMs}ms`);
        return 0;
      }

      return idleTimeMs;
    } catch (error) {
      console.error('Error getting system idle time:', error);
      return 0; // エラー時は0を返す
    }
  });

  // システム情報を取得
  ipcMain.handle('get-system-info', () => {
    try {
      return {
        platform: process.platform,
        version: process.version,
        powerMonitorAvailable: typeof powerMonitor?.getSystemIdleTime === 'function',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting system info:', error);
      return null;
    }
  });

  // アイドル検知のテスト用メソッド
  ipcMain.handle('test-idle-detection', async (): Promise<boolean> => {
    try {
      const idleTime = powerMonitor.getSystemIdleTime();
      console.log(`Test idle detection - current idle time: ${idleTime}s`);
      return idleTime >= 0;
    } catch (error) {
      console.error('Idle detection test failed:', error);
      return false;
    }
  });

  // タスクの作業時間を更新（改善版）
  ipcMain.handle('update-task-time', (event: IpcMainInvokeEvent, taskId: number, newTime: string): boolean => {
    try {
      // 入力値の検証
      if (typeof taskId !== 'number' || taskId <= 0) {
        console.error('Invalid task ID:', taskId);
        return false;
      }

      if (typeof newTime !== 'string' || !newTime) {
        console.error('Invalid time format:', newTime);
        return false;
      }

      // 時間形式の検証（HH:mm:ss）
      const timePattern = /^([0-9]{1,2}):([0-5][0-9]):([0-5][0-9])$/;
      if (!timePattern.test(newTime)) {
        console.error('Invalid time format, expected HH:mm:ss:', newTime);
        return false;
      }

      // 現在のタスクリストを取得
      const tasks: Task[] = store.get('tasks');
      
      // タスクの存在確認
      const taskIndex = tasks.findIndex(task => task.id === taskId);
      if (taskIndex === -1) {
        console.error('Task not found:', taskId);
        return false;
      }

      const currentTask = tasks[taskIndex];
      
      // 時間の妥当性チェック（24時間を超える場合は警告）
      const [hours, minutes, seconds] = newTime.split(':').map(Number);
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      
      if (totalSeconds > 86400) { // 24時間 = 86400秒
        console.warn(`Task ${taskId} has very long time: ${newTime} (${totalSeconds}s)`);
      }

      // 時間が逆行していないかチェック
      const currentTimeSeconds = parseTimeToSeconds(currentTask.actualTime);
      const newTimeSeconds = parseTimeToSeconds(newTime);
      
      if (newTimeSeconds < currentTimeSeconds) {
        console.warn(`Time rollback detected for task ${taskId}: ${currentTask.actualTime} -> ${newTime}`);
      }

      // タスクを更新
      const updatedTasks: Task[] = tasks.map((task: Task) => {
        if (task.id === taskId) {
          return { 
            ...task, 
            actualTime: newTime,
            // 更新日時を記録（将来の拡張用）
            lastUpdated: new Date().toISOString()
          };
        }
        return task;
      });

      // ストアに保存
      store.set('tasks', updatedTasks);
      
      console.log(`Task ${taskId} time updated: ${currentTask.actualTime} -> ${newTime}`);
      return true;
      
    } catch (error) {
      console.error('Error updating task time:', error);
      return false;
    }
  });

  // タスクの自動保存とバックアップ
  ipcMain.handle('backup-task-time', (event: IpcMainInvokeEvent, taskId: number): boolean => {
    try {
      const tasks: Task[] = store.get('tasks');
      const task = tasks.find(t => t.id === taskId);
      
      if (!task) {
        return false;
      }

      // 簡易的なバックアップ（過去5回分）
      const backupKey = `task_${taskId}_backup`;
      const existingBackups = store.get(backupKey, []);
      
      const newBackup = {
        time: task.actualTime,
        timestamp: new Date().toISOString()
      };
      
      const updatedBackups = [newBackup, ...existingBackups.slice(0, 4)];
      store.set(backupKey, updatedBackups);
      
      return true;
    } catch (error) {
      console.error('Error backing up task time:', error);
      return false;
    }
  });

  // タスク時間の統計情報を取得
  ipcMain.handle('get-task-time-stats', (event: IpcMainInvokeEvent, taskId: number): object | null => {
    try {
      const tasks: Task[] = store.get('tasks');
      const task = tasks.find(t => t.id === taskId);
      
      if (!task) {
        return null;
      }

      const actualSeconds = parseTimeToSeconds(task.actualTime);
      const estimatedSeconds = parseTimeToSeconds(task.estimatedTime);
      
      return {
        taskId,
        actualTime: task.actualTime,
        estimatedTime: task.estimatedTime,
        actualSeconds,
        estimatedSeconds,
        variance: actualSeconds - estimatedSeconds,
        efficiency: estimatedSeconds > 0 ? (estimatedSeconds / actualSeconds) * 100 : 0,
        lastUpdated: (task as any).lastUpdated || 'Unknown'
      };
    } catch (error) {
      console.error('Error getting task time stats:', error);
      return null;
    }
  });

  // タスクの完了処理
  ipcMain.handle('complete-task', (event: IpcMainInvokeEvent, taskId: number): boolean => {
    try {
      // 入力値の検証
      if (typeof taskId !== 'number' || taskId <= 0) {
        console.error('Invalid task ID:', taskId);
        return false;
      }

      // 現在のタスクリストを取得
      const tasks: Task[] = store.get('tasks');
      const taskIndex = tasks.findIndex(task => task.id === taskId);
      
      if (taskIndex === -1) {
        console.error('Task not found:', taskId);
        return false;
      }

      const task = tasks[taskIndex];
      
      // 完了時の統計情報を計算
      const actualSeconds = parseTimeToSeconds(task.actualTime);
      const estimatedSeconds = parseTimeToSeconds(task.estimatedTime);
      const completedAt = new Date().toISOString();
      
      const completionStats: TaskCompletionStats = {
        actualSeconds,
        estimatedSeconds,
        variance: actualSeconds - estimatedSeconds,
        efficiency: estimatedSeconds > 0 ? (estimatedSeconds / actualSeconds) * 100 : 0,
        completedAt,
        workingDays: task.lastUpdated ? 
          Math.ceil((new Date(completedAt).getTime() - new Date(task.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)) : 
          undefined
      };

      // 完了したタスクとして保存
      const completedTask: CompletedTask = {
        ...task,
        status: 'completed',
        completedAt,
        completionStats
      };

      // 完了タスクリストに追加
      const completedTasks: CompletedTask[] = store.get('completedTasks');
      const updatedCompletedTasks = [completedTask, ...completedTasks];
      store.set('completedTasks', updatedCompletedTasks);

      // アクティブタスクリストから削除
      const updatedTasks = tasks.filter(t => t.id !== taskId);
      store.set('tasks', updatedTasks);

      console.log(`Task ${taskId} completed: ${task.title}`);
      console.log(`Stats - Actual: ${task.actualTime}, Estimated: ${task.estimatedTime}, Efficiency: ${completionStats.efficiency.toFixed(1)}%`);
      
      return true;
      
    } catch (error) {
      console.error('Error completing task:', error);
      return false;
    }
  });

  // 完了したタスクの一覧を取得
  ipcMain.handle('get-completed-tasks', (): CompletedTask[] => {
    try {
      return store.get('completedTasks');
    } catch (error) {
      console.error('Error getting completed tasks:', error);
      return [];
    }
  });

  // 完了したタスクを削除
  ipcMain.handle('delete-completed-task', (event: IpcMainInvokeEvent, taskId: number): boolean => {
    try {
      const completedTasks: CompletedTask[] = store.get('completedTasks');
      const updatedCompletedTasks = completedTasks.filter(t => t.id !== taskId);
      store.set('completedTasks', updatedCompletedTasks);
      
      console.log(`Completed task ${taskId} deleted from history`);
      return true;
    } catch (error) {
      console.error('Error deleting completed task:', error);
      return false;
    }
  });

  // Notion連携関連のIPCハンドラーを追加
  
  // Notion設定の取得
  ipcMain.handle('get-notion-settings', (): NotionSettings | null => {
    try {
      return store.get('notionSettings') || null;
    } catch (error) {
      console.error('Error getting Notion settings:', error);
      return null;
    }
  });

  // Notion設定の更新
  ipcMain.handle('update-notion-settings', (event: IpcMainInvokeEvent, settings: NotionSettings): boolean => {
    try {
      // APIトークンのセキュリティチェック
      if (settings.apiToken && !settings.apiToken.startsWith('secret_')) {
        console.warn('Invalid Notion API token format');
        return false;
      }

      // データベースIDのフォーマットチェック
      if (settings.databaseId && !/^[a-f0-9-]{32,}$/.test(settings.databaseId.replace(/-/g, ''))) {
        console.warn('Invalid Notion database ID format');
        return false;
      }

      store.set('notionSettings', settings);
      console.log('Notion settings updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating Notion settings:', error);
      return false;
    }
  });

  // Notion接続テスト
  ipcMain.handle('test-notion-connection', async (event: IpcMainInvokeEvent, settings: NotionSettings): Promise<boolean> => {
    try {
      // セキュリティのため、実際のテストはレンダラープロセスで実行
      // ここでは基本的な検証のみ
      if (!settings.apiToken || !settings.databaseId) {
        return false;
      }

      console.log('Notion connection test requested');
      return true; // 実際のテストはフロントエンドで行う
    } catch (error) {
      console.error('Error testing Notion connection:', error);
      return false;
    }
  });

  // Notion同期統計の取得
  ipcMain.handle('get-notion-sync-stats', (): NotionSyncStats => {
    try {
      return store.get('notionSyncStats') || {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        averageSyncTime: 0,
        totalConflicts: 0,
        resolvedConflicts: 0
      };
    } catch (error) {
      console.error('Error getting Notion sync stats:', error);
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        averageSyncTime: 0,
        totalConflicts: 0,
        resolvedConflicts: 0
      };
    }
  });

  // Notion同期統計の更新
  ipcMain.handle('update-notion-sync-stats', (event: IpcMainInvokeEvent, stats: NotionSyncStats): boolean => {
    try {
      store.set('notionSyncStats', stats);
      console.log('Notion sync stats updated');
      return true;
    } catch (error) {
      console.error('Error updating Notion sync stats:', error);
      return false;
    }
  });

  // Notion競合情報の取得
  ipcMain.handle('get-notion-conflicts', (): NotionSyncConflict[] => {
    try {
      return store.get('notionConflicts') || [];
    } catch (error) {
      console.error('Error getting Notion conflicts:', error);
      return [];
    }
  });

  // Notion競合情報の更新
  ipcMain.handle('update-notion-conflicts', (event: IpcMainInvokeEvent, conflicts: NotionSyncConflict[]): boolean => {
    try {
      store.set('notionConflicts', conflicts);
      console.log(`Updated ${conflicts.length} Notion conflicts`);
      return true;
    } catch (error) {
      console.error('Error updating Notion conflicts:', error);
      return false;
    }
  });

  // 特定の競合を解決
  ipcMain.handle('resolve-notion-conflict', (event: IpcMainInvokeEvent, taskId: number, resolution: 'local_wins' | 'notion_wins'): boolean => {
    try {
      const conflicts: NotionSyncConflict[] = store.get('notionConflicts') || [];
      const updatedConflicts = conflicts.filter(conflict => conflict.taskId !== taskId);
      
      store.set('notionConflicts', updatedConflicts);
      
      // 統計を更新
      const stats: NotionSyncStats = store.get('notionSyncStats') || {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        averageSyncTime: 0,
        totalConflicts: 0,
        resolvedConflicts: 0
      };
      
      stats.resolvedConflicts++;
      store.set('notionSyncStats', stats);
      
      console.log(`Resolved Notion conflict for task ${taskId} with resolution: ${resolution}`);
      return true;
    } catch (error) {
      console.error('Error resolving Notion conflict:', error);
      return false;
    }
  });

  // Notion同期実行の要求（レンダラープロセス主導）
  ipcMain.handle('request-notion-sync', async (event: IpcMainInvokeEvent): Promise<boolean> => {
    try {
      console.log('Notion sync requested from renderer');
      
      // レンダラープロセスに同期開始を通知
      win.webContents.send('start-notion-sync');
      
      return true;
    } catch (error) {
      console.error('Error requesting Notion sync:', error);
      return false;
    }
  });

  // Notion同期の結果を受信
  ipcMain.handle('notion-sync-completed', (
    event: IpcMainInvokeEvent, 
    result: { 
      success: boolean; 
      syncedCount: number; 
      conflictCount: number; 
      duration: number;
      errorMessage?: string;
    }
  ): boolean => {
    try {
      // 統計を更新
      const stats: NotionSyncStats = store.get('notionSyncStats') || {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        averageSyncTime: 0,
        totalConflicts: 0,
        resolvedConflicts: 0
      };

      stats.totalSyncs++;
      if (result.success) {
        stats.successfulSyncs++;
      } else {
        stats.failedSyncs++;
      }

      // 平均同期時間を更新
      stats.averageSyncTime = (stats.averageSyncTime * (stats.totalSyncs - 1) + result.duration) / stats.totalSyncs;
      
      if (result.conflictCount > 0) {
        stats.totalConflicts += result.conflictCount;
      }

      store.set('notionSyncStats', stats);

      console.log(`Notion sync completed: ${result.success ? 'success' : 'failed'}`);
      console.log(`- Synced: ${result.syncedCount}, Conflicts: ${result.conflictCount}, Duration: ${result.duration}ms`);
      
      if (result.errorMessage) {
        console.error('Sync error:', result.errorMessage);
      }

      return true;
    } catch (error) {
      console.error('Error processing sync completion:', error);
      return false;
    }
  });

  // Notionデータのエクスポート
  ipcMain.handle('export-notion-data', async (): Promise<string | null> => {
    try {
      const exportData = {
        settings: store.get('notionSettings'),
        stats: store.get('notionSyncStats'),
        conflicts: store.get('notionConflicts'),
        exportTime: new Date().toISOString()
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting Notion data:', error);
      return null;
    }
  });

  // Notionデータのインポート
  ipcMain.handle('import-notion-data', (event: IpcMainInvokeEvent, jsonData: string): boolean => {
    try {
      const importData = JSON.parse(jsonData);
      
      if (importData.settings) {
        store.set('notionSettings', importData.settings);
      }
      if (importData.stats) {
        store.set('notionSyncStats', importData.stats);
      }
      if (importData.conflicts) {
        store.set('notionConflicts', importData.conflicts);
      }

      console.log('Notion data imported successfully');
      return true;
    } catch (error) {
      console.error('Error importing Notion data:', error);
      return false;
    }
  });
}

/**
 * powerMonitorイベントの設定（改善版）
 * @param win メインウィンドウのインスタンス
 */
function setupPowerMonitorEvents(win: BrowserWindow): void {
  try {
    // システムサスペンド/レジューム時の処理（改善版）
    powerMonitor.on('suspend', async () => {
      console.log('System is going to sleep');
      
      try {
        const suspendInfo = await backgroundProcessManager.handleSystemSuspend();
        win.webContents.send('system-suspend', suspendInfo);
      } catch (error) {
        console.error('Error handling system suspend:', error);
        win.webContents.send('system-suspend', { suspendedTimers: [], timestamp: Date.now() });
      }
    });

    powerMonitor.on('resume', async () => {
      console.log('System woke up');
      
      try {
        const resumeInfo = await backgroundProcessManager.handleSystemResume();
        win.webContents.send('system-resume', resumeInfo);
      } catch (error) {
        console.error('Error handling system resume:', error);
        win.webContents.send('system-resume', { resumeOptions: [] });
      }
    });

    // システムロック/アンロック時の処理（Windows/macOSのみ）
    if (process.platform === 'win32' || process.platform === 'darwin') {
      powerMonitor.on('lock-screen', () => {
        console.log('Screen locked');
        win.webContents.send('screen-locked', { timestamp: Date.now() });
      });

      powerMonitor.on('unlock-screen', () => {
        console.log('Screen unlocked');
        win.webContents.send('screen-unlocked', { timestamp: Date.now() });
      });
    }

    console.log('PowerMonitor events setup completed with enhanced features');
  } catch (error) {
    console.error('Error setting up PowerMonitor events:', error);
  }
}

/**
 * アプリケーションの初期化（改善版）
 */
app.whenReady().then((): void => {
  const win: BrowserWindow = createWindow();
  setupIpcHandlers(win);
  setupPowerMonitorEvents(win);
  
  // バックグラウンドプロセスマネージャーを初期化
  backgroundProcessManager.initialize();
  
  console.log('Application initialization completed with background processing');
});

app.on('window-all-closed', (): void => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', (): void => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// アプリケーション終了時のクリーンアップ（改善版）
app.on('before-quit', (): void => {
  console.log('Application is quitting, running cleanup...');
  
  try {
    backgroundProcessManager.shutdown();
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
  
  mainWindow = null;
});

/**
 * 時間文字列を秒数に変換するヘルパー関数
 * @param timeString HH:mm:ss形式の時間文字列
 * @returns 秒数
 */
function parseTimeToSeconds(timeString: string): number {
  try {
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  } catch (error) {
    console.error('Error parsing time string:', timeString, error);
    return 0;
  }
} 