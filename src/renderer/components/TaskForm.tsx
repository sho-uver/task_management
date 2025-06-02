import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { Task } from '../../shared/types';

/**
 * TaskFormコンポーネントのプロパティ
 */
interface TaskFormProps {
  /** 編集対象のタスク（新規作成時はundefined） */
  task?: Task;
  /** フォーム送信時のコールバック */
  onSubmit: (task: Task) => void;
  /** キャンセル時のコールバック（編集時のみ） */
  onCancel?: () => void;
}

/**
 * タスクの追加・編集フォームコンポーネント
 */
const TaskForm: React.FC<TaskFormProps> = ({ task, onSubmit, onCancel }) => {
  const [title, setTitle] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<string>('00:30:00');
  const isEditing = !!task;

  // タスクが渡された場合（編集モード）、フォームの初期値を設定
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setEstimatedTime(task.estimatedTime);
    } else {
      // 新規作成モードの場合はフォームをリセット
      setTitle('');
      setEstimatedTime('00:30:00');
    }
  }, [task]);

  /**
   * フォーム送信処理
   */
  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('タスク名を入力してください');
      return;
    }

    const taskData = {
      title: title.trim(),
      estimatedTime,
    };

    if (isEditing && task) {
      // 編集モードの場合は既存のタスクデータとマージ
      onSubmit({
        ...task,
        ...taskData
      });
    } else {
      // 新規作成モードの場合は新しいIDを生成
      const newTask: Task = {
        ...taskData,
        id: Date.now(),
        status: 'not-started',
        actualTime: '00:00:00'
      };
      onSubmit(newTask);
    }

    // フォームをリセット（編集モードでない場合のみ）
    if (!isEditing) {
      setTitle('');
      setEstimatedTime('00:30:00');
    }
  };

  /**
   * タイトル入力の変更処理
   */
  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setTitle(e.target.value);
  };

  /**
   * 見積時間入力の変更処理
   */
  const handleEstimatedTimeChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setEstimatedTime(e.target.value);
  };

  /**
   * キャンセルボタンの処理
   */
  const handleCancel = (): void => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="タスク名を入力"
          required
          className="task-input"
          maxLength={100}
        />
      </div>
      <div className="form-group">
        <input
          type="time"
          value={estimatedTime}
          onChange={handleEstimatedTimeChange}
          step="1"
          required
          className="time-input"
        />
      </div>
      <div className="form-actions">
        <button type="submit" className={isEditing ? "save-button" : "add-button"}>
          {isEditing ? '保存' : '追加'}
        </button>
        {isEditing && onCancel && (
          <button type="button" className="cancel-button" onClick={handleCancel}>
            キャンセル
          </button>
        )}
      </div>
    </form>
  );
};

export default TaskForm; 