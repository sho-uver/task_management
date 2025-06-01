import React from 'react';

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="window-controls">
          <label className="toggle-switch">
            <input type="checkbox" id="alwaysOnTop" />
            <span className="slider"></span>
            <span className="label">常に最前面に表示</span>
          </label>
        </div>
      </header>

      <main className="main-content">
        <section className="task-list">
          <h2>本日のタスク</h2>
          <div className="tasks">
            {/* タスクリストはここに実装されます */}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App; 