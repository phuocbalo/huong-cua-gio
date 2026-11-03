// Lưu dữ liệu game trong máy người chơi (IndexedDB). Không có tài khoản, không gửi đi đâu.
//
// Cả game chỉ có MỘT bản lưu. Bản lưu có số phiên bản (schemaVersion): khi sau này thêm dữ liệu mới,
// tăng SCHEMA_VERSION và viết thêm một bước nâng cấp trong MIGRATIONS để bản lưu cũ của người chơi
// được nâng lên mà không mất gì.

import { START_BOXES, START_COINS, START_INVENTORY, INVENTORY_SLOTS, START_FEED_FOR_OLD_SAVES, FEED_ITEM, LEVELS } from './config.js';
import { newCoop } from './coop.js';
import { newDust } from './dust.js';
import { newOrders, newFriends, syncSeen } from './orders.js';
import * as inv from './inventory.js';

export const SCHEMA_VERSION = 7;

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
    coop: newCoop(),
    dust: newDust(0),
    orders: newOrders(),   // đơn được ghim khi game mở (orders.refill)
    friends: newFriends(),
    seen: [],
    bagUpgrades: 0,
    xp: 0,              // điểm kinh nghiệm (bản 0.10)
    level: 1,           // level cao nhất đã nhận quà
    decor: [],          // món trang trí đã mở
    tutorialDone: false,
    tutorial: { step: 'intro', box: null },
    settings: { music: 0.6, sfx: 0.8, testMode: false },
    stats: { days: [], sessions: 0, playMs: 0 }
  };
}

// Các bước nâng cấp bản lưu. Khóa = phiên bản cũ, hàm trả về bản lưu ở phiên bản kế tiếp.
const MIGRATIONS = {
  // 1 → 2 (bản 0.6, chặng 3): mở chuồng gà, tặng thức ăn để người chơi cũ cho gà ăn được ngay
  1: s => {
    const next = { ...s, schemaVersion: 2, coop: newCoop(), inventory: { ...s.inventory, items: { ...s.inventory.items } } };
    inv.add(next.inventory, FEED_ITEM, START_FEED_FOR_OLD_SAVES);   // túi đầy thì thôi, không lỗi
    return next;
  },
  // 2 → 3 (bản 0.7): bụi bám sân thượng; lần đầu sau 3–4 ngày kể từ lúc cập nhật
  2: s => ({ ...s, schemaVersion: 3, dust: newDust((s.clock && s.clock.gameTime) || 0) }),
  // 3 → 4 (bản 0.8, chặng 4): đơn hàng hàng xóm, điểm thân thiết, nâng cấp túi đồ
  3: s => {
    const next = { ...s, schemaVersion: 4, orders: newOrders(), friends: newFriends(), seen: [], bagUpgrades: 0 };
    syncSeen(next);   // những món người chơi cũ đã có sẽ được đặt hàng ngay
    return next;
  },
  // 4 → 5 (bản 0.8.1): thêm 5 hàng xóm mở dần, đơn có mốc thời gian để tự đổi sau 3 ngày
  4: s => {
    const now = (s.clock && s.clock.gameTime) || 0;
    const orders = { ...s.orders, delivered: (s.orders && s.orders.delivered) || 0,
      list: ((s.orders && s.orders.list) || []).map(o => ({ ...o, createdAt: o.createdAt ?? now })) };
    return { ...s, schemaVersion: 5, orders, friends: { ...newFriends(), ...(s.friends || {}) } };
  },
  // 5 → 6 (bản 0.9, chặng 5): cài đặt, hướng dẫn bà Tư, thống kê chơi thử.
  // Bản lưu cũ đều là của người làm game và người kiểm thử: bỏ qua hướng dẫn, bật sẵn công cụ kiểm thử.
  5: s => ({
    ...s, schemaVersion: 6,
    tutorialDone: true, tutorial: { step: 'done', box: null },
    settings: { music: 0.6, sfx: 0.8, ...(s.settings || {}), testMode: true },
    stats: { days: [], sessions: 0, playMs: 0 }
  }),
  // 6 → 7 (bản 0.10): thêm level. Người chơi cũ được xếp level theo tiến độ đã có, để giữ những
  // hàng xóm đã quen (trước đây mở theo số đơn đã giao) và việc đã mua thùng. Không nhận lại quà của các level đó.
  6: s => {
    const d = (s.orders && s.orders.delivered) || 0;
    let lv = d >= 20 ? 10 : d >= 15 ? 9 : d >= 10 ? 8 : d >= 6 ? 6 : d >= 3 ? 4 : 1;
    if (lv < 2 && (s.boxes || []).length > 4) lv = 2;   // bản cũ bắt đầu với 4 thùng
    if (lv < 5 && (s.bagUpgrades || 0) > 0) lv = 5;
    const coop = s.coop && lv >= 8 ? { ...s.coop, chickens: s.coop.chickens + 1 } : s.coop;
    return { ...s, schemaVersion: 7, xp: LEVELS[lv - 1].xp, level: lv, decor: lv >= 10 ? ['hoa_giay'] : [], coop };
  }
};

// ----- F21 Nhập file lưu (N04) -----
// Kiểm tra file người chơi chọn: đúng là bản lưu của game, không mới hơn bản game đang chạy.
// Trả về { ok, data, summary } hoặc { ok: false, reason: 'not_json' | 'not_save' | 'newer' }
export function validateImport(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { return { ok: false, reason: 'not_json' }; }
  const looksLikeSave = obj && typeof obj === 'object' && obj.app === 'san-thuong-xanh' && obj.save && typeof obj.save === 'object';
  const s = looksLikeSave ? obj.save : null;
  if (!s || !Number.isInteger(s.schemaVersion) || !s.inventory || !Array.isArray(s.boxes) || !s.clock) return { ok: false, reason: 'not_save' };
  if (s.schemaVersion > SCHEMA_VERSION) return { ok: false, reason: 'newer' };
  let data;
  try { data = migrate(JSON.parse(JSON.stringify(s))); } catch (e) { return { ok: false, reason: 'not_save' }; }
  return { ok: true, data, summary: { coins: data.coins, boxes: data.boxes.length, savedAt: data.savedAt || obj.exportedAt || 0 } };
}

// Gói bản lưu thành nội dung file để người chơi tải về
export function exportText(data, now = Date.now()) {
  return JSON.stringify({ app: 'san-thuong-xanh', exportedAt: now, save: data }, null, 1);
}

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
      // Bản lưu mới, hoặc vừa nâng cấp từ phiên bản cũ: ghi lại ngay
      if (!saved || saved.schemaVersion !== this.data.schemaVersion) await this.flush();
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

  // Thay toàn bộ bằng bản lưu nhập từ file (đã qua validateImport)
  async replace(data) {
    this.data = data;
    // Coi như vừa mở game lúc này, để không tính khoảng thời gian từ lúc xuất file là "đi vắng"
    this.data.clock.lastSeen = Date.now();
    await this.flush();
    return this.data;
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
