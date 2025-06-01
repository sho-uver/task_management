import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import TaskItem from './TaskItem';
import TaskForm from './TaskForm';

function TaskList() {
  const [tasks, setTasks] = useState([]);

  // 初期データの読み込み
  useEffect(() => {
    loadTasks();
  }, []);

  // タスクの読み込み
  const loadTasks = async () => {
    const savedTasks = await ipcRenderer.invoke('get-tasks');
    setTasks(savedTasks);
  };

  // タスクの保存
  const saveTasks = async (updatedTasks) => {
    await ipcRenderer.invoke('save-tasks', updatedTasks);
    setTasks(updatedTasks);
  };

  // 新規タスクの追加
  const handleAddTask = (newTask) => {
    const updatedTasks = [...tasks, newTask];
    saveTasks(updatedTasks);
  };

  // タスク操作のハンドラー
  const handleStart = (task) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === task.id) {
        return { ...t, status: 'in-progress' };
      }
      return t;
    });
    saveTasks(updatedTasks);
  };

  const handlePause = (task) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === task.id) {
        return { ...t, status: 'not-started' };
      }
      return t;
    });
    saveTasks(updatedTasks);
  };

  const handleComplete = (task) => {
    const updatedTasks = tasks.filter(t => t.id !== task.id);
    saveTasks(updatedTasks);
  };

  return (
    <section className="task-list">
      <h2>本日のタスク</h2>
      <TaskForm onSubmit={handleAddTask} />
      <div className="tasks">
        {tasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            onStart={handleStart}
            onPause={handlePause}
            onComplete={handleComplete}
          />
        ))}
      </div>
    </section>
  );
}

export default TaskList; 