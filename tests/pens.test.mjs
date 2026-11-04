// Kiểm thử F06 Vật nuôi khác: thỏ, bồ câu, bể cá — mở theo level, cho ăn, sản phẩm đúng loại, không chết.
// Chạy: node tests/pens.test.mjs
import assert from 'node:assert/strict';
const R = process.argv[2] || new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const P = await import(R + '/js/pens.js');
const I = await import(R + '/js/inventory.js');
const C = await import(R + '/js/config.js');
const L = await import(R + '/js/level.js');
const O = await import(R + '/js/orders.js');
const Sh = await import(R + '/js/shop.js');
const { defaultSave } = await import(R + '/js/save.js');
const Hh = 3600e3, D = 24 * Hh;
const start = new Date(2026, 10, 3, 8, 0, 0).getTime();
const fresh = (lv = 13) => { const s = defaultSave(start); s.xp = C.LEVELS[lv - 1].xp; s.inventory.slots = 30; Object.values(C.PENS).forEach(d => { s.inventory.items[d.feed] = 10; }); return s; };
let ok = 0; const t = (name, fn) => { fn(); ok++; console.log('✓', name); };
const expected = { tho: 'long_tho', bo_cau: 'trung_bo_cau', ca: 'ca_con' };

t('ba loại vật nuôi, mỗi loại một thức ăn và một sản phẩm khác nhau', () => {
  assert.deepEqual(P.KINDS, ['tho', 'bo_cau', 'ca']);
  const feeds = new Set(P.KINDS.map(k => C.PENS[k].feed)), prods = new Set(P.KINDS.map(k => C.PENS[k].product));
  assert.equal(feeds.size, 3); assert.equal(prods.size, 3);
});
t('mở ở level 11 (thỏ), 12 (bồ câu), 13 (bể cá)', () => {
  assert.equal(P.level('tho'), 11); assert.equal(P.level('bo_cau'), 12); assert.equal(P.level('ca'), 13);
  const s = fresh(11); assert.equal(P.unlocked(s, 'tho'), true); assert.equal(P.unlocked(s, 'bo_cau'), false);
});
t('chưa mở thì chạm chuồng không làm gì, không mất thức ăn', () => {
  const s = fresh(10); const r = P.tap(s, 'tho', 0); assert.equal(r.action, 'locked'); assert.equal(r.level, 11);
  assert.equal(P.feed(s, 'tho', 0).reason, 'locked'); assert.equal(I.count(s.inventory, 'co_kho'), 10);
});
for (const k of ['tho', 'bo_cau', 'ca']) {
  t(`${k}: cho ăn trừ đúng thức ăn, sau ${C.PENS[k].delay / Hh} giờ có ${C.PENS[k].yield} ${expected[k]}`, () => {
    const s = fresh(), d = C.PENS[k];
    assert.equal(P.feed(s, k, 0).ok, true); assert.equal(I.count(s.inventory, d.feed), 9);
    assert.equal(P.update(s, k, d.delay - 1000), 0); assert.equal(P.update(s, k, d.delay), d.yield);
    const r = P.collect(s, k, d.delay); assert.equal(r.item, expected[k]); assert.equal(I.count(s.inventory, expected[k]), d.yield);
  });
}
t('mỗi ngày cho ăn một lần, có sản phẩm một lượt', () => {
  const s = fresh(); P.feed(s, 'tho', 0); assert.equal(P.feed(s, 'tho', Hh).reason, 'fed_today');
  P.update(s, 'tho', 5 * Hh); P.update(s, 'tho', 10 * Hh); assert.equal(s.pens.tho.items, C.PENS.tho.yield);
});
t('hết thức ăn thì không cho ăn được', () => { const s = fresh(); s.inventory.items.hat_ke = 0; delete s.inventory.items.hat_ke; assert.equal(P.feed(s, 'bo_cau', 0).reason, 'no_feed'); });
t('không cho ăn nhiều ngày: không chết, chỉ không có sản phẩm', () => {
  const s = fresh(); P.update(s, 'ca', 10 * D); assert.equal(s.pens.ca.items, 0); assert.equal(P.status(s, 'ca', 10 * D).key, 'hungry');
  assert.equal(P.feed(s, 'ca', 10 * D).ok, true);
});
t('sản phẩm chưa nhặt không mất, cộng dồn qua các ngày', () => {
  const s = fresh(); P.feed(s, 'bo_cau', 0); P.update(s, 'bo_cau', 3 * Hh); P.feed(s, 'bo_cau', D); P.update(s, 'bo_cau', 3 * D);
  assert.equal(s.pens.bo_cau.items, 2 * C.PENS.bo_cau.yield);
});
t('tắt game qua hôm sau: mở lại có sản phẩm', () => { const s = fresh(); P.feed(s, 'tho', 0); P.updateAll(s, 30 * Hh); assert.equal(s.pens.tho.items, C.PENS.tho.yield); });
t('túi đầy: không nhặt được, sản phẩm nằm lại', () => {
  const s = fresh(); P.feed(s, 'tho', 0); P.update(s, 'tho', 4 * Hh); s.inventory.slots = I.usedSlots(s.inventory);
  assert.equal(P.collect(s, 'tho', 4 * Hh).reason, 'full'); assert.equal(s.pens.tho.items, C.PENS.tho.yield);
});
t('một lần chạm: có sản phẩm thì nhặt, chưa ăn thì cho ăn, còn lại báo tình trạng', () => {
  const s = fresh();
  assert.equal(P.tap(s, 'tho', 0).action, 'feed');
  const st = P.tap(s, 'tho', Hh); assert.equal(st.action, 'status'); assert.equal(st.key, 'digesting');
  const c = P.tap(s, 'tho', 4 * Hh); assert.equal(c.action, 'collect'); assert.equal(c.qty, 2);
  assert.equal(P.tap(s, 'tho', 5 * Hh).key, 'done');
  assert.equal(P.tap(s, 'tho', D + Hh).action, 'feed');
});
t('ngày mới: nhặt trước, lần chạm sau mới cho ăn', () => {
  const s = fresh(); P.feed(s, 'ca', 0); P.update(s, 'ca', 5 * Hh);
  assert.equal(P.tap(s, 'ca', D + Hh).action, 'collect'); assert.equal(P.tap(s, 'ca', D + Hh).action, 'feed');
});
t('bản lưu cũ không có chuồng mới: vẫn chạy', () => { const s = fresh(); delete s.pens; assert.deepEqual(P.updateAll(s, D), {}); assert.equal(P.status(s, 'tho', 0).key, 'hungry'); });

