/**
 * タスクの状態を表す型
 */
export type TaskStatus = 'not-started' | 'in-progress' | 'completed';

/**
 * タスクのインターフェース
 */
export interface Task {
  /** タスクの一意識別子 */
  id: number;
  /** タスクのタイトル */
  title: string;
  /** タスクの現在の状態 */
  status: TaskStatus;
  /** 見積もり時間 (HH:mm:ss 形式) */
  estimatedTime: string;
  /** 実績時間 (HH:mm:ss 形式) */
  actualTime: string;
  /** 最終更新日時 (ISO 8601 形式) */
  lastUpdated?: string;
  /** タスクの説明（オプション） */
  description?: string;
  /** 開始予定日（オプション） */
  startDate?: string;
  /** 終了予定日（オプション） */
  endDate?: string;
  /** 作業時間の詳細（オプション） */
  timeDetails?: string;
  /** 完了日時（オプション） */
  completedAt?: string;
}

/**
 * 完了したタスクの情報
 */
export interface CompletedTask extends Task {
  /** 完了日時 */
  completedAt: string;
  /** 完了時の統計情報 */
  completionStats: TaskCompletionStats;
}

/**
 * タスク完了時の統計情報
 */
export interface TaskCompletionStats {
  /** 実績時間（秒） */
  actualSeconds: number;
  /** 見積時間（秒） */
  estimatedSeconds: number;
  /** 見積との差分（秒） */
  variance: number;
  /** 効率性（%） */
  efficiency: number;
  /** 完了日時 */
  completedAt: string;
  /** 作業開始から完了までの日数 */
  workingDays?: number;
}

/**
 * ウィンドウの位置とサイズの設定
 */
export interface WindowBounds {
  /** ウィンドウの横幅 */
  width: number;
  /** ウィンドウの高さ */
  height: number;
  /** ウィンドウのX座標 */
  x?: number;
  /** ウィンドウのY座標 */
  y?: number;
}

/**
 * アプリケーションの設定
 */
export interface Settings {
  /** 常に最前面に表示するかどうか */
  isAlwaysOnTop: boolean;
  /** ウィンドウの設定 */
  window: WindowBounds;
}

/**
 * electron-storeのスキーマ定義
 * 実際に保存されるデータの構造
 */
export interface StoreSchema {
  /** タスクの配列 */
  tasks: Task[];
  /** 完了したタスクの配列 */
  completedTasks: CompletedTask[];
  /** アプリケーションの設定 */
  settings: Settings;
}

/**
 * アイドル状態の詳細情報
 */
export interface IdleStatus {
  isIdle: boolean;
  idleTime: number;
  threshold: number;
  lastActivity: Date;
}

/**
 * システム情報インターフェース
 */
export interface SystemInfo {
  platform: string;
  version: string;
  powerMonitorAvailable: boolean;
  timestamp: string;
}

/**
 * アイドル検知設定オプション
 */
export interface IdleDetectorOptions {
  /** アイドル判定の閾値（ミリ秒） */
  idleThreshold?: number;
  /** チェック間隔（ミリ秒） */
  checkInterval?: number;
  /** アイドル復帰時の確認を表示するか */
  showResumeConfirmation?: boolean;
  /** 段階的チェック間隔を使用するか */
  useAdaptiveInterval?: boolean;
}

/**
 * タスク時間のバックアップ情報
 */
export interface TaskTimeBackup {
  /** バックアップされた時間 */
  time: string;
  /** バックアップのタイムスタンプ */
  timestamp: string;
}

/**
 * タスク時間の統計情報
 */
export interface TaskTimeStats {
  /** タスクID */
  taskId: number;
  /** 実績時間 */
  actualTime: string;
  /** 見積時間 */
  estimatedTime: string;
  /** 実績時間（秒） */
  actualSeconds: number;
  /** 見積時間（秒） */
  estimatedSeconds: number;
  /** 見積との差分（秒） */
  variance: number;
  /** 効率性（%） */
  efficiency: number;
  /** 最終更新日時 */
  lastUpdated: string;
}

/**
 * タイマーエラー情報
 */
export interface TimerError {
  /** エラーメッセージ */
  message: string;
  /** エラー発生時刻 */
  timestamp: string;
  /** 関連タスクID */
  taskId?: number;
  /** エラーの種類 */
  type: 'save_failed' | 'timer_drift' | 'idle_detection' | 'system_error';
}

/**
 * タイマーイベントの型定義
 */
export interface TimerEvent {
  /** 総経過時間（秒） */
  totalTime: number;
  /** ドリフト時間（ミリ秒） */
  drift?: number;
  /** タイムスタンプ */
  timestamp: number;
  /** タイマーの状態 */
  state: 'running' | 'paused' | 'stopped';
  /** 品質スコア（0.0-1.0） */
  qualityScore?: number;
  /** 最終更新時刻 */
  lastUpdate?: number;
}

