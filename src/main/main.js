const { app, BrowserWindow, ipcMain, powerMonitor } = require('electron');
const path = require('path');
const store = require('./store');

function createWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 400,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // 開発モードの場合はwebpack-dev-serverから読み込み
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:8080');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 設定の読み込みと適用
  const settings = store.get('settings');
  win.setAlwaysOnTop(settings.isAlwaysOnTop);

  return win;
}

// IPCハンドラーの設定
function setupIpcHandlers(win) {
  // タスク関連
  ipcMain.handle('get-tasks', () => {
    return store.get('tasks');
  });

  ipcMain.handle('save-tasks', (event, tasks) => {
    store.set('tasks', tasks);
    return true;
  });

  // 設定関連
  ipcMain.handle('get-settings', () => {
    return store.get('settings');
  });

  ipcMain.handle('update-settings', (event, settings) => {
    store.set('settings', settings);
    win.setAlwaysOnTop(settings.isAlwaysOnTop);
    return true;
  });

  // システムのアイドル時間を取得
  ipcMain.handle('get-system-idle-time', () => {
    return powerMonitor.getSystemIdleTime() * 1000; // 秒をミリ秒に変換
  });

  // タスクの作業時間を更新
  ipcMain.handle('update-task-time', (event, taskId, newTime) => {
    const tasks = store.get('tasks');
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        return { ...task, actualTime: newTime };
      }
      return task;
    });
    store.set('tasks', updatedTasks);
    return true;
  });
}

app.whenReady().then(() => {
  const win = createWindow();
  setupIpcHandlers(win);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
}); 