import { app, BrowserWindow, ipcMain, powerMonitor, IpcMainInvokeEvent, shell } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ElectronStore from 'electron-store';
import { Task, Settings, StoreSchema, WindowBounds } from '../shared/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const store = new ElectronStore<StoreSchema>({
  defaults: {
    tasks: [],
    settings: {
      isAlwaysOnTop: false,
      window: {
        width: 400,
        height: 600,
        x: undefined,
        y: undefined
      }
    }
  }
});

let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  // 保存された設定を読み込む
  const settings: Settings = store.get('settings');
  const windowSettings: WindowBounds = settings.window;

  // ウィンドウを作成
  const win = new BrowserWindow({
    width: windowSettings.width,
    height: windowSettings.height,
    x: windowSettings.x,
    y: windowSettings.y,
    frame: true,
    resizable: true,
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
    win.loadFile(join(__dirname, '../dist/index.html'));
  }

  // 設定の適用
  win.setAlwaysOnTop(settings.isAlwaysOnTop);

  // ウィンドウの位置とサイズが変更されたときの処理
  let saveWindowBoundsTimeout: NodeJS.Timeout | null = null;
  
  const saveWindowBounds = (): void => {
    const bounds: WindowBounds = win.getBounds();
    store.set('settings.window', bounds);
  };

  win.on('resize', () => {
    if (saveWindowBoundsTimeout) {
      clearTimeout(saveWindowBoundsTimeout);
    }
    saveWindowBoundsTimeout = setTimeout(saveWindowBounds, 500);
  });

  win.on('move', () => {
    if (saveWindowBoundsTimeout) {
      clearTimeout(saveWindowBoundsTimeout);
    }
    saveWindowBoundsTimeout = setTimeout(saveWindowBounds, 500);
  });

  mainWindow = win;
  return win;
}

/**
 * IPCハンドラーの設定
 * @param win メインウィンドウのインスタンス
 */
function setupIpcHandlers(win: BrowserWindow): void {
  // タスク関連
  ipcMain.handle('get-tasks', (): Task[] => {
    return store.get('tasks');
  });

  ipcMain.handle('save-tasks', (event: IpcMainInvokeEvent, tasks: Task[]): boolean => {
    store.set('tasks', tasks);
    return true;
  });

  // 設定関連
  ipcMain.handle('get-settings', (): Settings => {
    return store.get('settings');
  });

  ipcMain.handle('update-settings', (event: IpcMainInvokeEvent, settings: Settings): boolean => {
    store.set('settings', settings);
    win.setAlwaysOnTop(settings.isAlwaysOnTop);
    return true;
  });

  // システムのアイドル時間を取得
  ipcMain.handle('get-system-idle-time', (): number => {
    return powerMonitor.getSystemIdleTime() * 1000; // 秒をミリ秒に変換
  });

  // タスクの作業時間を更新
  ipcMain.handle('update-task-time', (event: IpcMainInvokeEvent, taskId: number, newTime: string): boolean => {
    const tasks: Task[] = store.get('tasks');
    const updatedTasks: Task[] = tasks.map((task: Task) => {
      if (task.id === taskId) {
        return { ...task, actualTime: newTime };
      }
      return task;
    });
    store.set('tasks', updatedTasks);
    return true;
  });
}

/**
 * アプリケーションの初期化
 */
app.whenReady().then((): void => {
  const win: BrowserWindow = createWindow();
  setupIpcHandlers(win);
});

app.on('window-all-closed', (): void => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', (): void => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// アプリケーション終了時のクリーンアップ
app.on('before-quit', (): void => {
  mainWindow = null;
}); 