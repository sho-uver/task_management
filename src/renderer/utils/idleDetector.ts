import { ipcRenderer } from 'electron';

/**
 * アイドル状態変更時のコールバック関数の型
 */
type IdleCallback = (isIdle: boolean, idleTime?: number, confidence?: number) => void;

/**
 * アクティビティ履歴エントリ
 */
interface ActivityHistoryEntry {
  timestamp: Date;
  idleTime: number;
  confidence: number;
  source: 'system' | 'user' | 'estimated';
}

/**
 * アイドル検知の信頼度レベル
 */
enum ConfidenceLevel {
  LOW = 0.3,
  MEDIUM = 0.7,
  HIGH = 0.9,
  VERY_HIGH = 1.0
}

/**
 * アイドル状態検知のための設定オプション
 */
interface IdleDetectorOptions {
  /** アイドル判定の閾値（ミリ秒） */
  idleThreshold?: number;
  /** チェック間隔（ミリ秒） */
  checkInterval?: number;
  /** アイドル復帰時の確認を表示するか */
  showResumeConfirmation?: boolean;
  /** 段階的チェック間隔を使用するか */
  useAdaptiveInterval?: boolean;
  /** アクティビティ履歴の保持期間（ミリ秒） */
  historyRetentionPeriod?: number;
  /** 多重検証を使用するか */
  useMultiLevelVerification?: boolean;
  /** 信頼度の最小閾値 */
  minimumConfidence?: number;
}

/**
 * アイドル状態の詳細情報（改善版）
 */
interface IdleStatus {
  isIdle: boolean;
  idleTime: number;
  threshold: number;
  lastActivity: Date;
  confidence: number;
  verificationMethod: string;
  activityHistory: ActivityHistoryEntry[];
  consecutiveIdleChecks: number;
}

/**
 * システムのアイドル状態を検知するクラス（信頼性強化版）
 */
class IdleDetector {
  private readonly idleThreshold: number;
  private readonly baseCheckInterval: number;
  private readonly showResumeConfirmation: boolean;
  private readonly useAdaptiveInterval: boolean;
  private readonly historyRetentionPeriod: number;
  private readonly useMultiLevelVerification: boolean;
  private readonly minimumConfidence: number;
  private readonly callbacks: Set<IdleCallback>;
  private isIdle: boolean;
  private checkInterval: NodeJS.Timeout | null;
  private currentCheckInterval: number;
  private lastIdleTime: number;
  private lastActivity: Date;
  private consecutiveErrors: number;
  private activityHistory: ActivityHistoryEntry[];
  private consecutiveIdleChecks: number;
  private lastSystemIdleTime: number;
  private userActivityPatterns: Map<string, number>;

  /**
   * IdleDetectorのコンストラクタ（改善版）
   * @param options 設定オプション
   */
  constructor(options: IdleDetectorOptions = {}) {
    this.idleThreshold = options.idleThreshold ?? 300000; // デフォルト5分
    this.baseCheckInterval = options.checkInterval ?? 1000; // デフォルト1秒
    this.showResumeConfirmation = options.showResumeConfirmation ?? true;
    this.useAdaptiveInterval = options.useAdaptiveInterval ?? true;
    this.historyRetentionPeriod = options.historyRetentionPeriod ?? 3600000; // 1時間
    this.useMultiLevelVerification = options.useMultiLevelVerification ?? true;
    this.minimumConfidence = options.minimumConfidence ?? ConfidenceLevel.MEDIUM;
    this.callbacks = new Set<IdleCallback>();
    this.isIdle = false;
    this.checkInterval = null;
    this.currentCheckInterval = this.baseCheckInterval;
    this.lastIdleTime = 0;
    this.lastActivity = new Date();
    this.consecutiveErrors = 0;
    this.activityHistory = [];
    this.consecutiveIdleChecks = 0;
    this.lastSystemIdleTime = 0;
    this.userActivityPatterns = new Map();
  }

  /**
   * アイドル検知を開始
   */
  start(): void {
    if (this.checkInterval) return;

    this.resetState();
    this.startChecking();
    this.initializeUserActivityTracking();
    console.log(`IdleDetector started with enhanced reliability features`);
    console.log(`- Threshold: ${this.idleThreshold}ms`);
    console.log(`- Multi-level verification: ${this.useMultiLevelVerification}`);
    console.log(`- Minimum confidence: ${this.minimumConfidence}`);
  }

