import { ipcRenderer } from 'electron';

/**
 * アイドル状態変更時のコールバック関数の型
 */
type IdleCallback = (isIdle: boolean) => void;

/**
 * アイドル状態検知のための設定オプション
 */
interface IdleDetectorOptions {
  /** アイドル判定の閾値（ミリ秒） */
  idleThreshold?: number;
  /** チェック間隔（ミリ秒） */
  checkInterval?: number;
}

/**
 * システムのアイドル状態を検知するクラス
 */
class IdleDetector {
  private readonly idleThreshold: number;
  private readonly checkIntervalTime: number;
  private readonly callbacks: Set<IdleCallback>;
  private isIdle: boolean;
  private checkInterval: NodeJS.Timeout | null;

  /**
   * IdleDetectorのコンストラクタ
   * @param options 設定オプション
   */
  constructor(options: IdleDetectorOptions = {}) {
    this.idleThreshold = options.idleThreshold ?? 300000; // デフォルト5分
    this.checkIntervalTime = options.checkInterval ?? 1000; // デフォルト1秒
    this.callbacks = new Set<IdleCallback>();
    this.isIdle = false;
    this.checkInterval = null;
  }

  /**
   * アイドル検知を開始
   */
  start(): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(async () => {
      try {
        const idleTime: number = await ipcRenderer.invoke('get-system-idle-time');
        const wasIdle = this.isIdle;
        this.isIdle = idleTime >= this.idleThreshold;

        if (wasIdle !== this.isIdle) {
          this.notifyCallbacks();
        }
      } catch (error) {
        console.error('Failed to get system idle time:', error);
      }
    }, this.checkIntervalTime);
  }

  /**
   * アイドル検知を停止
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * アイドル状態変更時のコールバックを登録
   * @param callback アイドル状態変更時に呼び出される関数
   * @returns コールバックを削除する関数
   */
  onIdleChange(callback: IdleCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * 現在のアイドル状態を取得
   * @returns アイドル状態
   */
  getIdleState(): boolean {
    return this.isIdle;
  }

  /**
   * アイドル閾値を取得
   * @returns 閾値（ミリ秒）
   */
  getIdleThreshold(): number {
    return this.idleThreshold;
  }

  /**
   * 登録されたコールバック関数を呼び出す
   */
  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => {
      try {
        callback(this.isIdle);
      } catch (error) {
        console.error('Error in idle callback:', error);
      }
    });
  }
}

export default new IdleDetector(); 