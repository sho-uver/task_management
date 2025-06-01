const { app, BrowserWindow, ipcMain } = require('electron');
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