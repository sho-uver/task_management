/**
 * Integration tests for timer and task management
 */

import { formatTime, parseTime, PrecisionTimer } from '../timer';

describe('Integration Tests', () => {
  describe('Timer and Time Utilities Integration', () => {
    test('should integrate timer with time formatting', () => {
      const timer = new PrecisionTimer();
      
      // タイマーを開始
      timer.start(1, 3600); // 1時間
      
      // 現在の時間を取得してフォーマット
      const totalSeconds = timer.getTotalSeconds();
      const formattedTime = formatTime(totalSeconds);
      
      expect(formattedTime).toBe('01:00:00');
      
      // 停止
      timer.stop();
    });

    test('should handle time parsing and formatting round trip', () => {
      const originalTime = '02:30:45';
      const parsedSeconds = parseTime(originalTime);
      const formattedTime = formatTime(parsedSeconds);
      
      expect(formattedTime).toBe(originalTime);
    });

    test('should handle timer state transitions correctly', () => {
      const timer = new PrecisionTimer();
      
      // 初期状態
      expect(timer.isRunning()).toBe(false);
      expect(timer.getCurrentTaskId()).toBe(null);
      
      // 開始
      timer.start(1, 0);
      expect(timer.isRunning()).toBe(true);
      expect(timer.getCurrentTaskId()).toBe(1);
      
      // 一時停止
      timer.pause();
      expect(timer.isRunning()).toBe(false);
      expect(timer.getCurrentTaskId()).toBe(1);
      
      // 再開
      timer.resume();
      expect(timer.isRunning()).toBe(true);
      
      // 停止
      timer.stop();
      expect(timer.isRunning()).toBe(false);
      expect(timer.getCurrentTaskId()).toBe(null);
    });

    test('should handle error scenarios gracefully', () => {
      // 無効な時間フォーマット
      expect(() => parseTime('invalid')).toThrow();
      
      // タイマーの無効な操作
      const timer = new PrecisionTimer();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      timer.pause(); // 実行中でない時の一時停止
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Tests', () => {
    test('should handle rapid timer operations', () => {
      const timer = new PrecisionTimer();
      
      // 短時間での開始/停止
      for (let i = 0; i < 10; i++) {
        timer.start(i, 0);
        timer.stop();
      }
      
      expect(timer.isRunning()).toBe(false);
    });

    test('should format time efficiently', () => {
      const start = performance.now();
      
      // 大量の時間フォーマット処理
      for (let i = 0; i < 1000; i++) {
        formatTime(i * 60); // 0分から1000分まで
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // 1秒以内で完了することを確認
      expect(duration).toBeLessThan(1000);
    });
  });
}); 