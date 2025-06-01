import React, { useState } from 'react';

function TaskForm({ onSubmit }) {
  const [title, setTitle] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('00:30:00');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newTask = {
      id: Date.now(), // 一時的なIDとして現在のタイムスタンプを使用
      title,
      status: 'not-started',
      estimatedTime,
      actualTime: '00:00:00'
    };

    onSubmit(newTask);
    setTitle('');
    setEstimatedTime('00:30:00');
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タスク名を入力"
          required
          className="task-input"
        />
      </div>
      <div className="form-group">
        <input
          type="time"
          value={estimatedTime}
          onChange={(e) => setEstimatedTime(e.target.value)}
          step="1"
          required
          className="time-input"
        />
      </div>
      <button type="submit" className="add-button">
        追加
      </button>
    </form>
  );
}

export default TaskForm; 