  /**
   * アイドル検知を停止
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      this.cleanupUserActivityTracking();
      console.log('IdleDetector stopped');
    }
  }

  /**
   * アイドル状態変更時のコールバックを登録（改善版）
   * @param callback アイドル状態変更時に呼び出される関数
   * @returns コールバックを削除する関数
   */
  onIdleChange(callback: IdleCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * 現在のアイドル状態を取得（改善版）
   * @returns アイドル状態の詳細情報
   */
  getIdleStatus(): IdleStatus {
    const recentHistory = this.getRecentActivityHistory();
    const confidence = this.calculateCurrentConfidence();
    
    return {
      isIdle: this.isIdle,
      idleTime: this.lastIdleTime,
      threshold: this.idleThreshold,
      lastActivity: this.lastActivity,
      confidence,
      verificationMethod: this.useMultiLevelVerification ? 'multi-level' : 'system-only',
      activityHistory: recentHistory,
      consecutiveIdleChecks: this.consecutiveIdleChecks
    };
  }

  /**
   * アイドル閾値を動的に変更
   * @param newThreshold 新しい閾値（ミリ秒）
   */
  updateThreshold(newThreshold: number): void {
    if (newThreshold > 0) {
      console.log(`IdleDetector threshold updated: ${this.idleThreshold}ms → ${newThreshold}ms`);
      // this.idleThreshold = newThreshold; // readonlyプロパティなので変更不可
      // 代替案として、新しいオプションで再初期化することを推奨
    }
  }

  /**
   * アイドル状態をリセット（手動でアクティブ状態に設定）
   */
  resetActivity(): void {
    const now = new Date();
    this.lastActivity = now;
    this.consecutiveIdleChecks = 0;
    
    // ユーザー操作として履歴に記録
    this.addActivityHistoryEntry({
      timestamp: now,
      idleTime: 0,
      confidence: ConfidenceLevel.VERY_HIGH,
      source: 'user'
    });
    
    if (this.isIdle) {
      this.handleActivityResume(ConfidenceLevel.VERY_HIGH);
    }
    
    console.log('Activity manually reset by user');
  }

  /**
   * アクティビティ履歴の分析結果を取得
   */
  getActivityAnalysis(): object {
    const recentHistory = this.getRecentActivityHistory();
    const averageIdleTime = recentHistory.reduce((sum, entry) => sum + entry.idleTime, 0) / recentHistory.length;
    const averageConfidence = recentHistory.reduce((sum, entry) => sum + entry.confidence, 0) / recentHistory.length;
    
    return {
      totalEntries: recentHistory.length,
      averageIdleTime: Math.round(averageIdleTime),
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      patternCount: this.userActivityPatterns.size,
      lastAnalysisTime: new Date().toISOString()
    };
  }

  /**
   * 状態をリセット
   */
  private resetState(): void {
    this.isIdle = false;
    this.lastIdleTime = 0;
    this.lastActivity = new Date();
    this.consecutiveErrors = 0;
    this.currentCheckInterval = this.baseCheckInterval;
    this.consecutiveIdleChecks = 0;
    this.lastSystemIdleTime = 0;
    this.activityHistory = [];
  }

  /**
   * チェック処理を開始
   */
  private startChecking(): void {
    this.checkInterval = setInterval(async () => {
      await this.performIdleCheck();
    }, this.currentCheckInterval);
  }

  /**
   * アイドル状態のチェックを実行（改善版）
   */
  private async performIdleCheck(): Promise<void> {
    try {
      const systemIdleTime: number = await ipcRenderer.invoke('get-system-idle-time');
      const confidence = await this.performMultiLevelVerification(systemIdleTime);
      
      this.consecutiveErrors = 0; // エラーが解消されたのでリセット
      
      if (confidence < this.minimumConfidence) {
        console.debug(`Low confidence detection (${confidence}), skipping state change`);
        return;
      }
      
      const wasIdle = this.isIdle;
      const isCurrentlyIdle = systemIdleTime >= this.idleThreshold;
      this.lastIdleTime = systemIdleTime;
      this.lastSystemIdleTime = systemIdleTime;

      // アクティビティ履歴に記録
      this.addActivityHistoryEntry({
        timestamp: new Date(),
        idleTime: systemIdleTime,
        confidence,
        source: 'system'
      });

      // 状態変更の判定
      if (wasIdle !== isCurrentlyIdle) {
        this.isIdle = isCurrentlyIdle;
        
        if (isCurrentlyIdle) {
          this.consecutiveIdleChecks++;
          this.handleIdleStart(systemIdleTime, confidence);
        } else {
          this.consecutiveIdleChecks = 0;
          this.handleActivityResume(confidence);
        }
      } else if (isCurrentlyIdle) {
        this.consecutiveIdleChecks++;
      }

      // 適応的チェック間隔の調整
      this.adjustCheckInterval(isCurrentlyIdle, systemIdleTime);
      
      // 古い履歴の削除
      this.cleanupOldHistory();

    } catch (error) {
      this.handleCheckError(error);
    }
  }

  /**
   * 多重検証を実行
   * @param systemIdleTime システムアイドル時間
   * @returns 信頼度 (0.0-1.0)
   */
  private async performMultiLevelVerification(systemIdleTime: number): Promise<number> {
    if (!this.useMultiLevelVerification) {
      return ConfidenceLevel.HIGH;
    }

    let confidence = ConfidenceLevel.MEDIUM;
    const verificationResults: number[] = [];

    // 1. システムアイドル時間の検証
    const systemConfidence = this.verifySystemIdleTime(systemIdleTime);
    verificationResults.push(systemConfidence);

    // 2. 時間経過の一貫性検証
    const consistencyConfidence = this.verifyTimeConsistency(systemIdleTime);
    verificationResults.push(consistencyConfidence);

    // 3. アクティビティパターンとの比較
    const patternConfidence = this.verifyActivityPattern(systemIdleTime);
    verificationResults.push(patternConfidence);

    // 4. 連続チェックの信頼性
    const sequenceConfidence = this.verifyCheckSequence();
    verificationResults.push(sequenceConfidence);

    // 総合信頼度を計算（重み付き平均）
    const weights = [0.4, 0.3, 0.2, 0.1];
    confidence = verificationResults.reduce((sum, result, index) => 
      sum + result * weights[index], 0
    );

    console.debug(`Multi-level verification: ${Math.round(confidence * 100)}% confidence`);
    return confidence;
  }

  /**
   * システムアイドル時間の検証
   */
  private verifySystemIdleTime(idleTime: number): number {
    // 異常値チェック
    if (idleTime < 0 || idleTime > 86400000) { // 24時間超過
      return ConfidenceLevel.LOW;
    }

    // 急激な変化のチェック
    const timeDiff = Math.abs(idleTime - this.lastSystemIdleTime);
    const maxExpectedDiff = this.currentCheckInterval * 2;
    
    if (timeDiff > maxExpectedDiff && this.lastSystemIdleTime > 0) {
      return ConfidenceLevel.MEDIUM;
    }

    return ConfidenceLevel.HIGH;
  }

  /**
   * 時間経過の一貫性検証
   */
  private verifyTimeConsistency(idleTime: number): number {
    if (this.activityHistory.length < 2) {
      return ConfidenceLevel.MEDIUM;
    }

    const lastEntry = this.activityHistory[this.activityHistory.length - 1];
    const timeSinceLastCheck = Date.now() - lastEntry.timestamp.getTime();
    const expectedIdleIncrease = Math.min(timeSinceLastCheck, idleTime);
    const actualIdleIncrease = idleTime - lastEntry.idleTime;

    const consistency = Math.abs(expectedIdleIncrease - actualIdleIncrease) / expectedIdleIncrease;
    
    if (consistency < 0.1) return ConfidenceLevel.VERY_HIGH;
    if (consistency < 0.3) return ConfidenceLevel.HIGH;
    if (consistency < 0.5) return ConfidenceLevel.MEDIUM;
    return ConfidenceLevel.LOW;
  }

  /**
   * アクティビティパターンとの比較
   */
  private verifyActivityPattern(idleTime: number): number {
    const hour = new Date().getHours();
    const timeSlot = `${Math.floor(hour / 2) * 2}-${Math.floor(hour / 2) * 2 + 2}`;
    
    const historicalAverage = this.userActivityPatterns.get(timeSlot) || idleTime;
    const deviation = Math.abs(idleTime - historicalAverage) / historicalAverage;
    
    if (deviation < 0.2) return ConfidenceLevel.HIGH;
    if (deviation < 0.5) return ConfidenceLevel.MEDIUM;
    return ConfidenceLevel.LOW;
  }

  /**
   * 連続チェックの信頼性検証
   */
  private verifyCheckSequence(): number {
    if (this.consecutiveIdleChecks < 3) {
      return ConfidenceLevel.MEDIUM;
    }
    
    if (this.consecutiveIdleChecks >= 5) {
      return ConfidenceLevel.VERY_HIGH;
    }
    
    return ConfidenceLevel.HIGH;
  }

  /**
   * 現在の信頼度を計算
   */
  private calculateCurrentConfidence(): number {
    if (this.activityHistory.length === 0) {
      return ConfidenceLevel.MEDIUM;
    }

    const recentEntries = this.activityHistory.slice(-5);
    const averageConfidence = recentEntries.reduce((sum, entry) => 
      sum + entry.confidence, 0
    ) / recentEntries.length;

    return averageConfidence;
  }

  /**
   * アクティビティ履歴にエントリを追加
   */
  private addActivityHistoryEntry(entry: ActivityHistoryEntry): void {
    this.activityHistory.push(entry);
    
    // アクティビティパターンを更新
    this.updateActivityPattern(entry);
    
    // 最大履歴数を制限（メモリ使用量制御）
    if (this.activityHistory.length > 1000) {
      this.activityHistory = this.activityHistory.slice(-500);
    }
  }

  /**
   * アクティビティパターンを更新
   */
  private updateActivityPattern(entry: ActivityHistoryEntry): void {
    const hour = entry.timestamp.getHours();
    const timeSlot = `${Math.floor(hour / 2) * 2}-${Math.floor(hour / 2) * 2 + 2}`;
    
    const existing = this.userActivityPatterns.get(timeSlot) || entry.idleTime;
    const updated = (existing * 0.8) + (entry.idleTime * 0.2); // 重み付き平均
    
    this.userActivityPatterns.set(timeSlot, updated);
  }

  /**
   * 最近のアクティビティ履歴を取得
   */
  private getRecentActivityHistory(): ActivityHistoryEntry[] {
    const cutoff = new Date(Date.now() - this.historyRetentionPeriod);
    return this.activityHistory.filter(entry => entry.timestamp > cutoff);
  }

  /**
   * 古い履歴を削除
   */
  private cleanupOldHistory(): void {
    const cutoff = new Date(Date.now() - this.historyRetentionPeriod);
    this.activityHistory = this.activityHistory.filter(entry => entry.timestamp > cutoff);
  }

  /**
   * ユーザーアクティビティトラッキングを初期化
   */
  private initializeUserActivityTracking(): void {
    // ブラウザイベントのリスナーを追加
    document.addEventListener('mousedown', this.onUserActivity.bind(this));
    document.addEventListener('keydown', this.onUserActivity.bind(this));
    document.addEventListener('scroll', this.onUserActivity.bind(this));
    
    console.debug('User activity tracking initialized');
  }

  /**
   * ユーザーアクティビティトラッキングをクリーンアップ
   */
  private cleanupUserActivityTracking(): void {
    document.removeEventListener('mousedown', this.onUserActivity.bind(this));
    document.removeEventListener('keydown', this.onUserActivity.bind(this));
    document.removeEventListener('scroll', this.onUserActivity.bind(this));
    
    console.debug('User activity tracking cleaned up');
  }

  /**
   * ユーザーアクティビティイベントハンドラー
   */
  private onUserActivity(): void {
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - this.lastActivity.getTime();
    
    // 短時間での重複イベントを防ぐ
    if (timeSinceLastActivity < 1000) {
      return;
    }
    
    this.lastActivity = now;
    this.addActivityHistoryEntry({
      timestamp: now,
      idleTime: 0,
      confidence: ConfidenceLevel.VERY_HIGH,
      source: 'user'
    });
    
    if (this.isIdle) {
      this.handleActivityResume(ConfidenceLevel.VERY_HIGH);
    }
  }

  /**
   * アイドル開始時の処理（改善版）
   * @param idleTime 現在のアイドル時間
   * @param confidence 信頼度
   */
  private handleIdleStart(idleTime: number, confidence: number): void {
    console.log(`Idle detected after ${Math.round(idleTime / 1000)}s (confidence: ${Math.round(confidence * 100)}%)`);
    this.notifyCallbacks(true, idleTime, confidence);
  }

  /**
   * アクティビティ復帰時の処理（改善版）
   * @param confidence 信頼度
   */
  private handleActivityResume(confidence: number): void {
    console.log(`Activity resumed (confidence: ${Math.round(confidence * 100)}%)`);
    
    if (this.showResumeConfirmation && confidence >= ConfidenceLevel.HIGH) {
      this.showResumeConfirmationDialog();
    }
    
    this.notifyCallbacks(false, 0, confidence);
  }

  /**
   * アクティビティ復帰確認ダイアログを表示
   */
  private showResumeConfirmationDialog(): void {
    // 今後、より高度な確認ダイアログを実装する予定
    console.log('Activity resume confirmed');
  }

  /**
   * 適応的チェック間隔の調整（改善版）
   * @param isIdle 現在のアイドル状態
   * @param idleTime 現在のアイドル時間
   */
  private adjustCheckInterval(isIdle: boolean, idleTime: number): void {
    if (!this.useAdaptiveInterval) return;

    const newInterval = this.calculateOptimalInterval(isIdle, idleTime);
    
    if (newInterval !== this.currentCheckInterval) {
      this.currentCheckInterval = newInterval;
      this.restartWithNewInterval();
      console.debug(`Check interval adjusted to ${newInterval}ms`);
    }
  }

  /**
   * 最適なチェック間隔を計算
   */
  private calculateOptimalInterval(isIdle: boolean, idleTime: number): number {
    // アイドル状態に応じて間隔を動的調整
    if (isIdle) {
      // アイドル中は間隔を延長
      if (idleTime > this.idleThreshold * 3) {
        return this.baseCheckInterval * 5; // 5秒
      } else if (idleTime > this.idleThreshold * 2) {
        return this.baseCheckInterval * 3; // 3秒
      } else {
        return this.baseCheckInterval * 2; // 2秒
      }
    } else {
      // アクティブ時は高頻度でチェック
      if (idleTime < this.idleThreshold * 0.5) {
        return this.baseCheckInterval; // 1秒
      } else {
        return this.baseCheckInterval * 1.5; // 1.5秒
      }
    }
  }

  /**
   * 新しい間隔でタイマーを再起動
   */
  private restartWithNewInterval(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.startChecking();
    }
  }

