import { useState, useEffect, useCallback, useRef } from 'react';
import { ipcRenderer } from 'electron';
import { formatTime, parseTime, globalTimer } from '../utils/timer';
import idleDetector from '../utils/idleDetector';
import { Task } from '../../shared/types';

/**
 * タスクタイマーフックの戻り値の型
 */
interface UseTaskTimerReturn {
  /** タイマーが実行中かどうか */
  isRunning: boolean;
  /** 現在の実績時間 */
  actualTime: string;
  /** 現在のアイドル状態 */
  isIdle: boolean;
  /** 最後のアイドル時間（ミリ秒） */
  lastIdleTime: number;
  /** アイドル検知の信頼度 */
  idleConfidence: number;
  /** タイマーエラー状態 */
  hasError: boolean;
  /** エラーメッセージ */
  errorMessage: string;
  /** エラーの詳細情報 */
  errorDetails: {
    type: 'timer' | 'sync' | 'system' | 'idle';
    code: string;
    timestamp: number;
    retryCount: number;
    lastAttempt: number;
  };
  /** タイマーを開始する関数 */
  startTimer: () => void;
  /** タイマーを停止する関数 */
  stopTimer: () => void;
  /** アイドル状態をリセットする関数 */
  resetIdleState: () => void;
  /** エラーをクリアする関数 */
  clearError: () => void;
  /** タイマー精度情報 */
  timerInfo: {
    drift: number;
    lastUpdate: number;
  };
  /** アイドル検知の詳細情報 */
  idleDetectionInfo: {
    consecutiveIdleChecks: number;
    verificationMethod: string;
    activityHistoryCount: number;
    backgroundStats: {
      activeTimers: number;
      suspendedTimers: number;
      pendingResumeSuggestions: number;
    };
  };
}

// エラーコードの定義
const ERROR_CODES = {
  TIMER: {
    START_FAILED: 'TIMER_001',
    STOP_FAILED: 'TIMER_002',
    PAUSE_FAILED: 'TIMER_003',
    RESUME_FAILED: 'TIMER_004',
    DRIFT_EXCEEDED: 'TIMER_005'
  },
  SYNC: {
    SAVE_FAILED: 'SYNC_001',
    LOAD_FAILED: 'SYNC_002',
    CONFLICT: 'SYNC_003'
  },
  SYSTEM: {
    SUSPEND: 'SYS_001',
    RESUME: 'SYS_002',
    LOCK: 'SYS_003',
    UNLOCK: 'SYS_004'
  },
  IDLE: {
    DETECTION_FAILED: 'IDLE_001',
    VERIFICATION_FAILED: 'IDLE_002'
  }
} as const;

/**
 * タスクの作業時間を管理するカスタムフック（高精度・高信頼性版）
 * @param task 対象のタスク
 * @returns タイマーの状態と操作関数
 */
