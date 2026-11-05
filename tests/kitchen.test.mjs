// Kiểm thử F16 Bếp nhỏ: thiếu nguyên liệu không nấu được, nấu mất thời gian, giá món luôn cao hơn nguyên liệu.
// Chạy: node tests/kitchen.test.mjs
import assert from 'node:assert/strict';
const R = process.argv[2] || new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const K = await import(R + '/js/kitchen.js');
const I = await import(R + '/js/inventory.js');
const C = await import(R + '/js/config.js');
const L = await import(R + '/js/level.js');
const Sh = await import(R + '/js/shop.js');
const O = await import(R + '/js/orders.js');
const { defaultSave } = await import(R + '/js/save.js');
const M = 60e3;
const fresh = (lv = 13) => { const s = defaultSave(0); s.xp = C.LEVELS[lv - 1].xp; s.inventory.slots = 30;
  s.inventory.items = { rau_muong: 9, cai: 9, trung_ga: 9, hung_que: 9, dua_leo: 9, ot: 9, ca_chua: 9, trung_bo_cau: 9 }; return s; };
let ok = 0; const t = (name, fn) => { fn(); ok++; console.log('✓', name); };

t('có 6 món, mỗi món là một vật phẩm loại món ăn', () => {
  assert.equal(K.IDS.length, 6); K.IDS.forEach(id => assert.equal(C.ITEMS[id].kind, 'dish'));
});
t('giá món luôn cao hơn tổng giá nguyên liệu (ít nhất 30%)', () => {
  K.IDS.forEach(id => { const v = K.ingredientValue(id, Sh.sellPrice); assert.ok(Sh.sellPrice(id) >= v * 1.3, id + ': ' + Sh.sellPrice(id) + ' vs ' + v); });
});
t('mọi nguyên liệu đều là món có thật trong game', () => { K.IDS.forEach(id => Object.keys(C.RECIPES[id].needs).forEach(item => assert.ok(C.ITEMS[item], item))); });
t('bếp mở ở level 6; món cà chua ở level 7, trứng bồ câu ở level 12', () => {
  assert.equal(K.kitchenLevel(), 6); assert.equal(K.recipeLevel('rau_muong_xao'), 6);
  assert.equal(K.recipeLevel('canh_ca_chua_trung'), 7); assert.equal(K.recipeLevel('trung_bo_cau_hap'), 12);
  assert.equal(K.cook(fresh(5), 'rau_muong_xao', 0).reason, 'locked');
  const s = fresh(6); assert.equal(K.cook(s, 'canh_ca_chua_trung', 0).reason, 'recipe_locked'); assert.equal(K.cook(s, 'rau_muong_xao', 0).ok, true);
});
t('thiếu nguyên liệu không nấu được, không mất gì, báo thiếu món nào', () => {
  const s = fresh(); s.inventory.items.trung_ga = 1;
  const r = K.cook(s, 'canh_ca_chua_trung', 0); assert.equal(r.reason, 'missing');
  assert.deepEqual(r.missing, [{ id: 'trung_ga', need: 2, have: 1 }]);
  assert.equal(I.count(s.inventory, 'ca_chua'), 9); assert.equal(K.status(s, 0).key, 'idle');
});
t('nấu: trừ đúng nguyên liệu, chín sau đúng thời gian', () => {
  const s = fresh(), r = C.RECIPES.canh_ca_chua_trung;
  assert.equal(K.cook(s, 'canh_ca_chua_trung', 0).ok, true);
  assert.equal(I.count(s.inventory, 'ca_chua'), 7); assert.equal(I.count(s.inventory, 'trung_ga'), 7);
  const st = K.status(s, r.time / 2); assert.equal(st.key, 'cooking'); assert.ok(Math.abs(st.frac - 0.5) < 1e-9); assert.equal(st.left, r.time / 2);
  assert.equal(K.status(s, r.time - 1).key, 'cooking'); assert.equal(K.status(s, r.time).key, 'ready');
});
t('đang nấu hoặc món chưa lấy: không nấu món khác', () => {
  const s = fresh(); K.cook(s, 'rau_muong_xao', 0);
  assert.equal(K.cook(s, 'canh_cai', M).reason, 'busy');
  assert.equal(K.cook(s, 'canh_cai', 10 * M).reason, 'busy');   // đã chín nhưng chưa lấy
  K.collect(s, 10 * M); assert.equal(K.cook(s, 'canh_cai', 10 * M).ok, true);
});
t('lấy món: món vào túi, bếp trống', () => {
  const s = fresh(); K.cook(s, 'dua_leo_tron', 0); assert.equal(K.collect(s, M).reason, 'none');
  const r = K.collect(s, 10 * M); assert.equal(r.id, 'dua_leo_tron'); assert.equal(I.count(s.inventory, 'dua_leo_tron'), 1); assert.equal(K.status(s, 10 * M).key, 'idle');
});
t('nấu rồi tắt game: mở lại món đã chín', () => { const s = fresh(); K.cook(s, 'canh_cai', 0); assert.equal(K.update(s, 3 * 3600e3), 'canh_cai'); assert.equal(s.kitchen.ready, 'canh_cai'); });
t('túi đầy: món nằm lại trên bếp, không mất', () => {
  const s = fresh(); K.cook(s, 'rau_muong_xao', 0); s.inventory.slots = I.usedSlots(s.inventory);
  assert.equal(K.collect(s, 10 * M).reason, 'full'); assert.equal(s.kitchen.ready, 'rau_muong_xao');
});
t('món bán được ở tiệm', () => { const s = fresh(); s.inventory.items.canh_cai = 1; assert.equal(Sh.sell(s, 'canh_cai', 1).coins, C.RECIPES.canh_cai.sell); });

