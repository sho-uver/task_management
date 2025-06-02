# クラス図とクラス構造

## 概要
このドキュメントでは、アプリケーションの主要なクラス構造と、それらの関係性について説明します。

## メインアプリケーション構造

```mermaid
classDiagram
    %% メインアプリケーションクラス
    App *-- TaskManager
    App *-- TimeTracker
    App *-- BrowserWindow
    App *-- Tray
    App *-- NotionClient

    class App {
        -window: BrowserWindow
        -tray: Tray
        -taskManager: TaskManager
        -timeTracker: TimeTracker
        -notionClient: NotionClient
        +initialize()
        +createWindow()
        +createTray()
        +handleWindowEvents()
        +setupIPC()
    }

    %% タスク管理クラス
    TaskManager o-- Task
    TaskManager --> NotionClient

    class TaskManager {
        -tasks: Task[]
        -notionClient: NotionClient
        +fetchTodayTasks()
        +updateTaskStatus(taskId: string, status: TaskStatus)
        +syncWithNotion()
        +getTaskById(taskId: string): Task
        +createTask(taskData: TaskData): Task
        +deleteTask(taskId: string): boolean
    }

    %% 時間計測クラス
    TimeTracker --> Task
    TimeTracker *-- IdleDetector

    class TimeTracker {
        -activeTask: Task | null
        -startTime: Date | null
        -isTracking: boolean
        -idleDetector: IdleDetector
        -timeEntries: TimeEntry[]
        +startTracking(taskId: string)
        +stopTracking()
        +pauseTracking()
        +resumeTracking()
        +getElapsedTime(): number
        +handleIdleDetection()
        +getTimeEntries(): TimeEntry[]
    }

    %% タスクデータクラス
    Task --> TaskStatus
    Task --> TaskType

    class Task {
        -id: string
        -title: string
        -status: TaskStatus
        -type: TaskType
        -estimatedTime: string
        -actualTime: string
        -priority: number
        -description: string
        -startDate: Date
        -endDate: Date
        -notionPageId: string
        -subTasks: Task[]
        +updateStatus(status: TaskStatus)
        +addTimeSpent(time: number)
        +addSubTask(task: Task)
        +removeSubTask(taskId: string)
        +toJSON(): object
    }

    %% アイドル検知クラス
    class IdleDetector {
        -threshold: number
        -lastActivity: Date
        -isIdle: boolean
        -listeners: IdleListener[]
        +checkIdleStatus()
        +resetActivity()
        +addListener(listener: IdleListener)
        +removeListener(listener: IdleListener)
        +getIdleTime(): number
    }

    %% Notionクライアントクラス
    class NotionClient {
        -apiKey: string
        -databaseId: string
        -client: NotionAPI
        +fetchTasks(): Promise<Task[]>
        +updateTask(task: Task): Promise<boolean>
        +syncTimeData(taskId: string, timeData: TimeData): Promise<boolean>
        +createTask(taskData: TaskData): Promise<Task>
        +deleteTask(taskId: string): Promise<boolean>
    }

    %% 列挙型とインターフェース
    class TaskStatus {
        <<enumeration>>
        NOT_STARTED
        IN_PROGRESS
        COMPLETED
    }

    class TaskType {
        <<enumeration>>
        REGULAR
        SCHEDULED
        PERIODIC
    }

    class TimeEntry {
        <<interface>>
        +taskId: string
        +startTime: Date
        +endTime: Date
        +duration: number
        +idlePeriods: IdlePeriod[]
    }

    class IdlePeriod {
        <<interface>>
        +startTime: Date
        +endTime: Date
        +duration: number
    }
```

## クラス詳細

### App クラス
メインアプリケーションのエントリーポイントとなるクラスです。

**責務:**
- アプリケーションの初期化
- ウィンドウとトレイの管理
- IPC（プロセス間通信）の設定
- 各マネージャークラスの統括

### TaskManager クラス
タスクの管理と永続化を担当するクラスです。

**責務:**
- タスクの作成、更新、削除
- Notionとのタスク同期
- タスクの状態管理
- タスクの検索と取得

### TimeTracker クラス
作業時間の計測と記録を担当するクラスです。

**責務:**
- 作業時間の計測
- アイドル状態の監視と処理
- 時間データの記録
- 計測データのエクスポート

### Task クラス
タスクのデータと操作を定義するクラスです。

**責務:**
- タスク情報の保持
- 状態変更の管理
- 作業時間の記録
- サブタスクの管理

### IdleDetector クラス
ユーザーの活動状態を監視するクラスです。

**責務:**
- アイドル状態の検知
- アクティビティの監視
- イベントリスナーの管理
- アイドル時間の計算

### NotionClient クラス
Notion APIとの通信を担当するクラスです。

**責務:**
- Notion APIとの通信
- データの同期
- タスクのCRUD操作
- エラーハンドリング

## 重要な関係性

1. **集約関係（Aggregation）**
   - `TaskManager` は複数の `Task` を管理
   - `TimeTracker` は複数の `TimeEntry` を管理

2. **コンポジション関係（Composition）**
   - `App` は `TaskManager` と `TimeTracker` を所有
   - `TimeTracker` は `IdleDetector` を所有

3. **依存関係（Dependency）**
   - `TaskManager` は `NotionClient` に依存
   - `Task` は `TaskStatus` と `TaskType` に依存

## データフロー

1. **タスク作成フロー**
   ```
   App -> TaskManager -> NotionClient -> Notion API
   ```

2. **時間計測フロー**
   ```
   TimeTracker -> IdleDetector -> TimeEntry -> TaskManager -> NotionClient
   ```

3. **同期フロー**
   ```
   NotionClient -> TaskManager -> App -> UI更新
   ``` 