import React from 'react';

function TaskItem({ task, onStart, onPause, onComplete }) {
  const { title, status, estimatedTime, actualTime } = task;

  return (
    <div className={`task-item ${status === 'in-progress' ? 'active' : ''}`}>
      <div className="task-content">
        <div className={`task-status ${status}`}>
          {status === 'not-started' ? '未着手' : '進行中'}
        </div>
        <div className="task-title">{title}</div>
        <div className="task-time">
          <span className="estimated">{estimatedTime}</span>
          <span className="separator">/</span>
          <span className="actual">{actualTime}</span>
        </div>
      </div>
      <div className="task-controls">
        {status === 'not-started' ? (
          <button className="start-btn" onClick={() => onStart(task)}>
            開始
          </button>
        ) : (
          <button className="pause-btn" onClick={() => onPause(task)}>
            一時停止
          </button>
        )}
        <button
          className="complete-btn"
          onClick={() => onComplete(task)}
          disabled={status === 'not-started'}
        >
          完了
        </button>
      </div>
    </div>
  );
}

export default TaskItem; 