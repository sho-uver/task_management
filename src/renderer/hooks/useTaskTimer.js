import { useState, useEffect, useCallback } from 'react';
import { ipcRenderer } from 'electron';
import { addSeconds } from '../utils/timer';
import idleDetector from '../utils/idleDetector';

export function useTaskTimer(task) {
  const [isRunning, setIsRunning] = useState(false);
  const [actualTime, setActualTime] = useState(task.actualTime);

  // タイマーの開始
  const startTimer = useCallback(() => {
    setIsRunning(true);
    idleDetector.start();
  }, []);

  // タイマーの停止
  const stopTimer = useCallback(() => {
    setIsRunning(false);
    idleDetector.stop();
  }, []);

  // 作業時間の更新
  const updateTime = useCallback(async (newTime) => {
    setActualTime(newTime);
    await ipcRenderer.invoke('update-task-time', task.id, newTime);
  }, [task.id]);

  // タイマーのメインロジック
  useEffect(() => {
    let intervalId = null;

    if (isRunning) {
      intervalId = setInterval(() => {
        setActualTime(prevTime => {
          const newTime = addSeconds(prevTime, 1);
          updateTime(newTime);
          return newTime;
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
    const unsubscribe = idleDetector.onIdleChange((isIdle) => {
      if (isIdle && isRunning) {
        stopTimer();
      }
    });

    return () => {
      unsubscribe();
      idleDetector.stop();
    };
  }, [isRunning, stopTimer]);

  return {
    isRunning,
    actualTime,
    startTimer,
    stopTimer
  };
} 