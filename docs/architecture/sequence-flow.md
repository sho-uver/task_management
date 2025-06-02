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