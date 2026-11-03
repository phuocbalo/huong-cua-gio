// Cài bộ nhớ offline (service worker) và theo dõi trạng thái để hiện trong bảng thông tin.

export class Pwa {
  constructor() {
    this.state = 'preparing';   // preparing | ready | failed | unsupported
    this.version = '';
    this.firstInstall = false;
  }

  isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }

  // onReady(firstInstall) được gọi khi game đã lưu xong vào máy
  async register(onReady) {
    const allowed = location.protocol === 'https:' || location.hostname === 'localhost';
    if (!('serviceWorker' in navigator) || !allowed) { this.state = 'unsupported'; return; }
    try {
      this.firstInstall = !navigator.serviceWorker.controller;
      await navigator.serviceWorker.register('sw.js');
      const ready = await navigator.serviceWorker.ready;
      this.state = 'ready';
      this.version = await this.askVersion(ready.active);
      if (onReady) onReady(this.firstInstall);
    } catch (e) {
      console.warn('Không bật được chơi offline:', e);
      this.state = 'failed';
    }
  }

  askVersion(worker) {
    return new Promise(resolve => {
      if (!worker) { resolve(''); return; }
      const ch = new MessageChannel();
      const t = setTimeout(() => resolve(''), 2000);
      ch.port1.onmessage = e => { clearTimeout(t); resolve(e.data); };
      worker.postMessage('version', [ch.port2]);
    });
  }
}