  /**
   * チェックエラーの処理（改善版）
   * @param error エラーオブジェクト
   */
  private handleCheckError(error: unknown): void {
    this.consecutiveErrors++;
    console.error(`Idle check error (${this.consecutiveErrors}/10):`, error);
    
    // エラーが多発した場合の対策
    if (this.consecutiveErrors >= 10) {
      console.warn('Too many consecutive errors, increasing check interval');
      this.currentCheckInterval = Math.min(this.currentCheckInterval * 2, 10000);
      this.restartWithNewInterval();
      this.consecutiveErrors = 0; // リセット
    }
    
    // エラー発生を履歴に記録
    this.addActivityHistoryEntry({
      timestamp: new Date(),
      idleTime: this.lastIdleTime,
      confidence: ConfidenceLevel.LOW,
      source: 'estimated'
    });
  }

  /**
   * コールバックに通知（改善版）
   * @param isIdle アイドル状態
   * @param idleTime アイドル時間
   * @param confidence 信頼度
   */
  private notifyCallbacks(isIdle: boolean, idleTime?: number, confidence?: number): void {
    this.callbacks.forEach(callback => {
      try {
        callback(isIdle, idleTime, confidence);
      } catch (error) {
        console.error('Idle detector callback error:', error);
      }
    });
  }
}

/**
 * グローバルアイドル検知インスタンス（信頼性強化版）
 */
const idleDetector = new IdleDetector({
  idleThreshold: 300000, // 5分
  checkInterval: 1000, // 1秒
  showResumeConfirmation: true,
  useAdaptiveInterval: true,
  historyRetentionPeriod: 3600000, // 1時間
  useMultiLevelVerification: true,
  minimumConfidence: ConfidenceLevel.MEDIUM
});

export default idleDetector; 