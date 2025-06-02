import React from 'react';
import { useTaskTimer } from '../hooks/useTaskTimer';
import { Task } from '../../shared/types';

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
  const { isRunning, actualTime, startTimer, stopTimer } = useTaskTimer(task);

  /**
   * タスク開始処理
   */
  const handleStart = (): void => {
    startTimer();
    onStart(task);
  };

  /**
   * タスク一時停止処理
   */
  const handlePause = (): void => {
    stopTimer();
    onPause(task);
  };

  /**
   * タスク編集処理
   */
  const handleEdit = (): void => {
    onEdit(task);
  };

  /**
   * タスク完了処理
   */
  const handleComplete = (): void => {
    if (window.confirm('このタスクを完了しますか？')) {
      onComplete(task);
    }
  };

  /**
   * ステータスの表示名を取得
   */
  const getStatusLabel = (status: Task['status']): string => {
    switch (status) {
      case 'in-progress':
        return '進行中';
      case 'not-started':
        return '未着手';
      default:
        return '不明';
    }
  };

  return (
    <div className={`task-item ${isRunning ? 'active' : ''} ${status}`}>
      <div className="task-content">
        <span className={`task-status ${status}`}>
          {getStatusLabel(status)}
        </span>
        <span className="task-title" title={title}>
          {title}
        </span>
        <div className="task-time">
          <span className="actual-time">{actualTime}</span>
          <span className="separator">/</span>
          <span className="estimated-time">{estimatedTime}</span>
        </div>
      </div>
      <div className="task-controls">
        {!isRunning ? (
          <button 
            className="start-btn" 
            onClick={handleStart}
            disabled={status === 'in-progress'}
            title="タスクを開始"
          >
            開始
          </button>
        ) : (
          <button 
            className="pause-btn" 
            onClick={handlePause}
            title="タスクを一時停止"
          >
            一時停止
          </button>
        )}
        <button 
          className="edit-btn" 
          onClick={handleEdit}
          disabled={isRunning}
          title="タスクを編集"
        >
          編集
        </button>
        <button
          className="complete-btn"
          onClick={handleComplete}
          disabled={isRunning}
          title="タスクを完了"
        >
          完了
        </button>
      </div>
    </div>
  );
};

export default TaskItem; 