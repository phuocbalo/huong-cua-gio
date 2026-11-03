// Điểm khởi động: đọc bản lưu → chạy đồng hồ → dựng giao diện → vẽ cảnh → bật chơi offline.

import { SaveStore } from './save.js';
import { GameClock } from './clock.js';
import { UI } from './ui.js';
import { Pwa } from './pwa.js';
import { createGame } from './scene.js';
import { T, fmt } from './text.vi.js';
import { duration } from './util.js';

const AWAY_NOTICE_MS = 60000;

async function boot() {
  const store = new SaveStore();
  await store.load();

  const clock = new GameClock(store);
  const pwa = new Pwa();
  let game = null, scene = null;

  const ui = new UI({
    store, clock, pwa,
    onFrameResize: () => { if (game) game.scale.refresh(); },
    onPeriodChange: p => { if (scene) scene.applyPeriod(p); }
  });
  ui.init();

  // Bắt đầu đồng hồ: tính phần thời gian đã trôi khi game tắt
  const first = clock.start();
  const notify = r => {
    if (r.rewound) ui.toast(T.clock_rewound);
    else if (r.away >= AWAY_NOTICE_MS) ui.toast(fmt(T.welcome_back, { time: duration(r.away) }));
  };
  clock.on((type, r) => { if (type === 'return') notify(r); });

  game = createGame({
    onReady: s => {
      scene = s;
      ui.hideBoot();
      ui.forcePeriod();
      notify(first);
    },
    onTapBox: () => ui.toast(T.soon_box),
    onTapCoop: () => ui.toast(T.soon_coop)
  });

  window.addEventListener('offline', () => ui.toast(T.went_offline));
  pwa.register(firstInstall => { if (firstInstall) ui.toast(T.offline_ready); });

  // Cửa sổ kiểm thử cho người phát triển (gõ trong console): __game.store.data
  window.__game = { store, clock, ui, pwa };
}

boot();
