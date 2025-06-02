import React, { useState, useEffect, ChangeEvent } from 'react';
import { ipcRenderer } from 'electron';
import TaskList from './components/TaskList';
import { Settings } from '../shared/types';

/**
 * メインアプリケーションコンポーネント
 */
const App: React.FC = () => {
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState<boolean>(false);

  // 初期設定の読み込み
  useEffect(() => {
    loadSettings();
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
};

export default App; 