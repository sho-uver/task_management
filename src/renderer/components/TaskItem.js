import React from 'react';
import { useTaskTimer } from '../hooks/useTaskTimer';

function TaskItem({ task, onStart, onPause, onComplete, onEdit }) {
  const { title, status, estimatedTime } = task;
  const { isRunning, actualTime, startTimer, stopTimer } = useTaskTimer(task);

  const handleStart = () => {
    startTimer();
    onStart(task);
  };

  const handlePause = () => {
    stopTimer();
    onPause(task);
  };

  return (
    <div className={`task-item ${isRunning ? 'active' : ''}`}>
      <div className="task-content">
        <span className={`task-status ${status}`}>
          {status === 'in-progress' ? '進行中' : '未着手'}
        </span>
        <span className="task-title">{title}</span>
        <div className="task-time">
          <span>{actualTime}</span>
          <span className="separator">/</span>
          <span>{estimatedTime}</span>
        </div>
      </div>
      <div className="task-controls">
        {!isRunning ? (
          <button className="start-btn" onClick={handleStart}>開始</button>
        ) : (
          <button className="pause-btn" onClick={handlePause}>一時停止</button>
        )}
        <button className="edit-btn" onClick={() => onEdit(task)}>編集</button>
        <button
          className="complete-btn"
          onClick={() => onComplete(task)}
          disabled={isRunning}
        >
          完了
        </button>
      </div>
    </div>
  );
}

export default TaskItem; 