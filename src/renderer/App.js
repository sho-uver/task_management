import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import TaskList from './components/TaskList';

function App() {
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);

  // 初期設定の読み込み
  useEffect(() => {
    loadSettings();
  }, []);

  // 設定の読み込み
  const loadSettings = async () => {
    const settings = await ipcRenderer.invoke('get-settings');
    setIsAlwaysOnTop(settings.isAlwaysOnTop);
  };

  // 設定の更新
  const handleAlwaysOnTopChange = async (e) => {
    const newValue = e.target.checked;
    setIsAlwaysOnTop(newValue);
    await ipcRenderer.invoke('update-settings', {
      isAlwaysOnTop: newValue
    });
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="window-controls">
          <label className="toggle-switch">
            <input
              type="checkbox"
              id="alwaysOnTop"
              checked={isAlwaysOnTop}
              onChange={handleAlwaysOnTopChange}
            />
            <span className="slider"></span>
            <span className="label">常に最前面に表示</span>
          </label>
        </div>
      </header>

      <main className="main-content">
        <TaskList />
      </main>
    </div>
  );
}

export default App; 