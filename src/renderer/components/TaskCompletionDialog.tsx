import React, { useState, useCallback } from 'react';
import { Task } from '../../shared/types';
import { parseTime, formatTime } from '../utils/timer';

/**
 * タスク完了確認ダイアログのプロパティ
 */
interface TaskCompletionDialogProps {
  /** 完了対象のタスク */
  task: Task;
  /** 完了確定時のコールバック */
  onComplete: (task: Task) => void;
  /** キャンセル時のコールバック */
  onCancel: () => void;
  /** ダイアログの表示状態 */
  isOpen: boolean;
}

/**
 * タスク完了確認ダイアログコンポーネント
 */
const TaskCompletionDialog: React.FC<TaskCompletionDialogProps> = ({
  task,
  onComplete,
  onCancel,
  isOpen
}) => {
  const [isCompleting, setIsCompleting] = useState(false);

  /**
   * 完了処理の実行
   */
  const handleComplete = useCallback(async (): Promise<void> => {
    try {
      setIsCompleting(true);
      await onComplete(task);
    } catch (error) {
      console.error('Failed to complete task:', error);
    } finally {
      setIsCompleting(false);
    }
  }, [task, onComplete]);

  /**
   * キャンセル処理
   */
  const handleCancel = useCallback((): void => {
    if (!isCompleting) {
      onCancel();
    }
  }, [isCompleting, onCancel]);

  /**
   * 効率性の計算
   */
  const calculateEfficiency = useCallback((): number => {
    try {
      const actualSeconds = parseTime(task.actualTime);
      const estimatedSeconds = parseTime(task.estimatedTime);
      
      if (estimatedSeconds === 0) return 0;
      return (estimatedSeconds / actualSeconds) * 100;
    } catch (error) {
      return 0;
    }
  }, [task.actualTime, task.estimatedTime]);

  /**
   * 時間差の計算
   */
  const calculateTimeDifference = useCallback((): { 
    difference: number; 
    isOvertime: boolean; 
    formattedDifference: string;
  } => {
    try {
      const actualSeconds = parseTime(task.actualTime);
      const estimatedSeconds = parseTime(task.estimatedTime);
      const difference = actualSeconds - estimatedSeconds;
      const isOvertime = difference > 0;
      const formattedDifference = formatTime(Math.abs(difference));
      
      return { difference, isOvertime, formattedDifference };
    } catch (error) {
      return { difference: 0, isOvertime: false, formattedDifference: '00:00:00' };
    }
  }, [task.actualTime, task.estimatedTime]);

  if (!isOpen) {
    return null;
  }

  const efficiency = calculateEfficiency();
  const { isOvertime, formattedDifference } = calculateTimeDifference();

  return (
    <div className="dialog-overlay" onClick={handleCancel}>
      <div className="task-completion-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>タスク完了確認</h3>
        </div>
        
        <div className="dialog-content">
          <div className="task-summary">
            <h4 className="task-title">{task.title}</h4>
            
            <div className="time-summary">
              <div className="time-row">
                <span className="time-label">見積時間:</span>
                <span className="time-value estimated">{task.estimatedTime}</span>
              </div>
              <div className="time-row">
                <span className="time-label">実績時間:</span>
                <span className="time-value actual">{task.actualTime}</span>
              </div>
              <div className="time-row">
                <span className="time-label">差分:</span>
                <span className={`time-value difference ${isOvertime ? 'overtime' : 'undertime'}`}>
                  {isOvertime ? '+' : '-'}{formattedDifference}
                </span>
              </div>
            </div>
            
            <div className="efficiency-summary">
              <div className="efficiency-row">
                <span className="efficiency-label">効率性:</span>
                <span className={`efficiency-value ${efficiency >= 100 ? 'good' : efficiency >= 80 ? 'average' : 'poor'}`}>
                  {efficiency.toFixed(1)}%
                </span>
              </div>
              <div className="efficiency-description">
                {efficiency >= 120 ? '素晴らしい効率です！' :
                 efficiency >= 100 ? '見積もり通りに完了しました' :
                 efficiency >= 80 ? 'ほぼ見積もり通りです' :
                 efficiency >= 60 ? '見積もりより時間がかかりました' :
                 '見積もりの見直しを検討してください'}
              </div>
            </div>
          </div>
          
          <div className="completion-note">
            <p>このタスクを完了すると、統計情報が保存され、アクティブなタスクリストから削除されます。</p>
            <p>完了したタスクは履歴から確認できます。</p>
          </div>
        </div>
        
        <div className="dialog-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={handleCancel}
            disabled={isCompleting}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="complete-button"
            onClick={handleComplete}
            disabled={isCompleting}
          >
            {isCompleting ? '完了中...' : 'タスクを完了'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TaskCompletionDialog); 