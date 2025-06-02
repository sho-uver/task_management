/**
 * タスクの状態を表す型
 */
export type TaskStatus = 'not-started' | 'in-progress';

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
  /** アプリケーションの設定 */
  settings: Settings;
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
  UPDATE_TASK_TIME: 'update-task-time'
} as const;

/**
 * IPC通信のチャンネル名の型
 */
export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]; 