/**
 * タイマー品質レポートの型定義
 */
export interface TimerQualityReport {
  /** 平均ドリフト（ミリ秒） */
  averageDrift: number;
  /** 最大ドリフト（ミリ秒） */
  maxDrift: number;
  /** 補正回数 */
  totalCorrections: number;
  /** 品質スコア（0.0-1.0） */
  qualityScore: number;
  /** サンプル数 */
  sampleCount: number;
  /** 推奨更新間隔（ミリ秒） */
  recommendedInterval: number;
  /** タイマーステータス */
  status: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * IPC通信で使用するチャンネル名の定数
 */
export const IPC_CHANNELS = {
  GET_TASKS: 'get-tasks',
  SAVE_TASKS: 'save-tasks',
  GET_SETTINGS: 'get-settings',
  UPDATE_SETTINGS: 'update-settings',
  GET_SYSTEM_IDLE_TIME: 'get-system-idle-time',
  GET_SYSTEM_INFO: 'get-system-info',
  TEST_IDLE_DETECTION: 'test-idle-detection',
  UPDATE_TASK_TIME: 'update-task-time',
  BACKUP_TASK_TIME: 'backup-task-time',
  GET_TASK_TIME_STATS: 'get-task-time-stats',
  COMPLETE_TASK: 'complete-task',
  GET_COMPLETED_TASKS: 'get-completed-tasks',
  DELETE_COMPLETED_TASK: 'delete-completed-task'
} as const;

/**
 * IPC通信のチャンネル名の型
 */
export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

/**
 * Notion連携設定
 */
export interface NotionSettings {
  /** Notion APIトークン */
  apiToken: string;
  /** データベースID */
  databaseId: string;
  /** 同期間隔（分） */
  syncInterval: number;
  /** 自動同期を有効にするか */
  autoSyncEnabled: boolean;
  /** 最終同期日時 */
  lastSyncTime?: string;
  /** Notion側での完了ステータスプロパティ名 */
  statusPropertyName: string;
  /** Notion側でのタイトルプロパティ名 */
  titlePropertyName: string;
  /** Notion側での見積時間プロパティ名 */
  estimatedTimePropertyName: string;
  /** Notion側での実績時間プロパティ名 */
  actualTimePropertyName: string;
}

/**
 * Notion同期状態
 */
export interface NotionSyncStatus {
  /** 同期中かどうか */
  isSyncing: boolean;
  /** 最終同期結果 */
  lastSyncResult: 'success' | 'error' | 'partial' | null;
  /** 最終同期日時 */
  lastSyncTime: string | null;
  /** 同期エラーメッセージ */
  errorMessage: string | null;
  /** 同期された項目数 */
  syncedCount: number;
  /** 競合した項目数 */
  conflictCount: number;
  /** 失敗した項目数 */
  failedCount: number;
}

/**
 * Notion タスクページのプロパティ
 */
export interface NotionTaskProperties {
  /** タイトル */
  title: { title: Array<{ text: { content: string } }> };
  /** ステータス */
  status: { select: { name: string } | null };
  /** 見積時間 */
  estimatedTime: { rich_text: Array<{ text: { content: string } }> };
  /** 実績時間 */
  actualTime: { rich_text: Array<{ text: { content: string } }> };
  /** 最終更新日時 */
  lastUpdated: { date: { start: string } | null };
  /** アプリ内タスクID */
  appTaskId: { number: number | null };
}

/**
 * Notion同期競合情報
 */
export interface NotionSyncConflict {
  /** タスクID */
  taskId: number;
  /** タスクタイトル */
  title: string;
  /** ローカルの更新日時 */
  localLastUpdated: string;
  /** Notionの更新日時 */
  notionLastUpdated: string;
  /** 競合するフィールド */
  conflictingFields: string[];
  /** 解決方法 */
  resolution: 'local_wins' | 'notion_wins' | 'manual_required';
}

/**
 * Notion同期統計
 */
export interface NotionSyncStats {
  /** 総同期回数 */
  totalSyncs: number;
  /** 成功回数 */
  successfulSyncs: number;
  /** 失敗回数 */
  failedSyncs: number;
  /** 平均同期時間（ミリ秒） */
  averageSyncTime: number;
  /** 総競合数 */
  totalConflicts: number;
  /** 解決済み競合数 */
  resolvedConflicts: number;
  /** 初回同期日時 */
  firstSyncTime?: string;
  /** 最終同期日時 */
  lastSyncTime?: string;
}

/**
 * 拡張されたStoreSchemaにNotion設定を追加
 */
export interface ExtendedStoreSchema extends StoreSchema {
  /** Notion連携設定 */
  notionSettings?: NotionSettings;
  /** Notion同期統計 */
  notionSyncStats?: NotionSyncStats;
  /** 未解決の同期競合 */
  notionConflicts?: NotionSyncConflict[];
} 