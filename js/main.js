// Điểm khởi động: đọc bản lưu → chạy đồng hồ → dựng giao diện → vẽ cảnh → bật chơi offline.
// File này nối các phần với nhau; luật chơi nằm trong farm.js và inventory.js.

import { SaveStore } from './save.js';
import { GameClock } from './clock.js';
import { UI } from './ui.js';
import { Pwa } from './pwa.js';
import { createGame } from './scene.js';
import { ITEMS } from './config.js';
import { T, fmt } from './text.vi.js';
import { duration } from './util.js';
import { CROP_COLOR } from './icons.js';
import * as farm from './farm.js';
import * as inv from './inventory.js';

const AWAY_NOTICE_MS = 60000;

async function boot() {
  const store = new SaveStore();
  await store.load();
  const state = () => store.data;   // store.reset() thay cả đối tượng, nên luôn đọc qua hàm này

  const clock = new GameClock(store);
  const pwa = new Pwa();
  let game = null, scene = null;

  const cropName = crop => T['crop_' + crop].toLowerCase();
  const now = () => clock.gameTime;

  // Vẽ lại các thùng theo trạng thái hiện tại
  function renderBoxes() {
    if (!scene) return;
    const t = now();
    state().boxes.forEach((b, i) => scene.setBox(i, {
      crop: b.crop,
      stage: farm.stageOf(b),
      dry: farm.isDry(b, t),
      ripe: farm.isRipe(b)
    }));
  }

  // ----- Hành động của người chơi -----
  function waterBox(i, quiet) {
    const b = state().boxes[i];
    const r = farm.water(b, now());
    if (r.ok && scene) scene.waterFx(i);
    if (r.ok && !quiet) ui.toast(fmt(T.watered_one, { crop: cropName(b.crop) }));
    return r.ok;
  }

  function onTapBox(i) {
    const s = state(), b = s.boxes[i], t = now();
    farm.update(b, t);
    if (!b.crop) { ui.openSeedPicker(i); return; }

    if (farm.isRipe(b)) {
      const crop = b.crop;
      const r = farm.harvest(s, i, t);
      if (!r.ok) { ui.toast(T.harvest_full); return; }
      const tg = ui.bagTarget();
      if (scene) scene.harvestFx(i, CROP_COLOR[crop], r.qty, tg.x, tg.y);
      ui.toast(fmt(T.harvested, { qty: r.qty, item: T['item_' + crop].toLowerCase() }) + (s.boxes[i].crop ? '' : ' ' + T.harvest_last));
      store.flush();
    } else if (farm.isDry(b, t)) {
      waterBox(i, false);
      store.flush();
    } else {
      const msg = b.regrowing ? T.box_regrowing : T.box_occupied;
      const name = T['crop_' + b.crop];
      ui.toast(fmt(msg, { crop: b.regrowing ? name : cropName(b.crop), time: duration(farm.timeLeft(b, t)) }));
    }
    renderBoxes();
    ui.refreshOpenSheets();
  }

  function onPlant(i, seedId) {
    const s = state();
    const r = farm.plant(s, i, seedId, now());
    if (!r.ok) {
      if (r.reason === 'occupied') {
        const b = s.boxes[i];
        ui.toast(fmt(T.box_occupied, { crop: cropName(b.crop), time: duration(farm.timeLeft(b, now())) }));
      }
      return;
    }
    const crop = ITEMS[seedId].crop;
    if (scene) scene.plantFx(i);
    ui.toast(fmt(T.planted, { crop: cropName(crop), time: duration(farm.timeLeft({ ...s.boxes[i], wateredUntil: Infinity }, now())) }));
    store.flush();
    renderBoxes();
  }

  function onWaterAll() {
    const t = now();
    let n = 0, last = null;
    state().boxes.forEach((b, i) => { farm.update(b, t); if (farm.isDry(b, t) && waterBox(i, true)) { n++; last = b.crop; } });
    if (n === 0) ui.toast(T.water_nothing);
    else ui.toast(n === 1 ? fmt(T.watered_one, { crop: cropName(last) }) : fmt(T.watered_many, { n }));
    if (n) store.flush();
    renderBoxes();
  }

  // ----- Công cụ kiểm thử (chỉ trong bản thử) -----
  function onSkip(ms) {
    clock.skip(ms);
    ui.toast(fmt(T.skipped, { time: duration(ms) }));
  }
  function onAddSeeds() {
    const items = state().inventory;
    let all = true;
    Object.keys(ITEMS).filter(id => ITEMS[id].kind === 'seed').forEach(id => { if (!inv.add(items, id, 3)) all = false; });
    ui.toast(all ? T.seeds_added : T.seeds_full);
    store.flush();
    ui.refreshOpenSheets();
  }

  const ui = new UI({
    store, clock, pwa,
    onFrameResize: () => { if (game) game.scale.refresh(); },
    onPeriodChange: p => { if (scene) scene.applyPeriod(p); },
    onWaterAll, onPlant, onSkip, onAddSeeds
  });
  ui.init();

  // Mỗi nhịp đồng hồ: cây lớn theo thời gian game
  clock.on(type => {
    if (type !== 'tick') return;
    farm.updateAll(state(), now());
    renderBoxes();
  });

  // Bắt đầu đồng hồ: tính phần thời gian đã trôi khi game tắt
  const first = clock.start();
  const notify = r => {
    if (r.rewound) ui.toast(T.clock_rewound);
    else if (r.away >= AWAY_NOTICE_MS) ui.toast(fmt(T.welcome_back, { time: duration(r.away) }));
  };
  clock.on((type, r) => { if (type === 'return') notify(r); });

  // Xóa dữ liệu thì vẽ lại thùng
  store.onChange(() => renderBoxes());

  game = createGame({
    onReady: s => {
      scene = s;
      ui.hideBoot();
      ui.forcePeriod();
      renderBoxes();
      notify(first);
    },
    onTapBox,
    onTapCoop: () => ui.toast(T.soon_coop)
  });

  window.addEventListener('offline', () => ui.toast(T.went_offline));
  pwa.register(firstInstall => { if (firstInstall) ui.toast(T.offline_ready); });

  // Cửa sổ kiểm thử cho người phát triển (gõ trong console): __game.store.data
  window.__game = { store, clock, ui, pwa, farm };
}

boot();
