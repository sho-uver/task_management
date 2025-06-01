import { ipcRenderer } from 'electron';

class IdleDetector {
  constructor(idleThreshold = 300000) { // デフォルト5分
    this.idleThreshold = idleThreshold;
    this.callbacks = new Set();
    this.isIdle = false;
    this.checkInterval = null;
  }

  start() {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(async () => {
      const idleTime = await ipcRenderer.invoke('get-system-idle-time');
      const wasIdle = this.isIdle;
      this.isIdle = idleTime >= this.idleThreshold;

      if (wasIdle !== this.isIdle) {
        this.notifyCallbacks();
      }
    }, 1000);
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  onIdleChange(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  notifyCallbacks() {
    this.callbacks.forEach(callback => callback(this.isIdle));
  }
}

export default new IdleDetector(); 