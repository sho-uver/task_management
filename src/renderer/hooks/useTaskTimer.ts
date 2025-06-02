import { useState, useEffect, useCallback } from 'react';
import { ipcRenderer } from 'electron';
import { addSeconds } from '../utils/timer';
import idleDetector from '../utils/idleDetector';
import { Task } from '../../shared/types';

/**
 * タスクタイマーフックの戻り値の型
 */
interface UseTaskTimerReturn {
  /** タイマーが実行中かどうか */
  isRunning: boolean;
  /** 現在の実績時間 */
  actualTime: string;
  /** タイマーを開始する関数 */
  startTimer: () => void;
  /** タイマーを停止する関数 */
  stopTimer: () => void;
}

/**
 * タスクの作業時間を管理するカスタムフック
 * @param task 対象のタスク
 * @returns タイマーの状態と操作関数
 */
export function useTaskTimer(task: Task): UseTaskTimerReturn {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [actualTime, setActualTime] = useState<string>(task.actualTime);

  /**
   * タイマーの開始
   */
  const startTimer = useCallback((): void => {
    setIsRunning(true);
    idleDetector.start();
  }, []);

  /**
   * タイマーの停止
   */
  const stopTimer = useCallback((): void => {
    setIsRunning(false);
    idleDetector.stop();
  }, []);

  /**
   * 作業時間の更新
   * @param newTime 新しい時間文字列
   */
  const updateTime = useCallback(async (newTime: string): Promise<void> => {
    try {
      setActualTime(newTime);
      await ipcRenderer.invoke('update-task-time', task.id, newTime);
    } catch (error) {
      console.error('Failed to update task time:', error);
    }
  }, [task.id]);

  // タイマーのメインロジック
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isRunning) {
      intervalId = setInterval(() => {
        setActualTime(prevTime => {
          try {
            const newTime = addSeconds(prevTime, 1);
            updateTime(newTime);
            return newTime;
          } catch (error) {
            console.error('Error updating time:', error);
            return prevTime;
          }
        });
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRunning, updateTime]);

  // アイドル検知の処理
  useEffect(() => {
    const unsubscribe = idleDetector.onIdleChange((isIdle: boolean) => {
      if (isIdle && isRunning) {
        console.log('Idle detected, stopping timer');
        stopTimer();
      }
    });

    return () => {
      unsubscribe();
      idleDetector.stop();
    };
  }, [isRunning, stopTimer]);

  // タスクが変更された場合の実績時間の同期
  useEffect(() => {
    setActualTime(task.actualTime);
  }, [task.actualTime]);

  return {
    isRunning,
    actualTime,
    startTimer,
    stopTimer
  };
} 