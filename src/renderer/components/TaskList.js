import React, { useState } from 'react';
import TaskItem from './TaskItem';

function TaskList() {
  // サンプルデータ（後でNotion APIから取得するデータに置き換え）
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: 'サンプルタスク1',
      status: 'not-started',
      estimatedTime: '00:30:00',
      actualTime: '00:00:00'
    },
    {
      id: 2,
      title: '進行中のタスク',
      status: 'in-progress',
      estimatedTime: '01:00:00',
      actualTime: '00:30:00'
    }
  ]);

  // タスク操作のハンドラー
  const handleStart = (task) => {
    setTasks(tasks.map(t => {
      if (t.id === task.id) {
        return { ...t, status: 'in-progress' };
      }
      return t;
    }));
  };

  const handlePause = (task) => {
    setTasks(tasks.map(t => {
      if (t.id === task.id) {
        return { ...t, status: 'not-started' };
      }
      return t;
    }));
  };

  const handleComplete = (task) => {
    setTasks(tasks.filter(t => t.id !== task.id));
  };

  return (
    <section className="task-list">
      <h2>本日のタスク</h2>
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