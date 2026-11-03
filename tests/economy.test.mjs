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
  const s = fresh(); O.syncSeen(s); O.refill(s, 0, seq(0.1, 0.5, 0.9, 0.3, 0.7));
  assert.equal(s.orders.list.length, C.ORDER_SLOTS);
  s.orders.list.forEach(o => assert.ok(['rau_muong', 'cai', 'trung_ga'].includes(o.item), o.item));
});
t('Ba đơn khác món nhau khi còn đủ món', () => { const s = fresh(); O.syncSeen(s); O.refill(s, 0, seq(0.1, 0.5, 0.9, 0.3, 0.7, 0.2)); assert.equal(new Set(s.orders.list.map(o => o.item)).size, 3); });
t('Thưởng đơn hàng cao hơn bán ở tiệm', () => { const s = fresh(); O.syncSeen(s); O.refill(s, 0); s.orders.list.forEach(o => assert.ok(o.coins > S.sellPrice(o.item) * o.qty)); });
t('Đủ đồ: giao được, nhận đúng xu và điểm thân thiết, có đơn mới thay', () => {
  const s = fresh(); O.syncSeen(s); O.refill(s, 0); const o = s.orders.list[0];
  s.inventory.items[o.item] = o.qty + 1; const c0 = s.coins;
  const r = O.deliver(s, o.id, 0); assert.equal(r.ok, true);
  assert.equal(s.coins, c0 + o.coins); assert.equal(s.friends[o.from], o.hearts); assert.equal(I.count(s.inventory, o.item), 1);
  assert.equal(s.orders.list.length, 3); assert.ok(!s.orders.list.some(x => x.id === o.id));
});
t('Thiếu đồ: không giao được, báo còn thiếu bao nhiêu, không đổi gì', () => {
  const s = fresh(); O.syncSeen(s); O.refill(s, 0); const o = s.orders.list[0]; s.inventory.items[o.item] = o.qty - 1; const c0 = s.coins;
  const r = O.deliver(s, o.id, 0); assert.equal(r.reason, 'not_enough'); assert.equal(r.missing, 1); assert.equal(s.coins, c0); assert.equal(I.count(s.inventory, o.item), o.qty - 1);
});
t('Đổi đơn khác: vẫn đủ 3 đơn, đơn cũ biến mất, giữ đúng vị trí', () => {
  const s = fresh(); O.syncSeen(s); O.refill(s, 0); const ids = s.orders.list.map(o => o.id);
  assert.equal(O.skip(s, ids[1], 0).ok, true); assert.equal(s.orders.list.length, 3);
  assert.ok(!s.orders.list.some(o => o.id === ids[1])); assert.equal(s.orders.list[0].id, ids[0]); assert.equal(s.orders.list[2].id, ids[2]);
});
t('Không có đơn nào đặt món chưa mở (cà chua) cho tới khi người chơi có hạt cà chua', () => {
  const s = fresh(); O.syncSeen(s); O.refill(s, 0); for (let k = 0; k < 40; k++) O.skip(s, s.orders.list[0].id, 0);
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

// ----- Hàng xóm mở dần và đơn tự đổi sau 3 ngày -----
const D = 24 * 3600e3;
t('Lúc đầu chỉ quen bà Tư và bé Na; đơn chỉ từ hai người này', () => {
  const s = fresh(); O.syncSeen(s); O.refill(s, 0);
  assert.deepEqual(O.unlocked(s), ['ba_tu', 'be_na']);
  for (let k = 0; k < 30; k++) O.skip(s, s.orders.list[0].id, 0);
  assert.ok(s.orders.list.every(o => ['ba_tu', 'be_na'].includes(o.from)));
  assert.deepEqual(O.nextNeighbor(s), { id: 'co_mai', left: 3 });
});
t('Giao đủ 3 đơn thì quen cô Mai, và cô Mai gửi đơn ngay', () => {
  const s = fresh(); O.syncSeen(s); O.refill(s, 0);
  let met = [];
  for (let k = 0; k < 3; k++) { const o = s.orders.list[0]; s.inventory.items[o.item] = 99; const r = O.deliver(s, o.id, 0); met = met.concat(r.met); }
  assert.deepEqual(met, ['co_mai']); assert.ok(O.unlocked(s).includes('co_mai'));
  assert.ok(s.orders.list.some(o => o.from === 'co_mai')); assert.equal(s.orders.list.length, 3);
  assert.equal(new Set(s.orders.list.map(o => o.id)).size, 3, 'mã đơn không trùng');
});
t('Thứ tự quen: cô Mai 3, anh Tuấn 6, chú Sáu 10, chị Hoa 15, ông Ba 20 đơn', () => {
  const s = fresh(); const order = [];
  for (let d = 0; d <= 20; d++) { s.orders.delivered = d; const u = O.unlocked(s); u.forEach(n => { if (!order.includes(n)) order.push(n + '@' + d); }); }
  const firsts = {}; order.forEach(x => { const [n, d] = x.split('@'); if (!(n in firsts)) firsts[n] = +d; });
  assert.deepEqual(firsts, { ba_tu: 0, be_na: 0, co_mai: 3, anh_tuan: 6, chu_sau: 10, chi_hoa: 15, ong_ba: 20 });
});
t('Hàng xóm hay đặt món mình thích khi người chơi đã có món đó', () => {
  const s = fresh(); s.orders.delivered = 10; s.seen = ['rau_muong', 'cai', 'trung_ga', 'dua_leo', 'ca_chua'];
  let egg = 0, total = 0;
  for (let k = 0; k < 200; k++) { const o = O.makeOrder({ ...s, orders: { ...s.orders, list: [] } }, 0, Math.random, 'chu_sau'); total++; if (o.item === 'trung_ga') egg++; }
  assert.ok(egg / total > 0.55, 'chú Sáu đặt trứng ' + egg + '/' + total);
});
t('Đơn chưa đủ 3 ngày thì giữ nguyên', () => { const s = fresh(); O.syncSeen(s); O.refill(s, 0); const ids = s.orders.list.map(o => o.id); assert.deepEqual(O.expire(s, 3 * D - 1000), []); assert.deepEqual(s.orders.list.map(o => o.id), ids); });
t('Đơn để quá 3 ngày tự thay bằng đơn mới đúng chỗ, không mất xu hay điểm', () => {
  const s = fresh(); O.syncSeen(s); O.refill(s, 0); const c0 = s.coins;
  const keep = O.makeOrder(s, 2 * D); s.orders.list[1] = keep;          // đơn thứ 2 mới ghim, chưa hết hạn
  const old0 = s.orders.list[0].id, old2 = s.orders.list[2].id;
  const gone = O.expire(s, 3 * D);
  assert.deepEqual(gone.map(o => o.id), [old0, old2]);
  assert.equal(s.orders.list.length, 3); assert.equal(s.orders.list[1].id, keep.id);
  assert.ok(!s.orders.list.some(o => o.id === old0 || o.id === old2));
  assert.equal(s.coins, c0); assert.equal(s.friends.ba_tu + s.friends.be_na, 0);
});
t('Đơn mới có hạn tính từ lúc ghim; timeLeft đếm ngược đúng', () => { const s = fresh(); O.syncSeen(s); O.refill(s, 5 * D); assert.equal(O.timeLeft(s.orders.list[0], 6 * D), 2 * D); });
t('Nâng cấp bản lưu phiên bản 4: đơn cũ có mốc thời gian, thêm 5 hàng xóm, giữ điểm thân thiết', () => {
  const v4 = { schemaVersion: 4, createdAt: 0, coins: 5, clock: { gameTime: 9 * D }, inventory: { slots: 12, items: {} }, boxes: [],
    orders: { list: [{ id: 1, from: 'ba_tu', item: 'cai', qty: 2, coins: 20, hearts: 1 }], nextId: 2 }, friends: { ba_tu: 4, be_na: 1 }, seen: ['cai'] };
  const m = migrate(v4);
  assert.equal(m.orders.list[0].createdAt, 9 * D); assert.equal(m.orders.delivered, 0);
  assert.equal(m.friends.ba_tu, 4); assert.equal(m.friends.ong_ba, 0); assert.equal(Object.keys(m.friends).length, 7);
});
console.log(`\n${ok} ca đạt`);
