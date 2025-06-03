import { TimerEvent, TimerQualityReport } from '../../shared/types';

/**
 * 時間を "HH:mm:ss" 形式に変換
 * @param seconds 秒数
 * @returns "HH:mm:ss" 形式の文字列
 */
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/**
 * "HH:mm:ss" 形式の文字列を秒数に変換
 * @param timeString "HH:mm:ss" 形式の時間文字列
 * @returns 秒数
 * @throws {Error} 不正な形式の場合
 */
export const parseTime = (timeString: string): number => {
  if (!timeString || typeof timeString !== 'string') {
    throw new Error('Invalid time string format');
  }

  const parts = timeString.split(':');
  if (parts.length !== 3) {
    throw new Error('Time string must be in HH:mm:ss format');
  }

  const [hours, minutes, seconds] = parts.map(Number);
  
  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
    throw new Error('Invalid time values');
  }

  if (hours < 0 || minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) {
    throw new Error('Invalid time range');
  }

  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * 時間の加算（"HH:mm:ss" + seconds → "HH:mm:ss"）
 * @param timeString 基準となる時間文字列 ("HH:mm:ss" 形式)
 * @param seconds 加算する秒数
 * @returns 加算後の時間文字列 ("HH:mm:ss" 形式)
 */
export const addSeconds = (timeString: string, seconds: number): string => {
  const totalSeconds = parseTime(timeString) + Math.max(0, seconds);
  return formatTime(totalSeconds);
};

/**
 * 高精度タイマーの状態
 */
interface PrecisionTimerState {
  isRunning: boolean;
  startTime: number | null;
  pausedTime: number;
  lastUpdateTime: number;
  taskId: number | null;
}

/**
 * タイマーの品質と精度を監視するクラス
 */
class TimerQualityMonitor {
  private driftHistory: number[] = [];
  private performanceMetrics: {
    averageDrift: number;
    maxDrift: number;
    totalCorrections: number;
    qualityScore: number;
  } = {
    averageDrift: 0,
    maxDrift: 0,
    totalCorrections: 0,
    qualityScore: 1.0
  };

  /**
   * ドリフトデータを記録し、統計を更新
   */
  recordDrift(drift: number): void {
    this.driftHistory.push(Math.abs(drift));
    
    // 過去100回分のデータのみ保持
    if (this.driftHistory.length > 100) {
      this.driftHistory = this.driftHistory.slice(-50);
    }

    this.updateMetrics();
  }

  /**
   * パフォーマンス指標を更新
   */
  private updateMetrics(): void {
    if (this.driftHistory.length === 0) return;

    const sum = this.driftHistory.reduce((a, b) => a + b, 0);
    this.performanceMetrics.averageDrift = sum / this.driftHistory.length;
    this.performanceMetrics.maxDrift = Math.max(...this.driftHistory);
    
    // 品質スコアの計算（0.0-1.0、1.0が最高品質）
    const targetAccuracy = 50; // 目標精度 50ms
    const accuracyRatio = Math.min(targetAccuracy / (this.performanceMetrics.averageDrift + 1), 1.0);
    this.performanceMetrics.qualityScore = accuracyRatio;
  }

  /**
   * 補正回数を記録
   */
  recordCorrection(): void {
    this.performanceMetrics.totalCorrections++;
  }

  /**
   * 品質レポートを取得
   */
  getQualityReport(): TimerQualityReport {
    return {
      ...this.performanceMetrics,
      sampleCount: this.driftHistory.length,
      recommendedInterval: this.getRecommendedInterval(),
      status: this.getTimerStatus()
    };
  }

  /**
   * 推奨更新間隔を計算
   */
  private getRecommendedInterval(): number {
    if (this.performanceMetrics.averageDrift < 20) {
      return 1000; // 高精度: 1秒間隔
    } else if (this.performanceMetrics.averageDrift < 100) {
      return 500; // 中精度: 0.5秒間隔
    } else {
      return 250; // 低精度: 0.25秒間隔
    }
  }

  /**
   * タイマーの状態評価
   */
  private getTimerStatus(): 'excellent' | 'good' | 'fair' | 'poor' {
    if (this.performanceMetrics.qualityScore >= 0.9) {
      return 'excellent';
    } else if (this.performanceMetrics.qualityScore >= 0.7) {
      return 'good';
    } else if (this.performanceMetrics.qualityScore >= 0.5) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  /**
   * 統計をリセット
   */
  reset(): void {
    this.driftHistory = [];
    this.performanceMetrics = {
      averageDrift: 0,
      maxDrift: 0,
      totalCorrections: 0,
      qualityScore: 1.0
    };
  }
}

/**
 * 高精度タイマークラス
 * ドリフト補正とパフォーマンス最適化を実装
 */
export class PrecisionTimer {
  private state: PrecisionTimerState = {
    isRunning: false,
    startTime: null,
    pausedTime: 0,
    lastUpdateTime: 0,
    taskId: null
  };
  
