/**
 * 時間を "HH:mm:ss" 形式に変換
 * @param seconds 秒数
 * @returns "HH:mm:ss" 形式の文字列
 */
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/**
 * "HH:mm:ss" 形式の文字列を秒数に変換
 * @param timeString "HH:mm:ss" 形式の時間文字列
 * @returns 秒数
 * @throws {Error} 不正な形式の場合
 */
export const parseTime = (timeString: string): number => {
  if (!timeString || typeof timeString !== 'string') {
    throw new Error('Invalid time string format');
  }

  const parts = timeString.split(':');
  if (parts.length !== 3) {
    throw new Error('Time string must be in HH:mm:ss format');
  }

  const [hours, minutes, seconds] = parts.map(Number);
  
  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
    throw new Error('Invalid time values');
  }

  if (hours < 0 || minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) {
    throw new Error('Invalid time range');
  }

  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * 時間の加算（"HH:mm:ss" + seconds → "HH:mm:ss"）
 * @param timeString 基準となる時間文字列 ("HH:mm:ss" 形式)
 * @param seconds 加算する秒数
 * @returns 加算後の時間文字列 ("HH:mm:ss" 形式)
 */
export const addSeconds = (timeString: string, seconds: number): string => {
  const totalSeconds = parseTime(timeString) + Math.max(0, seconds);
  return formatTime(totalSeconds);
}; 