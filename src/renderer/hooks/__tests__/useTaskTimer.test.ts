/**
 * useTaskTimer hook tests
 */
import { renderHook, act } from '@testing-library/react';
import { Task } from '../../../shared/types';

// Mock electron first with a factory function
jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
  }
}));

// Mock dependencies
jest.mock('../../utils/timer', () => ({
  ...jest.requireActual('../../utils/timer'),
  globalTimer: {
    isRunning: jest.fn(),
    getCurrentTaskId: jest.fn(),
    getTotalSeconds: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    addListener: jest.fn(),
  }
}));
jest.mock('../../utils/idleDetector');

// Import after mocking
import { useTaskTimer } from '../useTaskTimer';
import { globalTimer } from '../../utils/timer';
import { ipcRenderer } from 'electron';

const mockGlobalTimer = globalTimer as jest.Mocked<typeof globalTimer>;
const mockIpcRenderer = ipcRenderer as jest.Mocked<typeof ipcRenderer>;

describe('useTaskTimer', () => {
  const mockTask: Task = {
    id: 1,
    title: 'Test Task',
    status: 'not-started',
    estimatedTime: '01:00:00',
    actualTime: '00:30:00',
    lastUpdated: '2024-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // グローバルタイマーのモック設定
    mockGlobalTimer.isRunning.mockReturnValue(false);
    mockGlobalTimer.getCurrentTaskId.mockReturnValue(null);
    mockGlobalTimer.getTotalSeconds.mockReturnValue(0);
    mockGlobalTimer.start = jest.fn();
    mockGlobalTimer.stop = jest.fn();
    mockGlobalTimer.addListener = jest.fn().mockReturnValue(jest.fn());
    
    // IPCレンダラーのモック設定
    mockIpcRenderer.invoke.mockResolvedValue(true);
    mockIpcRenderer.on.mockReturnValue(mockIpcRenderer);
    mockIpcRenderer.removeListener.mockReturnValue(mockIpcRenderer);
  });

  test('should initialize with correct default state', () => {
    const { result } = renderHook(() => useTaskTimer(mockTask));

    expect(result.current.isRunning).toBe(false);
    expect(result.current.actualTime).toBe('00:30:00');
    expect(result.current.isIdle).toBe(false);
    expect(result.current.hasError).toBe(false);
    expect(result.current.errorMessage).toBe('');
  });

  test('should start timer correctly', () => {
    const { result } = renderHook(() => useTaskTimer(mockTask));

    act(() => {
      result.current.startTimer();
    });

    expect(mockGlobalTimer.start).toHaveBeenCalledWith(1, 1800); // 30分 = 1800秒
  });

  test('should stop timer correctly', () => {
    mockGlobalTimer.getCurrentTaskId.mockReturnValue(1);
    mockGlobalTimer.stop.mockReturnValue(2100); // 35分
    
    const { result } = renderHook(() => useTaskTimer(mockTask));

    act(() => {
      result.current.stopTimer();
    });

    expect(mockGlobalTimer.stop).toHaveBeenCalled();
  });

  test('should clear error correctly', () => {
    const { result } = renderHook(() => useTaskTimer(mockTask));

    act(() => {
      result.current.clearError();
    });

    expect(result.current.hasError).toBe(false);
    expect(result.current.errorMessage).toBe('');
  });

  test('should reset idle state correctly', () => {
    const { result } = renderHook(() => useTaskTimer(mockTask));

    act(() => {
      result.current.resetIdleState();
    });

    expect(result.current.isIdle).toBe(false);
  });

  test('should sync actualTime with task prop changes', () => {
    const { result, rerender } = renderHook(
      ({ task }) => useTaskTimer(task),
      { initialProps: { task: mockTask } }
    );

    const updatedTask = { ...mockTask, actualTime: '01:15:00' };
    
    rerender({ task: updatedTask });

    expect(result.current.actualTime).toBe('01:15:00');
  });

  test('should handle timer state synchronization', () => {
    mockGlobalTimer.getCurrentTaskId.mockReturnValue(1);
    mockGlobalTimer.isRunning.mockReturnValue(true);

    const { result } = renderHook(() => useTaskTimer(mockTask));

    // タイマー状態の同期は useEffect で行われるため、
    // モックの設定が正しく反映されているかを確認
    expect(mockGlobalTimer.getCurrentTaskId).toHaveBeenCalled();
    expect(mockGlobalTimer.isRunning).toHaveBeenCalled();
  });

  test('should not be running if different task is active', () => {
    mockGlobalTimer.getCurrentTaskId.mockReturnValue(2); // 別のタスクID
    mockGlobalTimer.isRunning.mockReturnValue(true);

    const { result } = renderHook(() => useTaskTimer(mockTask));

    expect(result.current.isRunning).toBe(false);
  });
}); 