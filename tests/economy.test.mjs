// Kiểm thử chặng 4: tiệm anh Bảo (F11), đơn hàng hàng xóm (F12), mua thêm thùng (F14), nâng cấp túi đồ.
// Chạy: node tests/economy.test.mjs
import assert from 'node:assert/strict';
const R = process.argv[2] || new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const S = await import(R + '/js/shop.js');
const O = await import(R + '/js/orders.js');
const I = await import(R + '/js/inventory.js');
const C = await import(R + '/js/config.js');
const { migrate, defaultSave, SCHEMA_VERSION } = await import(R + '/js/save.js');
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
let ok = 0; const t = (name, fn) => { fn(); ok++; console.log('✓', name); };
const fresh = () => defaultSave(0);

// ----- F11 Tiệm -----
t('Giá bán: nông sản theo bảng cây, trứng 8 xu; hạt giống và thức ăn không bán được', () => {
  assert.equal(S.sellPrice('rau_muong'), C.CROPS.rau_muong.sellPrice); assert.equal(S.sellPrice('trung_ga'), 8);
  assert.equal(S.sellPrice('hat_cai'), 0); assert.equal(S.sellPrice('thuc_an_ga'), 0);
});
t('Bán 3 rau muống: xu tăng đúng giá × 3, túi giảm 3', () => {
  const s = fresh(); s.inventory.items.rau_muong = 5; const c0 = s.coins;
  const r = S.sell(s, 'rau_muong', 3); assert.equal(r.ok, true);
  assert.equal(s.coins, c0 + 3 * C.CROPS.rau_muong.sellPrice); assert.equal(I.count(s.inventory, 'rau_muong'), 2);
});
t('Bán nhiều hơn số đang có: từ chối, không đổi gì', () => { const s = fresh(); s.inventory.items.cai = 1; const c0 = s.coins; assert.equal(S.sell(s, 'cai', 2).reason, 'not_enough'); assert.equal(s.coins, c0); assert.equal(I.count(s.inventory, 'cai'), 1); });
t('Không bán được hạt giống', () => { const s = fresh(); assert.equal(S.sell(s, 'hat_cai', 1).reason, 'not_sellable'); });
t('Mua 2 hạt cà chua: trừ đúng xu, hạt vào túi', () => { const s = fresh(); s.coins = 100; const r = S.buy(s, 'hat_ca_chua', 2); assert.equal(r.ok, true); assert.equal(s.coins, 100 - 2 * C.CROPS.ca_chua.seedPrice); assert.equal(I.count(s.inventory, 'hat_ca_chua'), 2); });
t('Không đủ xu: báo thiếu bao nhiêu, không trừ gì', () => { const s = fresh(); s.coins = 20; const r = S.canBuy(s, 'hat_ca_chua', 1); assert.equal(r.reason, 'coins'); assert.equal(r.missing, 10); assert.equal(S.buy(s, 'hat_ca_chua', 1).ok, false); assert.equal(s.coins, 20); });
t('Túi đầy: không mua được hạt mới, không trừ xu', () => { const s = fresh(); s.coins = 999; s.inventory.slots = I.usedSlots(s.inventory); assert.equal(S.buy(s, 'hat_ot', 1).reason, 'bag_full'); assert.equal(s.coins, 999); });
t('Túi đầy nhưng mua thêm món đang có (còn chỗ trong ô): vẫn mua được', () => { const s = fresh(); s.coins = 999; s.inventory.slots = I.usedSlots(s.inventory); assert.equal(S.buy(s, 'thuc_an_ga', 3).ok, true); });
t('Nâng cấp túi đồ: +4 ô, giá tăng dần, tối đa 3 lần', () => {
  const s = fresh(); s.coins = 1000; const slots0 = s.inventory.slots;
  C.BAG_UPGRADES.forEach((u, k) => { assert.equal(S.nextBagUpgrade(s).price, u.price); assert.equal(S.buyBagUpgrade(s).ok, true); });
  assert.equal(s.inventory.slots, slots0 + 12); assert.equal(S.buyBagUpgrade(s).reason, 'max'); assert.equal(s.coins, 1000 - C.BAG_UPGRADES.reduce((a, u) => a + u.price, 0));
});

// ----- F14 Mua thùng -----
t('Mua thùng: trừ xu, thêm thùng trống gieo được ngay; giá tăng; tối đa 8', () => {
  const s = fresh(); s.coins = 1000;
  C.BOX_PRICES.forEach((p, k) => { assert.equal(S.nextBoxPrice(s), p); const r = S.buyBox(s); assert.equal(r.ok, true); assert.equal(r.index, 4 + k); assert.equal(s.boxes[r.index].crop, null); });
  assert.equal(s.boxes.length, C.MAX_BOXES); assert.equal(S.nextBoxPrice(s), 0); assert.equal(S.buyBox(s).reason, 'max');
});
t('Mua thùng khi thiếu xu: không có thùng mới', () => { const s = fresh(); s.coins = 10; assert.equal(S.buyBox(s).reason, 'coins'); assert.equal(s.boxes.length, 4); });

