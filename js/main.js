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

const AWAY_NOTICE_MS = 60000;         // vắng từ 1 phút: lời chào ngắn
const AWAY_SUMMARY_MS = 5 * 60000;    // vắng từ 5 phút và có thay đổi: bảng "Trong lúc bạn đi vắng"

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
    if (r.away >= AWAY_SUMMARY_MS && (s.ripe.length || s.grew.length || s.dry.length || s.eggs || s.hungry || s.dust)) ui.showAway(s);
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
      ui.toast(fmt(T.coop_fed, { time: duration(LAY_DELAY) }));
      store.flush();
    } else if (r.reason === 'no_feed') {
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
      ui.toast(fmt(T.eggs_collected, { n: r.qty }));
      store.flush();
    } else if (r.reason === 'full') {
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
    setTimeout(() => ui.refreshCoins(true), 900);
    ui.toast(fmt(r.clean ? T.dust_clean : T.dust_swept, { n: r.reward }));
    store.flush();
    renderDust();
  }

  // ----- Chặng 4: tiệm, đơn hàng, mua thùng -----
  const pickLine = arr => arr[Math.floor(Math.random() * arr.length)];
  // Ghi nhận món đã mở và ghim đủ đơn hàng; trả về true nếu có thay đổi cần lưu
  function syncOrders() {
    const a = orders.syncSeen(state());
    const b = orders.refill(state()) > 0;
    return a || b;
  }
  function renderOrders() {
    if (!scene) return;
    const list = state().orders.list;
    scene.setOrderNotes(list.length, list.some(o => orders.canDeliver(state(), o)));
  }
  function renderBuySlot() {
    if (!scene) return;
    const n = state().boxes.length;
    scene.setBuySlot(n < MAX_BOXES ? n : -1, shop.nextBoxPrice(state()));
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
      const r = shop.sell(state(), id, qty);
      if (!r.ok) return;
      ui.toast(fmt(T.sold, { coins: r.coins, qty, unit: unitOf(id), noun: nounOf(id) }));
      eco.say(pickLine(T.shop_after_sell));
      afterTrade();
    },
    onBuy(id, qty) {
      const r = shop.buy(state(), id, qty);
      if (!r.ok) return;
      ui.toast(fmt(T.bought, { coins: r.cost, qty, unit: unitOf(id), noun: nounOf(id) }));
      eco.say(pickLine(T.shop_after_buy));
      if (syncOrders()) renderOrders();
      afterTrade();
    },
    onBagUpgrade() {
      const r = shop.buyBagUpgrade(state());
      if (!r.ok) return;
      ui.toast(fmt(T.bag_upgraded, { slots: r.slots }));
      afterTrade();
    },
    onDeliver(id) {
      const r = orders.deliver(state(), id);
      if (!r.ok) return;
      const o = r.order;
      ui.toast(fmt(T.delivered, { name: T['name_' + o.from], coins: o.coins, hearts: o.hearts }));
      afterTrade();
    },
    onSkipOrder(id) {
      if (!orders.skip(state(), id).ok) return;
      ui.toast(T.order_skipped);
      afterTrade();
    },
    onBuyBox() {
      const r = shop.buyBox(state());
      if (!r.ok) return;
      if (scene) scene.addBox(r.index);
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

  function onSimAway(ms) {
    lastSnapshot = snapshot();
    clock.skip(ms);
    greet({ away: ms, rewound: false });
  }

  function onNextDay() {
    clock.skip(coop.msToNextDay(state(), now()) + 6 * 3600 * 1000);   // sang 6 giờ sáng hôm sau
    ui.toast(T.next_day);
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
    onTimeChange: h => { if (scene) scene.applyTime(h); },
    onWaterAll, onPlant, onSkip, onAddSeeds, onFillBag, onSimAway, onNextDay, onAddDust
  });
  ui.init();
  const eco = new EconomyUI(ui, store, ecoHandlers);
  eco.init();
  // Bảng nào đang mở thì cập nhật theo túi đồ mới (thu hoạch, nhặt trứng…)
  const baseRefresh = ui.refreshOpenSheets.bind(ui);
  ui.refreshOpenSheets = () => { baseRefresh(); eco.refresh(); renderOrders(); };
  if (syncOrders()) store.flush();

  // Mỗi nhịp đồng hồ: cây lớn theo thời gian game
  clock.on(type => {
    if (type !== 'tick') return;
    farm.updateAll(state(), now());
    if (coop.update(state(), now())) store.markDirty();
    if (dust.update(state(), now())) store.markDirty();
    if (syncOrders()) store.markDirty();
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
    },
    onTapBox,
    onTapCoop,
    onTapTrough,
    onTapDust,
    onTapOrders: () => eco.openOrders(),
    onTapBuyBox: () => eco.openBuyBox()
  });

  window.addEventListener('offline', () => ui.toast(T.went_offline));
  pwa.register(firstInstall => { if (firstInstall) ui.toast(T.offline_ready); });

  // Cửa sổ kiểm thử cho người phát triển (gõ trong console): __game.store.data
  window.__game = { store, clock, ui, pwa, farm, coop, dust, shop, orders, eco, get scene() { return scene; } };
}

boot();
