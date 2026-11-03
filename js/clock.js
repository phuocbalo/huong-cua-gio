// Đồng hồ game: lấy giờ máy làm gốc nhưng không bao giờ cho thời gian game chạy lùi.
//
// - gameTime: tổng thời gian game đã trôi qua (kể cả lúc tắt game). Chỉ tăng.
//   Cây và vật nuôi sau này tính tiến độ theo gameTime, nên lùi giờ máy không làm mất tiến độ.
// - Mỗi giây, đồng hồ cộng phần giờ máy đã trôi từ lần trước. Nếu giờ máy bị lùi (phần trôi âm),
//   phần đó bị bỏ qua và được ghi lại để kiểm thử.
// - Chỉnh giờ máy tiến lên thì thời gian vẫn được cộng: game offline nên chấp nhận, theo kế hoạch.

const TICK_MS = 1000;
const SAVE_EVERY_MS = 15000;   // ghi lastSeen vào bản lưu định kỳ, ngoài lần lưu khi rời game
const AWAY_MIN_MS = 60000;     // vắng dưới 1 phút thì không tính là "đi vắng"

export class GameClock {
  constructor(store) {
    this.store = store;
    this.listeners = new Set();
    this.timer = 0;
    this.sinceSave = 0;
  }

  get state() { return this.store.data.clock; }
  get gameTime() { return this.state.gameTime; }

  // Gọi một lần khi mở game. Trả về { away, rewound } để báo cho người chơi.
  start() {
    const r = this.advance();
    this.timer = setInterval(() => this.advance(), TICK_MS);
    document.addEventListener('visibilitychange', () => {
      // Rời game: chốt thời gian rồi lưu. Quay lại: cộng phần đã vắng.
      const res = this.advance();
      if (document.visibilityState === 'hidden') this.store.flush();
      else if (res.away >= AWAY_MIN_MS || res.rewound) this.emit('return', res);
    });
    return r;
  }

  // Cộng phần thời gian đã trôi từ lần trước, bỏ qua nếu giờ máy bị lùi.
  advance() {
    const c = this.state;
    const now = Date.now();
    let delta = now - c.lastSeen;
    let rewound = false;
    if (delta < 0) {
      rewound = true;
      c.rewinds += 1;
      c.lastRewind = -delta;
      delta = 0;
    }
    c.gameTime += delta;
    c.lastSeen = now;
    if (delta >= AWAY_MIN_MS) c.lastAway = delta;

    this.sinceSave += delta > TICK_MS * 5 ? 0 : delta;
    if (rewound || delta >= AWAY_MIN_MS || this.sinceSave >= SAVE_EVERY_MS) {
      this.sinceSave = 0;
      this.store.markDirty();
    }
    this.emit('tick', { delta, rewound });
    return { away: delta, rewound };
  }

  on(fn) { this.listeners.add(fn); }
  emit(type, data) { this.listeners.forEach(fn => fn(type, data)); }
}
