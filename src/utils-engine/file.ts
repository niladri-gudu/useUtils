export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatSpeed = (bytesPerSec: number): string => {
  if (bytesPerSec === 0) return '0 B/s';
  const k = 1024;
  if (bytesPerSec < k * k) {
    return (bytesPerSec / k).toFixed(1) + ' KB/s';
  }
  return (bytesPerSec / (k * k)).toFixed(1) + ' MB/s';
};

export const formatEta = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return '--:--';
  if (seconds < 60) return Math.ceil(seconds) + 's';
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return `${m}m ${s}s`;
};
