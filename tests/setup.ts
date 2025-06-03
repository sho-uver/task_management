/**
 * Jest テスト環境のセットアップ
 */

// performance.now() のモック（Node.js環境用）
if (typeof performance === 'undefined') {
  global.performance = {
    now: jest.fn(() => Date.now()),
  } as any;
}

// Electron ipcRenderer のモック
const mockIpcRenderer = {
  invoke: jest.fn(),
  send: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
};

// Electron のモック
jest.mock('electron', () => ({
  ipcRenderer: mockIpcRenderer,
}));

// グローバル変数の設定
(global as any).mockIpcRenderer = mockIpcRenderer;

// タイマー関数のモック（必要に応じて）
jest.useFakeTimers();

// テスト後のクリーンアップ
beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.useFakeTimers();
}); 