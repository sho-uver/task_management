# シーケンス図と処理フロー

## 概要
このドキュメントでは、アプリケーションの主要な処理フローをシーケンス図で説明します。

## 1. アプリケーション起動フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant App as アプリケーション
    participant Window as メインウィンドウ
    participant Tray as システムトレイ
    participant TM as TaskManager
    participant NC as NotionClient
    
    User->>App: アプリケーション起動
    activate App
    
    par ウィンドウ初期化
        App->>Window: createWindow()
        Window-->>App: ウィンドウ作成完了
    and トレイ初期化
        App->>Tray: createTray()
        Tray-->>App: トレイ作成完了
    end
    
    App->>TM: initialize()
    activate TM
    TM->>NC: fetchTodayTasks()
    activate NC
    NC-->>TM: タスクデータ
    deactivate NC
    TM-->>App: 初期化完了
    deactivate TM
    
    App->>Window: renderTasks(tasks)
    Window-->>User: UI表示
    deactivate App
```

## 2. タスク作成フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as ユーザーインターフェース
    participant TM as TaskManager
    participant NC as NotionClient
    participant DB as Notion Database
    
    User->>UI: タスク作成ボタンクリック
    UI->>UI: タスク作成フォーム表示
    User->>UI: タスク情報入力
    UI->>TM: createTask(taskData)
    
    activate TM
    TM->>NC: createTask(taskData)
    
    activate NC
    NC->>DB: データベース更新
    DB-->>NC: 作成完了
    NC-->>TM: 新規タスク情報
    deactivate NC
    
    TM->>TM: タスクリスト更新
    TM-->>UI: 更新完了
    deactivate TM
    
    UI-->>User: 完了通知
```

## 3. 作業時間計測フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as ユーザーインターフェース
    participant TT as TimeTracker
    participant ID as IdleDetector
    participant TM as TaskManager
    
    User->>UI: タスク開始ボタンクリック
    UI->>TT: startTracking(taskId)
    
    activate TT
    TT->>ID: resetActivity()
    TT->>TT: setActiveTask(taskId)
    
    loop 時間計測
        ID->>ID: checkIdleStatus()
        alt アイドル検知
            ID->>TT: onIdle()
            TT->>TT: pauseTracking()
            TT->>UI: updateTimerDisplay(paused)
        else アクティブ
            ID->>TT: onActive()
            TT->>TT: resumeTracking()
            TT->>UI: updateTimerDisplay(active)
        end
    end
    
    User->>UI: タスク完了ボタンクリック
    UI->>TT: stopTracking()
    
    TT->>TT: calculateTotalTime()
    TT->>TM: updateTimeSpent(taskId, totalTime)
    deactivate TT
    
    TM->>TM: updateTask()
    TM-->>UI: 更新完了
    UI-->>User: 完了通知
```

## 4. Notion同期フロー

```mermaid
sequenceDiagram
    participant TM as TaskManager
    participant NC as NotionClient
    participant DB as Notion Database
    participant UI as ユーザーインターフェース
    
    loop 定期同期（5分間隔）
        TM->>NC: syncWithNotion()
        
        activate NC
        NC->>DB: fetchUpdates()
        DB-->>NC: 更新データ
        
        alt データ変更あり
            NC->>TM: updateTasks(changes)
            TM->>UI: refreshDisplay()
        end
        deactivate NC
    end
```

## 5. アイドル検知フロー

```mermaid
sequenceDiagram
    participant ID as IdleDetector
    participant TT as TimeTracker
    participant UI as ユーザーインターフェース
    
    loop アイドル検知（定期チェック）
        ID->>ID: checkIdleStatus()
        
        alt 5分以上無操作
            ID->>TT: onIdle()
            TT->>TT: pauseTracking()
            TT->>UI: updateStatus(paused)
            UI->>UI: showIdleNotification()
        else アクティビティ検知
            ID->>TT: onActive()
            TT->>TT: resumeTracking()
            TT->>UI: updateStatus(active)
        end
    end