  private intervalId: number | null = null;
  private listeners: Set<(event: TimerEvent) => void> = new Set();
  private updateInterval: number = 1000; // デフォルト1秒
  private qualityMonitor: TimerQualityMonitor;
  private adaptiveInterval: number = 1000;
  private consecutiveGoodUpdates: number = 0;
  private minUpdateInterval: number = 50; // 最小更新間隔を50msに変更
  private maxUpdateInterval: number = 2000; // 最大更新間隔は維持
  private consecutiveErrors: number = 0;
  private driftThreshold: number = 30; // ドリフト補正の閾値を30msに設定
  private adaptiveStep: number = 0.05; // 適応的更新間隔の調整ステップを小さく設定
  
  constructor() {
    this.qualityMonitor = new TimerQualityMonitor();
    console.log('High precision timer with quality monitoring initialized');
  }
  
  /**
   * タイマーを開始
   * @param taskId タスクID
   * @param initialTime 初期時間（秒）
   */
  start(taskId: number, initialTime: number = 0): void {
    if (this.state.isRunning) {
      console.warn('Timer is already running');
      return;
    }
    
    const now = performance.now();
    this.state = {
      isRunning: true,
      startTime: now,
      pausedTime: initialTime * 1000, // ミリ秒に変換
      lastUpdateTime: now,
      taskId
    };
    
    this.startInterval();
    console.log(`High precision timer started for task ${taskId}, initial time: ${initialTime}s`);
  }
  
  /**
   * タイマーを一時停止
   * @returns 現在の経過時間（秒）
   */
  pause(): number {
    if (!this.state.isRunning) {
      console.warn('Timer is not running');
      return this.getTotalSeconds();
    }
    
    this.state.isRunning = false;
    this.stopInterval();
    
    const totalSeconds = this.getTotalSeconds();
    console.log(`Timer paused, total time: ${totalSeconds}s`);
    return totalSeconds;
  }
  
  /**
   * タイマーを再開
   */
  resume(): void {
    if (this.state.isRunning) {
      console.warn('Timer is already running');
      return;
    }
    
    if (this.state.taskId === null) {
      console.error('Cannot resume timer without task ID');
      return;
    }
    
    const now = performance.now();
    this.state.isRunning = true;
    this.state.startTime = now;
    this.state.lastUpdateTime = now;
    
    this.startInterval();
    console.log('Timer resumed');
  }
  
  /**
   * タイマーを停止してリセット
   * @returns 最終的な経過時間（秒）
   */
  stop(): number {
    const totalSeconds = this.getTotalSeconds();
    
    this.state = {
      isRunning: false,
      startTime: null,
      pausedTime: 0,
      lastUpdateTime: 0,
      taskId: null
    };
    
    this.stopInterval();
    console.log(`Timer stopped, final time: ${totalSeconds}s`);
    return totalSeconds;
  }
  
  /**
   * 現在の総経過時間を取得（秒）
   */
  getTotalSeconds(): number {
    if (!this.state.isRunning || this.state.startTime === null) {
      return Math.round(this.state.pausedTime / 1000);
    }
    
    const now = performance.now();
    const currentElapsed = now - this.state.startTime;
    const totalMs = this.state.pausedTime + currentElapsed;
    return Math.round(totalMs / 1000);
  }
  
  /**
   * タイマーの実行状態を取得
   */
  isRunning(): boolean {
    return this.state.isRunning;
  }
  
  /**
   * 現在のタスクIDを取得
   */
  getCurrentTaskId(): number | null {
    return this.state.taskId;
  }
  
