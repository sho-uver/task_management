import React, { useState, useEffect, useCallback } from 'react';
import { ipcRenderer } from 'electron';
import TaskItem from './TaskItem';
import TaskForm from './TaskForm';
import { Task } from '../../shared/types';

/**
 * タスクリストコンポーネント
 * タスクの一覧表示、追加、編集、削除を管理する
 */
const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 初期データの読み込み
  useEffect(() => {
    loadTasks();
  }, []);

  /**
   * タスクの読み込み
   */
  const loadTasks = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const savedTasks: Task[] = await ipcRenderer.invoke('get-tasks');
      setTasks(savedTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setError('タスクの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * タスクの保存
   * @param updatedTasks 更新されたタスクリスト
   */
  const saveTasks = async (updatedTasks: Task[]): Promise<void> => {
    try {
      await ipcRenderer.invoke('save-tasks', updatedTasks);
      setTasks(updatedTasks);
      setError(null);
    } catch (error) {
      console.error('Failed to save tasks:', error);
      setError('タスクの保存に失敗しました');
    }
  };

  /**
   * 新規タスクの追加
   * @param newTask 新しいタスク
   */
  const handleAddTask = useCallback((newTask: Task): void => {
    const updatedTasks = [...tasks, newTask];
    saveTasks(updatedTasks);
  }, [tasks]);

  /**
   * タスクの編集
   * @param editedTask 編集されたタスク
   */
  const handleEditTask = useCallback((editedTask: Task): void => {
    const updatedTasks = tasks.map(t => 
      t.id === editedTask.id ? editedTask : t
    );
    saveTasks(updatedTasks);
    setEditingTask(null);
  }, [tasks]);

  /**
   * 編集のキャンセル
   */
  const handleCancelEdit = useCallback((): void => {
    setEditingTask(null);
  }, []);

  /**
   * タスクの開始
   * @param task 開始するタスク
   */
  const handleStart = useCallback((task: Task): void => {
    const updatedTasks = tasks.map(t => {
      if (t.id === task.id) {
        return { ...t, status: 'in-progress' as const };
      }
      return t;
    });
    saveTasks(updatedTasks);
  }, [tasks]);

  /**
   * タスクの一時停止
   * @param task 一時停止するタスク
   */
  const handlePause = useCallback((task: Task): void => {
    const updatedTasks = tasks.map(t => {
      if (t.id === task.id) {
        return { ...t, status: 'not-started' as const };
      }
      return t;
    });
    saveTasks(updatedTasks);
  }, [tasks]);

  /**
   * タスクの完了（削除）
   * @param task 完了するタスク
   */
  const handleComplete = useCallback(async (task: Task): Promise<void> => {
    try {
      // タスクの完了処理をメインプロセスに依頼
      const success = await ipcRenderer.invoke('complete-task', task.id);
      
      if (success) {
        // タスクリストを再読み込み
        await loadTasks();
        console.log(`Task ${task.id} completed successfully`);
      } else {
        throw new Error('Failed to complete task');
      }
    } catch (error) {
      console.error('Failed to complete task:', error);
      setError('タスクの完了処理に失敗しました');
      throw error; // エラーを上位に伝播
    }
  }, [loadTasks]);

  /**
   * タスクの編集開始
   * @param task 編集するタスク
   */
  const handleStartEdit = useCallback((task: Task): void => {
    setEditingTask(task);
  }, []);

  if (isLoading) {
    return (
      <section className="task-list">
        <div className="loading">読み込み中...</div>
      </section>
    );
  }

  return (
    <section className="task-list">
      <h2>本日のタスク</h2>
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={loadTasks} className="retry-button">
            再試行
          </button>
        </div>
      )}

      {editingTask ? (
        <TaskForm
          task={editingTask}
          onSubmit={handleEditTask}
          onCancel={handleCancelEdit}
        />
      ) : (
        <TaskForm onSubmit={handleAddTask} />
      )}

      <div className="tasks">
        {tasks.length === 0 ? (
          <div className="no-tasks">タスクがありません</div>
        ) : (
          tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onStart={handleStart}
              onPause={handlePause}
              onComplete={handleComplete}
              onEdit={handleStartEdit}
            />
          ))
        )}
      </div>
    </section>
  );
};

export default TaskList; 