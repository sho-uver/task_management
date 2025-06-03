import React, { useCallback, useState } from 'react';
import { useTaskTimer } from '../hooks/useTaskTimer';
import { Task } from '../../shared/types';
import TaskCompletionDialog from './TaskCompletionDialog';

/**
 * TaskItemコンポーネントのプロパティ
 */
interface TaskItemProps {
  /** 表示するタスク */
  task: Task;
  /** タスク開始時のコールバック */
  onStart: (task: Task) => void;
  /** タスク一時停止時のコールバック */
  onPause: (task: Task) => void;
  /** タスク完了時のコールバック */
  onComplete: (task: Task) => void;
  /** タスク編集時のコールバック */
  onEdit: (task: Task) => void;
}

/**
 * 個別のタスクアイテムコンポーネント
 */
const TaskItem: React.FC<TaskItemProps> = ({ 
  task, 
  onStart, 
  onPause, 
  onComplete, 
  onEdit 
}) => {
  const { title, status, estimatedTime } = task;
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const { 
    isRunning, 
    actualTime, 
    isIdle,
    hasError,
    errorMessage,
    startTimer, 
    stopTimer,
    clearError,
    timerInfo,
    resetIdleState
  } = useTaskTimer(task);

  /**
   * タスク開始処理
   */
  const handleStart = useCallback(async (): Promise<void> => {
    try {
      setIsTransitioning(true);
      startTimer();
      await onStart(task);
    } catch (error) {
      console.error('Failed to start task:', error);
    } finally {
      setIsTransitioning(false);
    }
  }, [task, startTimer, onStart]);

  /**
   * タスク一時停止処理
   */
  const handlePause = useCallback(async (): Promise<void> => {
    try {
      setIsTransitioning(true);
      stopTimer();
      await onPause(task);
    } catch (error) {
      console.error('Failed to pause task:', error);
    } finally {
      setIsTransitioning(false);
    }
  }, [task, stopTimer, onPause]);

  /**
   * タスク編集処理
   */
  const handleEdit = useCallback((): void => {
    if (isRunning) {
      if (!window.confirm('タイマーを停止して編集を開始しますか？')) {
        return;
      }
      stopTimer();
    }
    onEdit(task);
  }, [task, isRunning, stopTimer, onEdit]);

  /**
   * タスク完了ボタン処理
   */
  const handleCompleteClick = useCallback((): void => {
    if (isRunning) {
      stopTimer();
    }
    setShowCompletionDialog(true);
  }, [isRunning, stopTimer]);

  /**
   * タスク完了確定処理
   */
  const handleCompleteConfirm = useCallback(async (taskToComplete: Task): Promise<void> => {
    try {
      await onComplete(taskToComplete);
      setShowCompletionDialog(false);
    } catch (error) {
      console.error('Failed to complete task:', error);
      throw error;
    }
  }, [onComplete]);

  /**
   * 完了ダイアログキャンセル処理
   */
  const handleCompletionCancel = useCallback((): void => {
    setShowCompletionDialog(false);
  }, []);

  /**
   * アイドル状態からの復帰処理
   */
  const handleResumeFromIdle = useCallback((): void => {
    resetIdleState();
  }, [resetIdleState]);

  /**
   * ステータスの表示名を取得
   */
  const getStatusLabel = useCallback((status: Task['status']): string => {
    switch (status) {
      case 'in-progress':
        return '進行中';
      case 'not-started':
        return '未着手';
      case 'completed':
        return '完了';
      default:
        return '不明';
    }
  }, []);

  /**
   * タイマー状態の表示クラス名を取得
   */
  const getTimerStatusClass = useCallback((): string => {
    if (hasError) return 'timer-error';
    if (isIdle && isRunning) return 'timer-idle';
    if (isRunning) return 'timer-running';
    return '';
  }, [hasError, isIdle, isRunning]);

  return (
    <>
      <div 
        className={`task-item ${isRunning ? 'active' : ''} ${status} ${getTimerStatusClass()}`}
        data-testid={`task-item-${task.id}`}
      >
        <div className="task-content">
          <span className={`task-status ${status}`} title={`ステータス: ${getStatusLabel(status)}`}>
            {getStatusLabel(status)}
          </span>
          <span className="task-title" title={title}>
            {title}
          </span>
          <div className="task-time">
            <span 
              className={`actual-time ${hasError ? 'error' : ''}`}
              title={`実績時間: ${actualTime}`}
            >
              {actualTime}
            </span>
            <span className="separator">/</span>
            <span 
              className="estimated-time"
              title={`見積時間: ${estimatedTime}`}
            >
              {estimatedTime}
            </span>
            {isRunning && isIdle && (
              <button
                className="idle-indicator"
                title="アイドル状態 - クリックで復帰"
                onClick={handleResumeFromIdle}
              >
                ⏸
              </button>
            )}
            {hasError && (
              <span className="error-indicator" title={errorMessage}>⚠</span>
            )}
          </div>
        </div>
        
        {/* エラーメッセージ表示 */}
        {hasError && (
          <div className="task-error">
            <span className="error-message">{errorMessage}</span>
            <button 
              className="error-clear-btn" 
              onClick={clearError}
              title="エラーをクリア"
            >
              ×
            </button>
          </div>
        )}
        
        <div className="task-controls">
          {!isRunning ? (
            <button 
              className="start-btn" 
              onClick={handleStart}
              disabled={isTransitioning || status === 'in-progress'}
              title={
                status === 'in-progress' 
                  ? 'すでに進行中のタスクがあります'
                  : 'タスクを開始'
              }
            >
              {isTransitioning ? '開始中...' : '開始'}
            </button>
          ) : (
            <button 
              className="pause-btn" 
              onClick={handlePause}
              disabled={isTransitioning}
              title={isIdle ? "アイドル中 - 一時停止" : "タスクを一時停止"}
            >
              {isTransitioning ? '停止中...' : (isIdle ? "停止" : "一時停止")}
            </button>
          )}
          <button 
            className="edit-btn" 
            onClick={handleEdit}
            disabled={isTransitioning}
            title={isRunning ? "タイマーを停止して編集" : "タスクを編集"}
          >
            編集
          </button>
          <button
            className="complete-btn"
            onClick={handleCompleteClick}
            disabled={isTransitioning}
            title={isRunning ? "タイマーを停止して完了" : "タスクを完了"}
          >
            完了
          </button>
        </div>
        
        {/* デバッグ情報（開発モード時のみ） */}
        {process.env.NODE_ENV === 'development' && (
          <div className="timer-debug">
            <small>
              Status: {isRunning ? 'Running' : 'Stopped'} 
              {isIdle && ' (Idle)'} 
              {isTransitioning && ' (Transitioning)'}
              <br />
              Last update: {new Date(timerInfo.lastUpdate).toLocaleTimeString()}
              {timerInfo.drift > 0 && ` | Drift: ${timerInfo.drift}ms`}
            </small>
          </div>
        )}
      </div>
      
      {/* タスク完了確認ダイアログ */}
      <TaskCompletionDialog
        task={task}
        isOpen={showCompletionDialog}
        onComplete={handleCompleteConfirm}
        onCancel={handleCompletionCancel}
      />
    </>
  );
};

export default React.memo(TaskItem); 