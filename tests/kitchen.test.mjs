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
t('món bán được ở tiệm; hàng xóm không đặt món nấu', () => {
  const s = fresh(); s.inventory.items.canh_cai = 1; assert.equal(Sh.sell(s, 'canh_cai', 1).coins, C.RECIPES.canh_cai.sell);
  s.inventory.items.canh_cai = 1; O.syncSeen(s); assert.ok(!s.seen.includes('canh_cai'));
});
t('món nằm trong tab Nông sản của túi đồ', () => { const s = fresh(); s.inventory.items = { canh_cai: 2 }; assert.equal(I.slotList(s.inventory, 'produce').length, 1); });
t('bản lưu cũ chưa có bếp vẫn chạy', () => { const s = fresh(); delete s.kitchen; assert.equal(K.status(s, 0).key, 'idle'); assert.equal(K.cook(s, 'canh_cai', 0).ok, true); });

console.log(`\n${ok} ca kiểm thử bếp đều qua.`);
