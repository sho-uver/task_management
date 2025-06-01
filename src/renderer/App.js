import React, { useState } from 'react';
import TaskList from './components/TaskList';

function App() {
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);

  const handleAlwaysOnTopChange = (e) => {
    setIsAlwaysOnTop(e.target.checked);
    // TODO: Electron側と連携して実際にウィンドウを最前面に固定する処理を実装
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