// ----- Tiệm, level, đơn hàng -----
t('thức ăn bán ở tiệm, mở cùng level với con vật', () => {
  assert.equal(L.itemUnlockLevel('co_kho'), 11); assert.equal(L.itemUnlockLevel('hat_ke'), 12); assert.equal(L.itemUnlockLevel('cam_ca'), 13);
  const s = fresh(11); s.coins = 100; assert.equal(Sh.canBuy(s, 'co_kho', 1).ok, true); assert.equal(Sh.canBuy(s, 'cam_ca', 1).reason, 'locked');
});
t('sản phẩm bán được ở tiệm; thức ăn thì không', () => {
  ['long_tho', 'trung_bo_cau', 'ca_con'].forEach(id => assert.ok(Sh.sellPrice(id) > 0));
  ['co_kho', 'hat_ke', 'cam_ca'].forEach(id => assert.equal(Sh.sellPrice(id), 0));
});
t('lên level 11–13: mở chuồng và tặng 5 thức ăn', () => {
  const s = defaultSave(start); s.xp = C.LEVELS[12].xp;
  for (let lv = 2; lv <= 10; lv++) L.claimLevel(s, lv);
  const g = [11, 12, 13].map(lv => L.claimLevel(s, lv));
  assert.deepEqual(g.map(x => x.unlock.pen), ['tho', 'bo_cau', 'ca']);
  assert.ok(g[0].items.some(i => i.id === 'co_kho' && i.qty === 5));
});
t('có sản phẩm trong túi thì hàng xóm có thể đặt', () => { const s = fresh(); s.inventory.items.trung_bo_cau = 2; O.syncSeen(s); assert.ok(s.seen.includes('trung_bo_cau')); });

console.log(`\n${ok} ca kiểm thử vật nuôi đều qua.`);
