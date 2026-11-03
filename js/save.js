// Lưu dữ liệu game trong máy người chơi (IndexedDB). Không có tài khoản, không gửi đi đâu.
//
// Cả game chỉ có MỘT bản lưu. Bản lưu có số phiên bản (schemaVersion): khi sau này thêm dữ liệu mới,
// tăng SCHEMA_VERSION và viết thêm một bước nâng cấp trong MIGRATIONS để bản lưu cũ của người chơi
// được nâng lên mà không mất gì.

import { START_BOXES, START_COINS, START_INVENTORY, INVENTORY_SLOTS } from './config.js';

export const SCHEMA_VERSION = 1;

const DB_NAME = 'san-thuong-xanh';
const STORE = 'saves';
const KEY = 'main';
const DEBOUNCE_MS = 400;

// Bản lưu của người chơi mới
export function defaultSave(now = Date.now()) {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    savedAt: 0,
    coins: START_COINS,
    clock: {
      lastSeen: now,      // giờ máy lần cuối game còn mở
      gameTime: 0,        // tổng thời gian game đã chạy, chỉ tăng, không bao giờ giảm
      lastAway: 0,        // độ dài lần vắng gần nhất
      rewinds: 0,         // số lần phát hiện giờ máy bị lùi
      lastRewind: 0       // lần lùi gần nhất lùi bao nhiêu
    },
    inventory: { slots: INVENTORY_SLOTS, items: { ...START_INVENTORY } },
    boxes: Array.from({ length: START_BOXES }, () => ({ crop: null })),
    tutorialDone: false,
    settings: { music: 0.6, sfx: 0.8 }
  };
}

// Các bước nâng cấp bản lưu. Khóa = phiên bản cũ, hàm trả về bản lưu ở phiên bản kế tiếp.
// Ví dụ khi lên phiên bản 2:  1: s => ({ ...s, schemaVersion: 2, animals: [] })
const MIGRATIONS = {};

export function migrate(s) {
  let cur = s;
  while (cur.schemaVersion < SCHEMA_VERSION) {
    const step = MIGRATIONS[cur.schemaVersion];
    if (!step) throw new Error('Thiếu bước nâng cấp bản lưu từ phiên bản ' + cur.schemaVersion);
    cur = step(cur);
  }
  return cur;
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('no-indexeddb')); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('blocked'));
  });
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    let result;
    const r = fn(store);
    if (r) r.onsuccess = () => { result = r.result; };
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export class SaveStore {
  constructor() {
    this.db = null;
    this.data = null;
    this.storage = 'memory';   // 'idb' khi lưu được trong máy
    this.timer = 0;
    this.listeners = new Set();
  }

  // Mở kho và đọc bản lưu; chưa có thì tạo bản mới. Luôn trả về dữ liệu dùng được.
  async load() {
    try {
      this.db = await openDb();
      this.storage = 'idb';
      const saved = await tx(this.db, 'readonly', s => s.get(KEY));
      this.data = saved ? migrate(saved) : defaultSave();
      if (!saved) await this.flush();
    } catch (e) {
      console.warn('Không mở được nơi lưu, chơi tạm không lưu:', e);
      this.storage = 'memory';
      this.data = defaultSave();
    }
    // Lưu ngay khi người chơi rời khỏi game (chuyển app, khóa máy, đóng tab)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') this.flush(); });
    window.addEventListener('pagehide', () => this.flush());
    return this.data;
  }

  // Báo có thay đổi: gom các thay đổi liên tiếp rồi lưu một lần.
  markDirty() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), DEBOUNCE_MS);
  }

  // Lưu ngay. Dùng sau các hành động quan trọng (gieo, thu, mua, bán).
  async flush() {
    clearTimeout(this.timer);
    if (!this.data) return false;
    this.data.savedAt = Date.now();
    if (this.storage !== 'idb') { this.emit(); return false; }
    try {
      await tx(this.db, 'readwrite', s => s.put(this.data, KEY));
      this.emit();
      return true;
    } catch (e) {
      console.warn('Lưu thất bại:', e);
      this.storage = 'memory';
      this.emit('failed');
      return false;
    }
  }

  // Xóa sạch và bắt đầu lại
  async reset() {
    this.data = defaultSave();
    await this.flush();
    return this.data;
  }

  onChange(fn) { this.listeners.add(fn); }
  emit(ev) { this.listeners.forEach(fn => fn(ev)); }
}