```

## 画面遷移図
```mermaid
graph TD
    Start[アプリケーション起動] --> Split{分岐}
    Split --> N[Notionアプリ]
    Split --> E[Electronアプリ]

    %% Notion部分の画面遷移
    N --> |メインメニューから選択| TM[チケット管理画面]
    N --> |メインメニューから選択| SM[スケジュール管理画面]
    N --> |メインメニューから選択| PM[定期タスク管理画面]

    %% チケット管理画面の詳細遷移
    TM --> |作成ボタンクリック| TC[チケット作成]
    TM --> |チケットクリック| TD[チケット詳細]
    TD --> |編集ボタンクリック| TE[チケット編集]
    TD --> |子タスクボタンクリック| ST[子タスク管理]

    %% スケジュール管理画面の詳細遷移
    SM --> |日付クリック| DC[日付詳細]
    SM --> |キャパシティボタン| CP[キャパシティ設定]
    SM --> |自動スケジューリング| AS[自動スケジューリング実行]

    %% 定期タスク管理画面の詳細遷移
    PM --> |作成ボタンクリック| PC[定期タスク作成]
    PM --> |タスククリック| PD[定期タスク詳細]
    PD --> |編集ボタンクリック| PE[定期タスク編集]

    %% Electron部分の画面遷移
    E --> |常駐起動| DT[当日タスク表示]
    DT --> |タスク選択| TS[タスクステータス管理]
    TS --> |開始チェック| TT[時間計測]
    TT --> |終了チェック/アイドル検知| TE2[計測終了]

    %% スタイル定義
    classDef notion fill:#f9f,stroke:#333,stroke-width:2px
    classDef electron fill:#bbf,stroke:#333,stroke-width:2px
    
    %% スタイル適用
    class N,TM,SM,PM,TC,TD,TE,ST,DC,CP,AS,PC,PD,PE notion
    class E,DT,TS,TT,TE2 electron
```

### 画面遷移の説明
1. アプリケーション起動時
   - Notionアプリとelectronアプリが並行して起動
   - 両アプリは独立して動作するが、データは連携

2. Notion部分（メイン機能）
   - メインメニューから3つの主要機能へアクセス
     - チケット管理画面
     - スケジュール管理画面
     - 定期タスク管理画面
   - 各機能内で詳細な操作が可能
   - チケット、スケジュール、定期タスクの相互連携

3. Electron部分（作業管理）
   - 常駐型アプリケーションとして動作
   - シンプルな操作フローで作業記録を実現
   - 自動的なステータス管理と時間計測

## アプリケーションフロー

### タスク開始から計測までの流れ
```mermaid
sequenceDiagram
    actor User as ユーザー
    participant UI as ElectronUI
    participant App as App
    participant TM as TaskManager
    participant TT as TimeTracker
    participant ID as IdleDetector
    participant NC as NotionClient
    
    User->>UI: タスク開始ボタンクリック
    UI->>App: startTask(taskId)
    App->>TM: updateTaskStatus(taskId, IN_PROGRESS)
    TM->>NC: updateTask(taskId, status)
    NC-->>TM: 更新完了
    
    App->>TT: startTracking(taskId)
    TT->>ID: resetActivity()
    TT->>TT: setActiveTask(taskId)
    
    loop 時間計測
        ID->>ID: checkIdleStatus()
        alt アイドル検知
            ID->>TT: onIdle()
            TT->>TT: pauseTracking()
            TT->>UI: updateTimerDisplay(paused)
        else アクティブ
            ID->>TT: onActive()
            TT->>TT: resumeTracking()
            TT->>UI: updateTimerDisplay(active)
        end
    end
```

### タスク完了時の同期フロー
```mermaid
sequenceDiagram
    actor User as ユーザー
    participant UI as ElectronUI
    participant App as App
    participant TM as TaskManager
    participant TT as TimeTracker
    participant NC as NotionClient
    
    User->>UI: タスク完了ボタンクリック
    UI->>App: completeTask(taskId)
    
    par 時間計測停止
        App->>TT: stopTracking()
        TT->>TT: calculateTotalTime()
        TT->>App: return totalTime
    and ステータス更新
        App->>TM: updateTaskStatus(taskId, COMPLETED)
    end
    
    App->>TM: updateTimeSpent(taskId, totalTime)
    TM->>NC: syncTimeData(taskId, totalTime)
    NC-->>TM: 同期完了
    
    TM->>UI: updateTaskList()
    UI->>User: 完了表示
```

### アプリケーション起動時のデータ同期
```mermaid
sequenceDiagram
    participant App as App
    participant TM as TaskManager
    participant NC as NotionClient
    participant UI as ElectronUI
    
    App->>App: initialize()
    App->>TM: initialize()
    
    par Notionデータ取得
        TM->>NC: fetchTodayTasks()
        NC-->>TM: return tasks
        TM->>TM: processTasks()
    and UI初期化
        App->>UI: createWindow()
        App->>UI: createTray()
    end
    
    TM->>UI: renderTasks(tasks)
    UI->>UI: setupEventListeners()
```

## 主要な処理フローの説明

### アプリケーション起動時の処理
1. メインウィンドウとシステムトレイの並行初期化
2. タスクマネージャーの初期化とNotionからのデータ取得
3. UIの初期表示

### タスク管理の処理
1. ユーザーによるタスク作成
2. Notionデータベースとの同期
3. UI更新の反映

### 時間計測の処理
1. タスク開始時の初期化
2. アイドル検知による自動一時停止/再開
3. 作業時間の記録と同期

### データ同期の処理
1. 定期的なNotion同期
2. 変更検知と差分更新
3. UI表示の更新

### アイドル検知の処理
1. 定期的なアクティビティチェック
2. 無操作時の自動一時停止
3. アクティビティ再開時の自動再開 