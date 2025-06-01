// タスクの状態を定義
export type TaskStatus = 'not-started' | 'in-progress' | 'completed';

// タスクの基本構造
export interface Task {
  id: number;
  title: string;
  status: TaskStatus;
  estimatedTime: string; // "HH:mm:ss" 形式
  actualTime: string;    // "HH:mm:ss" 形式
  description?: string;
  startDate?: string;    // "YYYY-MM-DD" 形式
  endDate?: string;      // "YYYY-MM-DD" 形式
  timeDetails?: string;  // 作業時間の内訳
}

// アプリケーション設定
export interface AppSettings {
  isAlwaysOnTop: boolean;
  window: {
    x: number | null;
    y: number | null;
    width: number;
    height: number;
  };
}

// ストアのスキーマ型
export interface StoreSchema {
  tasks: Task[];
  settings: AppSettings;
}

// アイドル状態の型
export interface IdleState {
  isIdle: boolean;
  lastActivity: Date;
  threshold: number; // ミリ秒単位
}

// タイマーの状態
export interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  elapsedTime: number;
  taskId: number | null;
} 