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
import * as coop from './coop.js';
import * as dust from './dust.js';
import * as shop from './shop.js';
import * as orders from './orders.js';
import { EconomyUI, unitOf, nounOf } from './ui-economy.js';
import { MAX_BOXES } from './config.js';
import { LAY_DELAY } from './config.js';
import { AudioEngine } from './audio.js';
import { SettingsUI } from './ui-settings.js';
import { TutorialUI, restart as restartTutorial } from './tutorial.js';

const AWAY_NOTICE_MS = 60000;         // vắng từ 1 phút: lời chào ngắn
const AWAY_SUMMARY_MS = 5 * 60000;    // vắng từ 5 phút và có thay đổi: bảng "Trong lúc bạn đi vắng"

async function boot() {
  const store = new SaveStore();
  await store.load();
  const state = () => store.data;   // store.reset() thay cả đối tượng, nên luôn đọc qua hàm này

  // Chế độ kiểm thử: bật bằng ?test=1 trên đường dẫn, hoặc chạm 5 lần vào số phiên bản trong Cài đặt
  if (/[?&]test=1\b/.test(location.search)) state().settings.testMode = true;

  // Thống kê chơi thử: số ngày đã mở game (theo ngày thật), số lần mở, tổng thời gian chơi
  const st = state().stats || (state().stats = { days: [], sessions: 0, playMs: 0 });
  const today = new Date().toLocaleDateString('sv-SE');
  st.sessions += 1;
  if (!st.days.includes(today)) st.days = st.days.concat(today).slice(-400);

  // Âm thanh: bật ở lần chạm đầu tiên (trình duyệt không cho phát tiếng trước đó)
  const audio = new AudioEngine(state().settings);
  const unlockAudio = () => audio.unlock();
  document.addEventListener('pointerdown', unlockAudio, { capture: true });
  document.addEventListener('keydown', unlockAudio, { capture: true });
  const sound = name => audio.play(name);

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

  // ----- F20 Trong lúc bạn đi vắng -----
  // Chụp trạng thái các thùng lúc rời game; khi quay lại so sánh để kể cho người chơi nghe
  function snapshot() {
    const t = now();
    const boxes = state().boxes.map(b => ({ crop: b.crop, stage: farm.stageOf(b), ripe: farm.isRipe(b), dry: farm.isDry(b, t) }));
    boxes.eggs = state().coop.eggs;
    boxes.hungry = coop.status(state(), t).key === 'hungry';
    boxes.dust = state().dust.spots.length;
    return boxes;
  }
  function awaySummary(before, away) {
    const t = now(), s = { away, ripe: [], grew: [], dry: [] };
    s.eggs = Math.max(0, state().coop.eggs - (before.eggs || 0));
    s.hungry = coop.status(state(), t).key === 'hungry' && !before.hungry;
    s.dust = state().dust.spots.length > 0 && !before.dust;
    s.expired = expiredSince; expiredSince = 0;
    state().boxes.forEach((b, i) => {
      const a = before[i] || {};
      if (!b.crop || a.crop !== b.crop) return;            // thùng đổi cây trong lúc vắng: bỏ qua
      if (farm.isRipe(b) && !a.ripe) s.ripe.push(b.crop);
      else if (farm.stageOf(b) !== a.stage) s.grew.push(b.crop);
      if (farm.isDry(b, t)) s.dry.push(b.crop);
    });
    return s;
  }
  let lastSnapshot = snapshot();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') lastSnapshot = snapshot(); });

  function greet(r) {
    if (r.rewound) { ui.toast(T.clock_rewound); return; }
    if (r.away < AWAY_NOTICE_MS) return;
    const s = awaySummary(lastSnapshot, r.away);
    lastSnapshot = snapshot();
    if (r.away >= AWAY_SUMMARY_MS && (s.ripe.length || s.grew.length || s.dry.length || s.eggs || s.hungry || s.dust || s.expired)) ui.showAway(s);
    else ui.toast(fmt(T.welcome_back, { time: duration(r.away) }));
  }

  // ----- F05 Nuôi gà -----
  function renderCoop() {
    if (!scene) return;
    const st = coop.status(state(), now());
    scene.setCoop({ eggs: state().coop.eggs, fed: st.key === 'digesting', hungry: st.key === 'hungry' });
  }
  function coopStatusText(prefix) {
    const st = coop.status(state(), now());
    if (st.key === 'hungry') return T[prefix + 'hungry'];
    if (st.key === 'digesting') return fmt(T[prefix + 'digesting'], { time: duration(st.left) });
    return T[prefix + 'done'];
  }
  function onTapTrough() {
    const r = coop.feed(state(), now());
    if (r.ok) {
      if (scene) scene.feedFx();
      sound('feed');
      ui.toast(fmt(T.coop_fed, { time: duration(LAY_DELAY) }));
      store.flush();
      tutor.event('feed');
    } else if (r.reason === 'no_feed') {
      sound('deny');
      ui.toast(T.coop_no_feed);
    } else {
      const st = coop.status(state(), now());
      ui.toast(st.key === 'digesting' ? fmt(T.coop_fed_today, { time: duration(st.left) }) : T.coop_done_today);
    }
    renderCoop();
    ui.refreshOpenSheets();
  }
  function onTapCoop() {
    const r = coop.collect(state(), now());
    if (r.ok) {
      const tg = ui.bagTarget();
      if (scene) scene.eggsFx(r.qty, tg.x, tg.y);
      sound('egg');
      ui.toast(fmt(T.eggs_collected, { n: r.qty }));
      store.flush();
    } else if (r.reason === 'full') {
      sound('deny');
      ui.toast(T.eggs_full);
    } else {
      ui.toast(coopStatusText('coop_empty_'));
    }
    renderCoop();
    ui.refreshOpenSheets();
  }

  // ----- F23 Quét bụi -----
  function renderDust() { if (scene) scene.setDust(state().dust.spots); }
  function onTapDust(spot) {
    const r = dust.sweep(state(), spot, now());
    if (!r.ok) return;
    const tg = ui.coinTarget();
    if (scene) scene.sweepFx(spot, r.reward, tg.x, tg.y);
    sound('sweep');
    setTimeout(() => { ui.refreshCoins(true); sound('coin'); }, 900);
    ui.toast(fmt(r.clean ? T.dust_clean : T.dust_swept, { n: r.reward }));
    store.flush();
    renderDust();
  }

  // ----- Chặng 4: tiệm, đơn hàng, mua thùng -----
  const pickLine = arr => arr[Math.floor(Math.random() * arr.length)];
  // Ghi nhận món đã mở và ghim đủ đơn hàng; trả về true nếu có thay đổi cần lưu
  // delta: thời gian vừa trôi trong nhịp đồng hồ này; lớn nghĩa là người chơi vừa quay lại sau khi vắng
  function syncOrders(delta = 0) {
    const a = orders.syncSeen(state());
    const b = orders.refill(state(), now()) > 0;
    const gone = orders.expire(state(), now());
    if (gone.length) {
      // Hết hạn lúc đang chơi: báo nhẹ. Hết hạn lúc vắng mặt: để bảng "Trong lúc bạn đi vắng" kể
      if (delta < AWAY_NOTICE_MS) toastExpired(gone.length, gone[0].from);
      else { expiredSince += gone.length; lastExpiredFrom = gone[0].from; }
    }
    return a || b || gone.length > 0;
  }
  let expiredSince = 0, lastExpiredFrom = null;
  function toastExpired(n, from) {
    ui.toast(n === 1 ? fmt(T.order_expired_one, { name: T['name_' + from] }) : fmt(T.order_expired_many, { n }));
  }
  // Nút tua trong bản thử: người chơi vẫn đang ở trong game, nên đơn hết hạn trong lúc tua được báo ngay
  // (sau thông báo tua), không dồn sang bảng "Trong lúc bạn đi vắng" của lần vắng sau.
  function reportExpiredAfterSkip() {
    if (!expiredSince) return;
    const n = expiredSince, from = lastExpiredFrom;
    expiredSince = 0;
    setTimeout(() => toastExpired(n, from), 2600);
  }
  function renderOrders() {
    if (!scene) return;
    const list = state().orders.list;
    scene.setOrderNotes(list.length, list.some(o => orders.canDeliver(state(), o)));
  }
  function renderBuySlot() {
    if (!scene) return;
    const n = state().boxes.length;
    // Trong lúc bà Tư hướng dẫn thì ẩn ô mua thùng, xong hướng dẫn mới hiện (I-25)
    const show = n < MAX_BOXES && state().tutorialDone;
    scene.setBuySlot(show ? n : -1, shop.nextBoxPrice(state()));
  }
  function afterTrade() {
    ui.refreshCoins(true);
    eco.refresh();
    ui.refreshOpenSheets();
    renderOrders();
    renderBuySlot();
    store.flush();
  }
  const ecoHandlers = {
    onSell(id, qty) {
      if (!tutor.allows('sell', id)) return;
      const r = shop.sell(state(), id, qty);
      if (!r.ok) return;
      ui.toast(fmt(T.sold, { coins: r.coins, qty, unit: unitOf(id), noun: nounOf(id) }));
      eco.say(pickLine(T.shop_after_sell));
      sound('coin');
      afterTrade();
      tutor.event('sell');
    },
    onBuy(id, qty) {
      const r = shop.buy(state(), id, qty);
      if (!r.ok) return;
      ui.toast(fmt(T.bought, { coins: r.cost, qty, unit: unitOf(id), noun: nounOf(id) }));
      eco.say(pickLine(T.shop_after_buy));
      sound('buy');
      if (syncOrders()) renderOrders();
      afterTrade();
    },
    onBagUpgrade() {
      const r = shop.buyBagUpgrade(state());
      if (!r.ok) return;
      ui.toast(fmt(T.bag_upgraded, { slots: r.slots }));
      sound('buy');
      afterTrade();
    },
    onDeliver(id) {
      const r = orders.deliver(state(), id, now());
      if (!r.ok) return;
      const o = r.order;
      ui.toast(fmt(T.delivered, { name: T['name_' + o.from], coins: o.coins, hearts: o.hearts }));
      sound('coin');
      if (r.met.length) setTimeout(() => { ui.toast(T['met_' + r.met[0]]); sound('chime'); }, 2600);
      afterTrade();
    },
    onSkipOrder(id) {
      if (!orders.skip(state(), id, now()).ok) return;
      ui.toast(T.order_skipped);
      afterTrade();
    },
    onBuyBox() {
      const r = shop.buyBox(state());
      if (!r.ok) return;
      if (scene) scene.addBox(r.index);
      sound('buy');
      ui.toast(T.box_bought);
      renderBoxes();
      afterTrade();
    }
  };

  // ----- Hành động của người chơi -----
  function waterBox(i, quiet) {
    const b = state().boxes[i];
    const r = farm.water(b, now());
    if (r.ok && scene) scene.waterFx(i);
    if (r.ok && !quiet) sound('water');
    if (r.ok && !quiet) ui.toast(fmt(T.watered_one, { crop: cropName(b.crop) }));
    return r.ok;
  }

  function onTapBox(i) {
    const s = state(), b = s.boxes[i], t = now();
    if (!tutor.allows('tapBox', i)) return;
    farm.update(b, t);
    if (!b.crop) { sound('open'); ui.openSeedPicker(i); return; }

    if (farm.isRipe(b)) {
      const crop = b.crop;
      const r = farm.harvest(s, i, t);
      if (!r.ok) { sound('deny'); ui.toast(T.harvest_full); tutor.event('harvestFull'); return; }
      const tg = ui.bagTarget();
      if (scene) scene.harvestFx(i, CROP_COLOR[crop], r.qty, tg.x, tg.y);
      sound('harvest');
      ui.toast(fmt(T.harvested, { qty: r.qty, item: T['item_' + crop].toLowerCase() }) + (s.boxes[i].crop ? '' : ' ' + T.harvest_last));
      store.flush();
      tutor.event('harvest', i);
    } else if (farm.isDry(b, t)) {
      waterBox(i, false);
      store.flush();
      tutor.event('water', i);
    } else {
      const msg = b.regrowing ? T.box_regrowing : T.box_occupied;
      const name = T['crop_' + b.crop];
      ui.toast(fmt(msg, { crop: b.regrowing ? name : cropName(b.crop), time: duration(farm.timeLeft(b, t)) }));
    }
    renderBoxes();
    ui.refreshOpenSheets();
  }

  function onPlant(i, seedId) {
    if (!tutor.allows('plant', seedId)) return;
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
    sound('plant');
    ui.toast(fmt(T.planted, { crop: cropName(crop), time: duration(farm.timeLeft({ ...s.boxes[i], wateredUntil: Infinity }, now())) }));
    store.flush();
    renderBoxes();
    tutor.event('plant', i);
  }

  function onWaterAll() {
    if (!tutor.allows('waterAll')) return;
    const t = now();
    let n = 0, last = null;
    state().boxes.forEach((b, i) => { farm.update(b, t); if (farm.isDry(b, t) && waterBox(i, true)) { n++; last = b.crop; } });
    if (n === 0) ui.toast(T.water_nothing);
    else { sound('water'); ui.toast(n === 1 ? fmt(T.watered_one, { crop: cropName(last) }) : fmt(T.watered_many, { n })); }
    if (n) store.flush();
    renderBoxes();
    if (n) tutor.event('water', 'all');
  }

  // ----- Công cụ kiểm thử (chỉ trong bản thử) -----
  function onSkip(ms) {
    clock.skip(ms);
    ui.toast(fmt(T.skipped, { time: duration(ms) }));  reportExpiredAfterSkip();
  }
  function onAddSeeds() {
    const items = state().inventory;
    let all = true;
    Object.keys(ITEMS).filter(id => ITEMS[id].kind === 'seed').forEach(id => { if (!inv.add(items, id, 3)) all = false; });
    ui.toast(all ? T.seeds_added : T.seeds_full);
    store.flush();
    ui.refreshOpenSheets();
  }

  function onSimAway(ms) {
    lastSnapshot = snapshot();
    clock.skip(ms);
    greet({ away: ms, rewound: false });
  }

  function onNextDay() {
    clock.skip(coop.msToNextDay(state(), now()) + 6 * 3600 * 1000);   // sang 6 giờ sáng hôm sau
    ui.toast(T.next_day);
    reportExpiredAfterSkip();
  }

  function onAddDust() {
    dust.forceNow(state(), now());
    ui.toast(T.dust_added);
    store.flush();
    renderDust();
  }

  function onFillBag() {
    const items = state().inventory;
    const free = items.slots - inv.usedSlots(items);
    if (free > 0) inv.add(items, 'trung_ga', free * 99);
    ui.toast(T.bag_filled);
    store.flush();
    ui.refreshOpenSheets();
  }

  const ui = new UI({
    store, clock, pwa,
    onFrameResize: () => { if (game) game.scale.refresh(); },
    onTimeChange: h => { if (scene) scene.applyTime(h); audio.setTime(h); },
    onWaterAll, onPlant, onSkip, onAddSeeds, onFillBag, onSimAway, onNextDay, onAddDust
  });
  ui.init();
  const eco = new EconomyUI(ui, store, ecoHandlers, now);
  eco.init();
  // Bảng nào đang mở thì cập nhật theo túi đồ mới (thu hoạch, nhặt trứng…)
  const baseRefresh = ui.refreshOpenSheets.bind(ui);
  ui.refreshOpenSheets = () => { baseRefresh(); eco.refresh(); renderOrders(); };
  if (syncOrders()) store.flush();

  // Tiệm, đơn hàng, chuồng gà, bụi: chặn trong lúc hướng dẫn, có tiếng mở bảng
  const gate = (action, fn) => (...args) => { if (!tutor.allows(action)) return; fn(...args); };
  const baseOpenShop = eco.openShop.bind(eco);
  eco.openShop = gate('shop', () => {
    sound('open');
    // Trong lúc hướng dẫn bán rau: luôn mở ở tab "Bán"
    if (!state().tutorialDone) eco.setTab('sell');
    baseOpenShop();
  });
  const baseOpenBag = ui.openBag.bind(ui);
  ui.openBag = () => { sound('open'); baseOpenBag(); };

  // F21 Cài đặt
  const applyTestMode = on => { document.getElementById('infoBtn').hidden = !on; };
  applyTestMode(state().settings.testMode);
  const settings = new SettingsUI(ui, store, {
    onMusic: v => audio.setMusic(v),
    onSfx: v => audio.setSfx(v),
    onReplayTutorial: () => { restartTutorial(state()); store.flush(); tutor.start(); },
    onReset: async () => { await store.reset(); location.reload(); },
    onImported: () => setTimeout(() => location.reload(), 800),
    onTestMode: applyTestMode,
    sound
  });
  settings.init();

  // F19 Mở đầu cùng bà Tư (bắt đầu khi cảnh đã vẽ xong)
  const tutor = new TutorialUI({ store, ui, scene: () => scene, now, render: () => renderBoxes(), onToggle: () => renderBuySlot(), sound });
  tutor.init();

  // Mỗi nhịp đồng hồ: cây lớn theo thời gian game
  clock.on((type, r) => {
    if (type !== 'tick') return;
    farm.updateAll(state(), now());
    if (coop.update(state(), now())) store.markDirty();
    if (dust.update(state(), now())) store.markDirty();
    if (syncOrders(r ? r.delta : 0)) store.markDirty();
    // Chỉ cộng thời gian chơi cho các nhịp bình thường (không tính lúc vắng hay lúc tua)
    if (r && r.delta > 0 && r.delta < 5000 && !document.hidden) state().stats.playMs += r.delta;
    renderBoxes();
    renderCoop();
    renderDust();
    renderOrders();
  });

  // Bắt đầu đồng hồ: tính phần thời gian đã trôi khi game tắt, cây lớn bù phần đó (F20)
  const first = clock.start();
  clock.on((type, r) => { if (type === 'return') greet(r); });

  // Xóa dữ liệu thì vẽ lại thùng
  store.onChange(() => {
    // Xóa dữ liệu trong bản thử: số thùng có thể giảm về 4, nên dựng lại cảnh cho khớp
    if (scene && scene.boxes.length !== state().boxes.length) { location.reload(); return; }
    renderBoxes(); renderCoop(); renderDust(); renderOrders(); renderBuySlot();
  });

  game = createGame({
    boxCount: () => state().boxes.length,
    onReady: s => {
      scene = s;
      ui.hideBoot();
      ui.forceTime();
      renderBoxes();
      renderCoop();
      renderDust();
      renderOrders();
      renderBuySlot();
      greet(first);
      tutor.start();
    },
    onTapBox,
    onTapCoop: gate('coop', onTapCoop),
    onTapTrough: gate('feed', onTapTrough),
    onTapDust: gate('dust', onTapDust),
    onTapOrders: gate('orders', () => { sound('open'); eco.openOrders(); }),
    onTapBuyBox: gate('buyBox', () => { sound('open'); eco.openBuyBox(); })
  });

  window.addEventListener('offline', () => ui.toast(T.went_offline));
  pwa.register(firstInstall => { if (firstInstall) ui.toast(T.offline_ready); });

  // Cửa sổ kiểm thử cho người phát triển (gõ trong console): __game.store.data
  window.__game = { store, clock, ui, pwa, farm, coop, dust, shop, orders, eco, audio, tutor, settings, get scene() { return scene; } };
}

boot();