export function useTaskTimer(task: Task): UseTaskTimerReturn {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [actualTime, setActualTime] = useState<string>(task.actualTime);
  const [isIdle, setIsIdle] = useState<boolean>(false);
  const [lastIdleTime, setLastIdleTime] = useState<number>(0);
  const [idleConfidence, setIdleConfidence] = useState<number>(0);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [timerInfo, setTimerInfo] = useState<{ drift: number; lastUpdate: number }>({
    drift: 0,
    lastUpdate: 0
  });
  const [idleDetectionInfo, setIdleDetectionInfo] = useState<{
    consecutiveIdleChecks: number;
    verificationMethod: string;
    activityHistoryCount: number;
  }>({
    consecutiveIdleChecks: 0,
    verificationMethod: 'system-only',
    activityHistoryCount: 0
  });
  const [backgroundStats, setBackgroundStats] = useState<{
    activeTimers: number;
    suspendedTimers: number;
    pendingResumeSuggestions: number;
  }>({
    activeTimers: 0,
    suspendedTimers: 0,
    pendingResumeSuggestions: 0
  });
  const [errorDetails, setErrorDetails] = useState<UseTaskTimerReturn['errorDetails']>({
    type: 'timer',
    code: '',
    timestamp: 0,
    retryCount: 0,
    lastAttempt: 0
  });

  // エラー処理のリファレンス
  const lastSaveAttempt = useRef<number>(0);
  const saveRetryCount = useRef<number>(0);
  const maxRetries = 3;
  const retryDelay = 1000; // 1秒
  const lastTimerUpdate = useRef<number>(0);
  const updateThreshold = 3000; // 3秒

  /**
   * エラーを設定（改善版）
   */
  const setError = useCallback((message: string, type: UseTaskTimerReturn['errorDetails']['type'], code: string): void => {
    console.error(`Timer error for task ${task.id}: ${message} (${code})`);
    setHasError(true);
    setErrorMessage(message);
    setErrorDetails({
      type,
      code,
      timestamp: Date.now(),
      retryCount: errorDetails.retryCount + 1,
      lastAttempt: Date.now()
    });
  }, [task.id, errorDetails.retryCount]);

  /**
   * エラーをクリア（改善版）
   */
  const clearError = useCallback((): void => {
    setHasError(false);
    setErrorMessage('');
    setErrorDetails({
      type: 'timer',
      code: '',
      timestamp: 0,
      retryCount: 0,
      lastAttempt: 0
    });
    saveRetryCount.current = 0;
  }, []);

  /**
   * 作業時間の更新（改善されたエラーハンドリング付き）
   */
  const updateTime = useCallback(async (newTime: string, forceUpdate: boolean = false): Promise<void> => {
    const now = Date.now();
    
    // 頻繁な更新を防ぐ（強制更新でない場合は最低3秒間隔）
    if (!forceUpdate && now - lastSaveAttempt.current < updateThreshold) {
      return;
    }

    try {
      setActualTime(newTime);
      await ipcRenderer.invoke('update-task-time', task.id, newTime);
      lastSaveAttempt.current = now;
      saveRetryCount.current = 0;
      
      if (hasError) {
        clearError();
      }
    } catch (error) {
      console.error('Failed to update task time:', error);
      
      saveRetryCount.current++;
      
      if (saveRetryCount.current <= maxRetries) {
        // 指数バックオフで再試行
        const delay = retryDelay * Math.pow(2, saveRetryCount.current - 1);
        setTimeout(() => {
          updateTime(newTime, true);
        }, delay);
        
        setError(
          `時間の保存に失敗しました。再試行中... (${saveRetryCount.current}/${maxRetries})`,
          'sync',
          ERROR_CODES.SYNC.SAVE_FAILED
        );
      } else {
        setError(
          '時間の保存に失敗しました。手動で保存してください。',
          'sync',
          ERROR_CODES.SYNC.SAVE_FAILED
        );
      }
    }
  }, [task.id, hasError, clearError, setError]);

  /**
   * タイマーを開始する関数（改善版）
   */
  const startTimer = useCallback((): void => {
    try {
      // 他のタスクのタイマーが実行中の場合は停止
      const currentTaskId = globalTimer.getCurrentTaskId();
      if (currentTaskId !== null && currentTaskId !== task.id) {
        globalTimer.stop();
        console.log(`Stopped timer for task ${currentTaskId} to start task ${task.id}`);
        
        // 背景処理システムに通知
        ipcRenderer.invoke('unregister-timer-activity', currentTaskId);
      }

      // 初期時間を取得
      const initialSeconds = parseTime(actualTime);
      
      // 高精度タイマーを開始
      globalTimer.start(task.id, initialSeconds);
      
      setIsRunning(true);
      setIsIdle(false);
      clearError();
      
      // アイドル検知を開始
      idleDetector.start();
      
      // バックグラウンド処理システムに登録
      ipcRenderer.invoke('register-timer-activity', task.id)
        .then(() => {
          console.log(`Timer activity registered with background system for task ${task.id}`);
        })
        .catch((error) => {
          console.warn('Failed to register timer activity:', error);
          setError(
            'タイマーの登録に失敗しました。',
            'system',
            ERROR_CODES.SYSTEM.SUSPEND
          );
        });
      
      console.log(`Starting timer for task: ${task.title} (ID: ${task.id})`);
    } catch (error) {
      setError(
        `タイマーの開始に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'timer',
        ERROR_CODES.TIMER.START_FAILED
      );
      throw error;
    }
  }, [task.id, task.title, actualTime, clearError, setError]);

  /**
   * タイマーを停止する関数（改善版）
   */
  const stopTimer = useCallback((): void => {
    try {
      if (globalTimer.getCurrentTaskId() === task.id) {
        const finalSeconds = globalTimer.stop();
        const finalTime = formatTime(finalSeconds);
        
        // 最終時間を保存
        updateTime(finalTime, true);
        
        // バックグラウンド処理システムから登録解除
        ipcRenderer.invoke('unregister-timer-activity', task.id)
          .then(() => {
            console.log(`Timer activity unregistered for task ${task.id}`);
          })
          .catch((error) => {
            console.warn('Failed to unregister timer activity:', error);
          });
      }
      
      setIsRunning(false);
      setIsIdle(false);
      
      // アイドル検知を停止
      idleDetector.stop();
      
      console.log(`Stopping timer for task: ${task.title} (ID: ${task.id})`);
    } catch (error) {
      setError(
        `タイマーの停止に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'timer',
        ERROR_CODES.TIMER.STOP_FAILED
      );
      throw error;
    }
  }, [task.id, task.title, updateTime, setError]);

  /**
   * アイドル状態をリセット
   */
  const resetIdleState = useCallback((): void => {
    try {
      idleDetector.resetActivity();
      setIsIdle(false);
      setLastIdleTime(0);
      setIdleConfidence(1.0); // ユーザー操作なので最高信頼度
      
      // アイドルから復帰した場合、タイマーを再開
      if (globalTimer.getCurrentTaskId() === task.id && !globalTimer.isRunning()) {
        globalTimer.resume();
      }

      // アイドル検知情報をリセット
      setIdleDetectionInfo(prev => ({
        ...prev,
        consecutiveIdleChecks: 0
      }));
      
      console.log('Idle state manually reset with high confidence');
    } catch (error) {
      setError(
        `アイドル状態のリセットに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'idle',
        ERROR_CODES.IDLE.DETECTION_FAILED
      );
    }
  }, [task.id, setError]);

  // 高精度タイマーのイベントリスナー
  useEffect(() => {
    let unsubscribeTimer: (() => void) | undefined;
    let unsubscribeIdle: (() => void) | undefined;

    try {
      unsubscribeTimer = globalTimer.addListener((event) => {
        try {
          // このタスクのタイマーでない場合は無視
          if (globalTimer.getCurrentTaskId() !== task.id) {
            return;
          }

          const now = Date.now();
          const newTimeString = formatTime(event.totalTime);
          
          // 前回の更新から十分な時間が経過している場合のみ状態を更新
          if (now - lastTimerUpdate.current >= 1000) {
            setActualTime(newTimeString);
            lastTimerUpdate.current = now;
            
            // タイマー情報を更新
            setTimerInfo({
              drift: event.drift || 0,
              lastUpdate: now
            });
          }

          // 定期的な保存（30秒ごと）
          if (event.totalTime > 0 && event.totalTime % 30 === 0) {
            updateTime(newTimeString);
          }
        } catch (error) {
          setError(
            `タイマー更新エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'timer',
            ERROR_CODES.TIMER.DRIFT_EXCEEDED
          );
        }
      });

      unsubscribeIdle = idleDetector.onIdleChange((isCurrentlyIdle: boolean, idleTime?: number, confidence?: number) => {
        try {
          const confidenceValue = confidence || 0;
          const idleTimeValue = idleTime || 0;
          
          console.log(`Idle state changed for task ${task.id}: ${isCurrentlyIdle ? 'idle' : 'active'}`);
          console.log(`- Idle time: ${Math.round(idleTimeValue / 1000)}s`);
          console.log(`- Confidence: ${Math.round(confidenceValue * 100)}%`);
          
          setIsIdle(isCurrentlyIdle);
          setLastIdleTime(idleTimeValue);
          setIdleConfidence(confidenceValue);

          // アイドル検知の詳細情報を更新
          const idleStatus = idleDetector.getIdleStatus();
          setIdleDetectionInfo({
            consecutiveIdleChecks: idleStatus.consecutiveIdleChecks,
            verificationMethod: idleStatus.verificationMethod,
            activityHistoryCount: idleStatus.activityHistory.length
          });

          // このタスクのタイマーが実行中の場合のみ処理
          if (globalTimer.getCurrentTaskId() === task.id) {
            if (isCurrentlyIdle && globalTimer.isRunning()) {
              // 高信頼度の場合のみ自動一時停止
              if (confidenceValue >= 0.7) {
                console.log('High confidence idle detected, pausing timer');
                globalTimer.pause();
              } else {
                console.log('Low confidence idle detected, monitoring...');
              }
            } else if (!isCurrentlyIdle && !globalTimer.isRunning() && isRunning) {
              // 高信頼度の場合のみ自動再開
              if (confidenceValue >= 0.8) {
                console.log('High confidence activity resumed, resuming timer');
                globalTimer.resume();
              } else {
                console.log('Low confidence activity detected, waiting for confirmation...');
              }
            }
          }
        } catch (error) {
          setError(
            `アイドル状態の更新に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'idle',
            ERROR_CODES.IDLE.VERIFICATION_FAILED
          );
        }
      });
    } catch (error) {
      setError(
        `イベントリスナーの設定に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'timer',
        ERROR_CODES.TIMER.START_FAILED
      );
    }

    return () => {
      if (typeof unsubscribeTimer === 'function') {
        unsubscribeTimer();
      }
      if (typeof unsubscribeIdle === 'function') {
        unsubscribeIdle();
      }
    };
  }, [task.id, isRunning, updateTime, setError]);

  // システムイベントの処理（改善版）
  useEffect(() => {
    const handleSystemSuspend = (event: any, suspendInfo?: { suspendedTimers: number[]; timestamp: number }): void => {
      console.log('System suspend detected for task', task.id);
      console.log('Suspend info:', suspendInfo);
      
      if (globalTimer.getCurrentTaskId() === task.id) {
        const finalSeconds = globalTimer.pause();
        const finalTime = formatTime(finalSeconds);
        updateTime(finalTime, true);
        setIsRunning(false);
        
        // ユーザーに通知
        setError(
          'システムがサスペンドしたため、タイマーを一時停止しました。',
          'system',
          ERROR_CODES.SYSTEM.SUSPEND
        );
      }
    };

    const handleSystemResume = (event: any, resumeInfo?: { resumeOptions: Array<{ taskId: number; suggestion: string }> }): void => {
      console.log('System resume detected for task', task.id);
      console.log('Resume info:', resumeInfo);
      
      // このタスクに対する復帰提案があるかチェック
      const taskSuggestion = resumeInfo?.resumeOptions?.find(option => option.taskId === task.id);
      
      if (taskSuggestion) {
        console.log(`Resume suggestion for task ${task.id}: ${taskSuggestion.suggestion}`);
        // 自動復帰は行わず、ユーザーに通知のみ
        setError(
          `${taskSuggestion.suggestion} - 手動で再開してください。`,
          'system',
          ERROR_CODES.SYSTEM.RESUME
        );
      }
    };

    const handleScreenLocked = (event: any, lockInfo?: { timestamp: number }): void => {
      console.log('Screen locked for task', task.id, 'at', lockInfo?.timestamp);
      setIsIdle(true);
    };

    const handleScreenUnlocked = (event: any, unlockInfo?: { timestamp: number }): void => {
      console.log('Screen unlocked for task', task.id, 'at', unlockInfo?.timestamp);
      resetIdleState();
    };

    const handleTimerPauseSuggestion = (event: any, suggestion: { taskId: number; reason: string }): void => {
      if (suggestion.taskId === task.id) {
        console.log(`Timer pause suggestion for task ${task.id}: ${suggestion.reason}`);
        setError(
          `${suggestion.reason} - タイマーの一時停止を検討してください。`,
          'system',
          ERROR_CODES.SYSTEM.LOCK
        );
      }
    };

    // イベントリスナーの登録
    ipcRenderer.on('system-suspend', handleSystemSuspend);
    ipcRenderer.on('system-resume', handleSystemResume);
    ipcRenderer.on('screen-locked', handleScreenLocked);
    ipcRenderer.on('screen-unlocked', handleScreenUnlocked);
    ipcRenderer.on('timer-pause-suggestion', handleTimerPauseSuggestion);

    return () => {
      // イベントリスナーの削除
      ipcRenderer.removeListener('system-suspend', handleSystemSuspend);
      ipcRenderer.removeListener('system-resume', handleSystemResume);
      ipcRenderer.removeListener('screen-locked', handleScreenLocked);
      ipcRenderer.removeListener('screen-unlocked', handleScreenUnlocked);
      ipcRenderer.removeListener('timer-pause-suggestion', handleTimerPauseSuggestion);
    };
  }, [task.id, resetIdleState, updateTime]);

  // バックグラウンド統計の定期取得
  useEffect(() => {
    const updateBackgroundStats = async () => {
      try {
        const stats = await ipcRenderer.invoke('get-background-stats');
        setBackgroundStats(stats);
      } catch (error) {
        console.warn('Failed to get background stats:', error);
      }
    };

    // 初回実行
    updateBackgroundStats();

    // 30秒ごとに更新
    const interval = setInterval(updateBackgroundStats, 30000);

    return () => clearInterval(interval);
  }, []);

  // タスクが変更された場合の実績時間の同期
  useEffect(() => {
    setActualTime(task.actualTime);
  }, [task.actualTime]);

  // タイマー状態の同期
  useEffect(() => {
    const currentTaskId = globalTimer.getCurrentTaskId();
    const timerRunning = globalTimer.isRunning();
    
    if (currentTaskId === task.id) {
      setIsRunning(timerRunning);
    } else {
      setIsRunning(false);
    }
  }, [task.id]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      // このタスクのタイマーが実行中の場合は保存して停止
      if (globalTimer.getCurrentTaskId() === task.id) {
        const finalSeconds = globalTimer.stop();
        const finalTime = formatTime(finalSeconds);
        updateTime(finalTime, true);
      }
    };
  }, [task.id, updateTime]);

  return {
    isRunning,
    actualTime,
    isIdle,
    lastIdleTime,
    idleConfidence,
    hasError,
    errorMessage,
    startTimer,
    stopTimer,
    resetIdleState,
    clearError,
    timerInfo,
    idleDetectionInfo: {
      ...idleDetectionInfo,
      // バックグラウンド統計を追加
      backgroundStats
    },
    errorDetails
  };
} 