  /**
   * イベントリスナーを追加
   * @param listener コールバック関数
   */
  addListener(listener: (event: TimerEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * 更新間隔を設定
   * @param interval 間隔（ミリ秒）
   */
  setUpdateInterval(interval: number): void {
    if (interval < 100 || interval > 5000) {
      console.warn('Update interval should be between 100ms and 5000ms');
      return;
    }
    
    this.updateInterval = interval;
    
    if (this.state.isRunning) {
      this.stopInterval();
      this.startInterval();
    }
  }
  
  /**
   * タイマー状態をJSON形式で取得
   */
  getState(): Readonly<PrecisionTimerState> {
    return { ...this.state };
  }
  
  /**
   * 更新間隔の開始
   */
  private startInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
    
    this.intervalId = window.setInterval(() => {
      this.updateTimer();
    }, this.updateInterval);
  }
  
  /**
   * 更新間隔の停止
   */
  private stopInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  /**
   * タイマーの更新処理（改良版）
   */
  private updateTimer(): void {
    if (!this.state.isRunning || this.state.startTime === null) {
      return;
    }

    try {
      const now = performance.now();
      const elapsed = (now - this.state.startTime - this.state.pausedTime) / 1000;
      const expectedTime = this.state.pausedTime / 1000 + elapsed;
      
      // ドリフト計算と記録
      const drift = (expectedTime - this.state.pausedTime / 1000) * 1000; // ミリ秒単位
      this.qualityMonitor.recordDrift(drift);

      // 適応的補正の実行
      if (Math.abs(drift) > this.driftThreshold) { // 30ms以上のドリフト
        this.state.pausedTime = expectedTime * 1000;
        this.qualityMonitor.recordCorrection();
        this.consecutiveGoodUpdates = 0;
        
        // ドリフトが大きい場合は更新間隔を短縮（より細かい調整）
        this.adaptiveInterval = Math.max(
          this.adaptiveInterval * (1 - this.adaptiveStep),
          this.minUpdateInterval
        );
        
        console.debug(`Timer drift corrected: ${drift.toFixed(2)}ms`);
      } else {
        // 精度が良い場合
        this.consecutiveGoodUpdates++;
        
        // 連続して精度が良い場合は更新間隔を延長（より細かい調整）
        if (this.consecutiveGoodUpdates >= 10) {
          this.adaptiveInterval = Math.min(
            this.adaptiveInterval * (1 + this.adaptiveStep),
            this.maxUpdateInterval
          );
          this.consecutiveGoodUpdates = 0;
        }
        
        this.state.pausedTime = expectedTime * 1000;
      }

      // 次回更新のスケジューリング
      this.scheduleNextUpdate();

      // イベント通知
      const event: TimerEvent = {
        totalTime: Math.round(this.state.pausedTime / 1000),
        drift: drift,
        timestamp: now,
        state: this.state.isRunning ? 'running' : 'stopped',
        qualityScore: this.qualityMonitor.getQualityReport().qualityScore,
        lastUpdate: now
      };
      
      this.listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Timer listener error:', error);
        }
      });

    } catch (error) {
      console.error('Timer update error:', error);
      this.handleTimerError();
    }
  }

  /**
   * 次回更新のスケジューリング
   */
  private scheduleNextUpdate(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setTimeout(() => {
      this.updateTimer();
    }, this.adaptiveInterval) as any; // Node.js環境での型の問題を回避
  }

  /**
   * タイマーエラーのハンドリング
   */
  private handleTimerError(): void {
    this.consecutiveErrors++;
    
    if (this.consecutiveErrors >= 5) {
      console.warn('Too many timer errors, resetting quality monitor');
      this.qualityMonitor.reset();
      this.adaptiveInterval = 1000; // デフォルト間隔にリセット
      this.consecutiveErrors = 0;
    }
    
    // エラー時は更新間隔を短縮して安定性を確保
    this.adaptiveInterval = Math.max(this.adaptiveInterval * 0.9, this.minUpdateInterval);
  }

  /**
   * タイマー統計情報を取得
   */
  getTimerStats(): object {
    const qualityReport = this.qualityMonitor.getQualityReport();
    
    return {
      currentTime: this.state.pausedTime / 1000,
      isRunning: this.state.isRunning,
      isPaused: !this.state.isRunning,
      adaptiveInterval: this.adaptiveInterval,
      quality: qualityReport,
      currentTaskId: this.state.taskId,
      initialTime: this.state.pausedTime / 1000,
      pausedDuration: this.state.pausedTime / 1000,
      totalPauses: 0,
      uptime: this.state.startTime ? (performance.now() - this.state.startTime) / 1000 : 0
    };
  }

  /**
   * 品質監視をリセット
   */
  resetQualityMonitoring(): void {
    this.qualityMonitor.reset();
    this.adaptiveInterval = 1000;
    this.consecutiveGoodUpdates = 0;
    console.log('Timer quality monitoring reset');
  }

  /**
   * パフォーマンス最適化の実行
   */
  optimizePerformance(): void {
    const qualityReport = this.qualityMonitor.getQualityReport();
    
    // 品質に基づく最適化
    if (qualityReport.status === 'excellent') {
      this.adaptiveInterval = Math.min(this.adaptiveInterval * 1.2, this.maxUpdateInterval);
      console.log('Timer performance optimized for excellent quality');
    } else if (qualityReport.status === 'poor') {
      this.adaptiveInterval = Math.max(this.adaptiveInterval * 0.7, this.minUpdateInterval);
      console.log('Timer performance optimized for poor quality');
    }
  }
}

/**
 * グローバルタイマーインスタンス
 */
export const globalTimer = new PrecisionTimer();

// 定期的なパフォーマンス最適化
setInterval(() => {
  if (globalTimer.isRunning()) {
    globalTimer.optimizePerformance();
  }
}, 30000); // 30秒ごとに最適化実行 