// ----- F12 Đơn hàng -----
t('Người chơi mới: 3 đơn, chỉ đặt món đã có (rau muống, cải, trứng)', () => {
  const s = fresh(); O.syncSeen(s); O.refill(s, seq(0.1, 0.5, 0.9, 0.3, 0.7));
  assert.equal(s.orders.list.length, C.ORDER_SLOTS);
  s.orders.list.forEach(o => assert.ok(['rau_muong', 'cai', 'trung_ga'].includes(o.item), o.item));
});
t('Ba đơn khác món nhau khi còn đủ món', () => { const s = fresh(); O.syncSeen(s); O.refill(s, seq(0.1, 0.5, 0.9, 0.3, 0.7, 0.2)); assert.equal(new Set(s.orders.list.map(o => o.item)).size, 3); });
t('Thưởng đơn hàng cao hơn bán ở tiệm', () => { const s = fresh(); O.syncSeen(s); O.refill(s); s.orders.list.forEach(o => assert.ok(o.coins > S.sellPrice(o.item) * o.qty)); });
t('Đủ đồ: giao được, nhận đúng xu và điểm thân thiết, có đơn mới thay', () => {
  const s = fresh(); O.syncSeen(s); O.refill(s); const o = s.orders.list[0];
  s.inventory.items[o.item] = o.qty + 1; const c0 = s.coins;
  const r = O.deliver(s, o.id); assert.equal(r.ok, true);
  assert.equal(s.coins, c0 + o.coins); assert.equal(s.friends[o.from], o.hearts); assert.equal(I.count(s.inventory, o.item), 1);
  assert.equal(s.orders.list.length, 3); assert.ok(!s.orders.list.some(x => x.id === o.id));
});
t('Thiếu đồ: không giao được, báo còn thiếu bao nhiêu, không đổi gì', () => {
  const s = fresh(); O.syncSeen(s); O.refill(s); const o = s.orders.list[0]; s.inventory.items[o.item] = o.qty - 1; const c0 = s.coins;
  const r = O.deliver(s, o.id); assert.equal(r.reason, 'not_enough'); assert.equal(r.missing, 1); assert.equal(s.coins, c0); assert.equal(I.count(s.inventory, o.item), o.qty - 1);
});
t('Đổi đơn khác: vẫn đủ 3 đơn, đơn cũ biến mất, giữ đúng vị trí', () => {
  const s = fresh(); O.syncSeen(s); O.refill(s); const ids = s.orders.list.map(o => o.id);
  assert.equal(O.skip(s, ids[1]).ok, true); assert.equal(s.orders.list.length, 3);
  assert.ok(!s.orders.list.some(o => o.id === ids[1])); assert.equal(s.orders.list[0].id, ids[0]); assert.equal(s.orders.list[2].id, ids[2]);
});
t('Không có đơn nào đặt món chưa mở (cà chua) cho tới khi người chơi có hạt cà chua', () => {
  const s = fresh(); O.syncSeen(s); O.refill(s); for (let k = 0; k < 40; k++) O.skip(s, s.orders.list[0].id);
  assert.ok(!s.orders.list.some(o => o.item === 'ca_chua'));
  s.inventory.items.hat_ca_chua = 1; O.syncSeen(s); assert.ok(O.pool(s).includes('ca_chua'));
});
t('Bán hết hạt giống không làm mất món đã mở', () => { const s = fresh(); O.syncSeen(s); s.inventory.items = {}; O.syncSeen(s); assert.ok(O.pool(s).includes('rau_muong')); });

// ----- Nâng cấp bản lưu -----
t('Nâng cấp bản lưu phiên bản 3 lên ' + SCHEMA_VERSION + ': giữ nguyên, thêm đơn hàng và món đã mở', () => {
  const old = { schemaVersion: 3, createdAt: 0, coins: 90, clock: { gameTime: 0 }, inventory: { slots: 12, items: { hat_ot: 2, trung_ga: 3 } },
    boxes: [{ crop: 'dua_leo', progress: 0.3, lastT: 0, wateredUntil: 0, harvestsLeft: 3, regrowing: false }], coop: { chickens: 2, eggs: 0 }, dust: { spots: [1], nextAt: 0 } };
  const m = migrate(old);
  assert.equal(m.schemaVersion, SCHEMA_VERSION); assert.equal(m.coins, 90); assert.deepEqual(m.dust.spots, [1]); assert.equal(m.boxes[0].crop, 'dua_leo');
  assert.deepEqual(m.orders.list, []); assert.equal(m.friends.ba_tu, 0);
  ['ot', 'trung_ga', 'dua_leo'].forEach(id => assert.ok(m.seen.includes(id), id));
});
console.log(`\n${ok} ca đạt`);
