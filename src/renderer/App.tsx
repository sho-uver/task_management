import React, { useState, useEffect, ChangeEvent } from 'react';
import { ipcRenderer } from 'electron';
import TaskList from './components/TaskList';
import { NotionSettingsPanel } from './components/NotionSettingsPanel';
import { Settings, Task } from '../shared/types';

/**
 * メインアプリケーションコンポーネント
 */
const App: React.FC = () => {
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState<boolean>(false);
  const [showNotionSettings, setShowNotionSettings] = useState<boolean>(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  // 初期設定の読み込み
  useEffect(() => {
    loadSettings();
    loadTasks();
  }, []);

  /**
   * 設定の読み込み
   */
  const loadSettings = async (): Promise<void> => {
    try {
      const settings: Settings = await ipcRenderer.invoke('get-settings');
      setIsAlwaysOnTop(settings.isAlwaysOnTop);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  /**
   * タスクの読み込み
   */
  const loadTasks = async (): Promise<void> => {
    try {
      const loadedTasks: Task[] = await ipcRenderer.invoke('get-tasks');
      setTasks(loadedTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  /**
   * 最前面表示設定の変更処理
   */
  const handleAlwaysOnTopChange = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const newValue = e.target.checked;
    setIsAlwaysOnTop(newValue);
    
    try {
      const currentSettings: Settings = await ipcRenderer.invoke('get-settings');
      const updatedSettings: Settings = {
        ...currentSettings,
        isAlwaysOnTop: newValue
      };
      await ipcRenderer.invoke('update-settings', updatedSettings);
    } catch (error) {
      console.error('Failed to update settings:', error);
      // エラー時は元の状態に戻す
      setIsAlwaysOnTop(!newValue);
    }
  };

  /**
   * Notion設定パネルを開く
   */
  const handleOpenNotionSettings = (): void => {
    setShowNotionSettings(true);
  };

  /**
   * Notion設定パネルを閉じる
   */
  const handleCloseNotionSettings = (): void => {
    setShowNotionSettings(false);
    // 設定変更後にタスクを再読み込み
    loadTasks();
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
          
          <button 
            className="notion-settings-button"
            onClick={handleOpenNotionSettings}
            title="Notion連携設定"
          >
            🔗 Notion
          </button>
        </div>
      </header>

      <main className="main-content">
        <TaskList />
      </main>

      {/* Notion設定パネル */}
      {showNotionSettings && (
        <div className="modal-overlay">
          <NotionSettingsPanel 
            onClose={handleCloseNotionSettings}
            tasks={tasks}
          />
        </div>
      )}

      <style jsx>{`
        .app-container {
          height: 100vh;
          display: flex;
          flex-direction: column;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .app-header {
          padding: 8px 12px;
          background-color: #f3f4f6;
          border-bottom: 1px solid #e5e7eb;
          flex-shrink: 0;
        }

        .window-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .toggle-switch {
          display: flex;
          align-items: center;
          cursor: pointer;
          user-select: none;
        }

        .toggle-switch input {
          position: absolute;
          opacity: 0;
          cursor: pointer;
        }

        .slider {
          position: relative;
          width: 44px;
          height: 24px;
          background-color: #cbd5e1;
          border-radius: 12px;
          transition: background-color 0.2s;
          margin-right: 8px;
        }

        .slider::before {
          content: '';
          position: absolute;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background-color: white;
          top: 3px;
          left: 3px;
          transition: transform 0.2s;
        }

        .toggle-switch input:checked + .slider {
          background-color: #3b82f6;
        }

        .toggle-switch input:checked + .slider::before {
          transform: translateX(20px);
        }

        .label {
          font-size: 14px;
          color: #374151;
        }

        .notion-settings-button {
          padding: 6px 12px;
          background-color: #8b5cf6;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .notion-settings-button:hover {
          background-color: #7c3aed;
        }

        .main-content {
          flex: 1;
          overflow: auto;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
      `}</style>
    </div>
  );
};

export default App; 