import React from 'react';

function TaskItem({ task, onStart, onPause, onComplete, onEdit }) {
  const { title, status, estimatedTime, actualTime } = task;
  const isInProgress = status === 'in-progress';

  return (
    <div className={`task-item ${isInProgress ? 'active' : ''}`}>
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
        {!isInProgress ? (
          <button className="start-btn" onClick={() => onStart(task)}>開始</button>
        ) : (
          <button className="pause-btn" onClick={() => onPause(task)}>一時停止</button>
        )}
        <button className="edit-btn" onClick={() => onEdit(task)}>編集</button>
        <button
          className="complete-btn"
          onClick={() => onComplete(task)}
          disabled={isInProgress}
        >
          完了
        </button>
      </div>
    </div>
  );
}

export default TaskItem; 