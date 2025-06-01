import React, { useState, useEffect } from 'react';

function TaskForm({ task, onSubmit, onCancel }) {
  const [title, setTitle] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('00:30:00');
  const isEditing = !!task;

  // タスクが渡された場合（編集モード）、フォームの初期値を設定
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setEstimatedTime(task.estimatedTime);
    }
  }, [task]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const taskData = {
      title,
      estimatedTime,
    };

    if (isEditing) {
      // 編集モードの場合は既存のタスクデータとマージ
      onSubmit({
        ...task,
        ...taskData
      });
    } else {
      // 新規作成モードの場合は新しいIDを生成
      onSubmit({
        ...taskData,
        id: Date.now(),
        status: 'not-started',
        actualTime: '00:00:00'
      });
    }

    // フォームをリセット（編集モードでない場合のみ）
    if (!isEditing) {
      setTitle('');
      setEstimatedTime('00:30:00');
    }
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
      <div className="form-actions">
        <button type="submit" className={isEditing ? "save-button" : "add-button"}>
          {isEditing ? '保存' : '追加'}
        </button>
        {isEditing && (
          <button type="button" className="cancel-button" onClick={onCancel}>
            キャンセル
          </button>
        )}
      </div>
    </form>
  );
}

export default TaskForm; 