// ----- Bản 0.16.1: hàng xóm đặt món nấu -----
// Bốc thăm cố định để kiểm thử lặp lại được
const seeded = seed => { let x = seed; return () => (x = (x * 16807) % 2147483647) / 2147483647; };
const orderState = () => { const s = fresh(); s.orders = O.newOrders(); s.friends = O.newFriends(); s.seen = []; return s; };
t('chưa nấu món nào: không có đơn món nấu', () => {
  const s = orderState(); O.syncSeen(s); for (let i = 0; i < 50; i++) { s.orders.list = []; O.refill(s, 0, seeded(i + 1)); assert.ok(!s.orders.list.some(o => O.isDish(o.item))); }
});
t('đã có món trong túi (đã nấu): hàng xóm có thể đặt món đó', () => {
  const s = orderState(); s.inventory.items.canh_cai = 1; O.syncSeen(s); assert.ok(s.seen.includes('canh_cai'));
  let found = 0; for (let i = 0; i < 80; i++) { s.orders.list = []; O.refill(s, 0, seeded(i + 1)); found += s.orders.list.filter(o => o.item === 'canh_cai').length; }
  assert.ok(found > 0);
});
t('đơn món nấu: 1–2 phần, thưởng 2 tim, xu cao hơn bán ở tiệm', () => {
  const s = orderState(); K.IDS.forEach(id => { s.inventory.items[id] = 1; }); O.syncSeen(s);
  let n = 0;
  for (let i = 0; i < 200; i++) { s.orders.list = []; O.refill(s, 0, seeded(i + 7));
    s.orders.list.filter(o => O.isDish(o.item)).forEach(o => { n++; assert.ok(o.qty >= 1 && o.qty <= 2); assert.equal(o.hearts, 2); assert.ok(o.coins > Sh.sellPrice(o.item) * o.qty); }); }
  assert.ok(n > 20);
});
t('trên dây phơi có nhiều nhất 1 đơn món nấu', () => {
  const s = orderState(); K.IDS.forEach(id => { s.inventory.items[id] = 1; }); O.syncSeen(s);
  for (let i = 0; i < 200; i++) { s.orders.list = []; O.refill(s, 0, seeded(i + 3)); assert.ok(s.orders.list.filter(o => O.isDish(o.item)).length <= 1); }
});
t('đổi đơn hoặc đơn hết hạn cũng không làm thành 2 đơn món nấu', () => {
  const s = orderState(); K.IDS.forEach(id => { s.inventory.items[id] = 1; }); O.syncSeen(s);
  for (let i = 0; i < 100; i++) { s.orders.list = []; O.refill(s, 0, seeded(i + 11)); const o = s.orders.list[0]; O.skip(s, o.id, 0, seeded(i + 99));
    O.expire(s, 4 * 24 * 3600e3, seeded(i + 5)); assert.ok(s.orders.list.filter(x => O.isDish(x.item)).length <= 1); }
});
t('giao đơn món nấu: trừ món trong túi, nhận xu', () => {
  const s = orderState(); s.inventory.items.trung_chien_hung_que = 2; s.orders.list = [{ id: 1, from: 'be_na', item: 'trung_chien_hung_que', qty: 2, coins: 90, hearts: 2, createdAt: 0 }];
  const c0 = s.coins, r = O.deliver(s, 1, 0, seeded(1)); assert.equal(r.ok, true);
  assert.equal(I.count(s.inventory, 'trung_chien_hung_que'), 0); assert.ok(s.coins >= c0 + 90);
});
t('mỗi hàng xóm thích một món nấu', () => { Object.values(C.NEIGHBORS).forEach(n => assert.ok(n.likes.some(id => O.isDish(id)))); });
t('trứng gà ngon vẫn không được đặt', () => { const s = orderState(); s.inventory.items.trung_ga_ngon = 2; O.syncSeen(s); assert.ok(!s.seen.includes('trung_ga_ngon')); });
t('món nằm trong tab Nông sản của túi đồ', () => { const s = fresh(); s.inventory.items = { canh_cai: 2 }; assert.equal(I.slotList(s.inventory, 'produce').length, 1); });
t('bản lưu cũ chưa có bếp vẫn chạy', () => { const s = fresh(); delete s.kitchen; assert.equal(K.status(s, 0).key, 'idle'); assert.equal(K.cook(s, 'canh_cai', 0).ok, true); });

console.log(`\n${ok} ca kiểm thử bếp đều qua.`);
