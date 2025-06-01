// 時間を "HH:mm:ss" 形式に変換
export const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// "HH:mm:ss" 形式の文字列を秒数に変換
export const parseTime = (timeString) => {
  const [hours, minutes, seconds] = timeString.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
};

// 時間の加算（"HH:mm:ss" + seconds → "HH:mm:ss"）
export const addSeconds = (timeString, seconds) => {
  const totalSeconds = parseTime(timeString) + seconds;
  return formatTime(totalSeconds);
}; 