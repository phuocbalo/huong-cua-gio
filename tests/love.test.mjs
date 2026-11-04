// Kiểm thử F07 Thân thiết với gà: tim tăng khi chăm, giảm nhẹ khi bỏ, trứng ngon theo tim.
// Chạy: node tests/love.test.mjs
import assert from 'node:assert/strict';
const R = process.argv[2] || new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const K = await import(R + '/js/coop.js');
const I = await import(R + '/js/inventory.js');
const C = await import(R + '/js/config.js');
const O = await import(R + '/js/orders.js');
const Sh = await import(R + '/js/shop.js');
const { defaultSave } = await import(R + '/js/save.js');
const Hh = 3600e3, D = 24 * Hh;
const start = new Date(2026, 10, 3, 8, 0, 0).getTime();   // 8 giờ sáng, ngày đầu
const fresh = () => { const s = defaultSave(start); s.inventory.items.thuc_an_ga = 99; return s; };
const G = C.LOVE_GAIN;
let ok = 0; const t = (name, fn) => { fn(); ok++; console.log('✓', name); };
// Chăm đủ ba việc trong ngày thứ d (tính từ 0), lúc 9 giờ sáng
const careDay = (s, d) => { const x = d * D + Hh; K.feed(s, x); K.water(s, x); for (let i = 0; i < s.coop.chickens; i++) K.pet(s, i, x); return x; };

t('người chơi mới: 0 tim', () => { assert.equal(K.hearts(fresh()), 0); assert.equal(fresh().coop.love, 0); });
t('cho ăn, đổ nước, vuốt ve đều tăng điểm thân thiết', () => {
  const s = fresh(); assert.equal(K.feed(s, 0).gain, G.feed); assert.equal(K.water(s, 0).gain, G.water); assert.equal(K.pet(s, 0, 0).gain, G.pet);
  assert.equal(s.coop.love, G.feed + G.water + G.pet);
});
t('mỗi việc một lần mỗi ngày; mỗi con gà vuốt một lần', () => {
  const s = fresh(); K.water(s, 0); assert.equal(K.water(s, Hh).reason, 'done_today');
  K.pet(s, 0, 0); assert.equal(K.pet(s, 0, Hh).reason, 'done_today'); assert.equal(K.pet(s, 1, Hh).ok, true);
  assert.equal(K.pet(s, 5, Hh).reason, 'no_chicken');
  assert.equal(s.coop.love, G.water + 2 * G.pet);
});
t('sang ngày mới được đổ nước, vuốt ve lại', () => {
  const s = fresh(); K.water(s, 0); K.pet(s, 0, 0);
  assert.equal(K.water(s, D).ok, true); assert.equal(K.pet(s, 0, D).ok, true);
});
t('vuốt ve mỗi ngày: tim tăng dần', () => {
  const s = fresh(); let last = 0;
  for (let d = 0; d < 7; d++) { careDay(s, d); assert.ok(s.coop.love > last); last = s.coop.love; }
  assert.ok(K.hearts(s) >= 3, 'chăm đủ 7 ngày được ít nhất 3 tim');
});
t('chăm đủ khoảng một tuần rưỡi thì đầy 5 tim, không vượt tối đa', () => {
  const s = fresh(); let d = 0; while (K.hearts(s) < 5 && d < 30) careDay(s, d++);
  assert.ok(d >= 6 && d <= 12, 'số ngày ' + d); for (let k = 0; k < 10; k++) careDay(s, d + k);
  assert.equal(s.coop.love, C.LOVE_MAX);
});
t('bỏ 3 ngày: không mất hết tim, chỉ giảm nhẹ', () => {
  const s = fresh(); s.coop.love = 60; K.water(s, 0);   // ngày 0 có chăm
  K.update(s, 4 * D + Hh);   // ngày 1, 2, 3 bỏ; ngày 4 mở lại
  assert.equal(s.coop.love, 60 + G.water - 3 * C.LOVE_DECAY);
  assert.ok(K.hearts(s) >= 2);
});
t('trừ điểm không lặp lại khi tính nhiều lần trong cùng ngày', () => {
  const s = fresh(); s.coop.love = 50; K.water(s, 0);
  for (let x = 2 * D; x < 2 * D + 15 * Hh; x += Hh) K.update(s, x);   // cả buổi trong ngày thứ 2
  assert.equal(s.coop.love, 50 + G.water - C.LOVE_DECAY);
});
t('quay lại chăm sau nhiều ngày: trừ phần bỏ trước rồi mới cộng', () => {
  const s = fresh(); s.coop.love = 40; K.water(s, 0);
  K.water(s, 5 * D); assert.equal(s.coop.love, 40 + G.water - 4 * C.LOVE_DECAY + G.water);
});
t('bỏ rất lâu: không xuống dưới 0', () => { const s = fresh(); s.coop.love = 10; K.water(s, 0); K.update(s, 60 * D); assert.equal(s.coop.love, 0); });
t('chưa từng chăm thì không trừ', () => { const s = fresh(); K.update(s, 10 * D); assert.equal(s.coop.love, 0); });

// ----- Trứng ngon -----
t('0 tim: toàn trứng thường', () => { const s = fresh(); K.feed(s, 0); K.update(s, 3 * Hh); assert.equal(s.coop.eggs, 2); assert.equal(s.coop.good, 0); });
t('5 tim: khoảng 3/4 số trứng là trứng ngon, chia đều theo ngày', () => {
  const s = fresh(); s.coop.love = 100; let eggs = 0, good = 0;
  for (let d = 0; d < 20; d++) { careDay(s, d); K.update(s, d * D + 4 * Hh); const r = K.collect(s, d * D + 4 * Hh); eggs += r.qty; good += r.good; }
  assert.equal(eggs, 40); assert.equal(good, 30);
});
t('tim càng cao càng nhiều trứng ngon', () => {
  const at = love => { const s = fresh(); s.coop.love = love; let g = 0; for (let d = 0; d < 10; d++) { K.feed(s, d * D); K.update(s, d * D + 3 * Hh); g += K.collect(s, d * D + 3 * Hh).good || 0; } return g; };
  assert.ok(at(20) < at(60) && at(60) < at(100));
});
t('nhặt trứng: trứng ngon và trứng thường vào túi riêng', () => {
  const s = fresh(); s.coop.love = 100; s.coop.goodAcc = 0; K.feed(s, 0); K.update(s, 3 * Hh);
  const r = K.collect(s, 3 * Hh); assert.equal(r.qty, 2); assert.equal(r.good, 1);
  assert.equal(I.count(s.inventory, 'trung_ga'), 1); assert.equal(I.count(s.inventory, 'trung_ga_ngon'), 1);
  assert.equal(s.coop.eggs, 0); assert.equal(s.coop.good, 0);
});
t('túi chỉ đủ chỗ cho một loại: không nhặt quả nào, không mất trứng', () => {
  const s = fresh(); s.coop.love = 100; s.coop.goodAcc = 0; K.feed(s, 0); K.update(s, 3 * Hh);
  s.inventory.slots = I.usedSlots(s.inventory) + 1;
  assert.equal(K.collect(s, 3 * Hh).reason, 'full'); assert.equal(I.count(s.inventory, 'trung_ga'), 0); assert.equal(s.coop.eggs, 2);
});
t('trứng ngon bán đắt hơn trứng thường; hàng xóm không đặt trứng ngon', () => {
  assert.ok(Sh.sellPrice('trung_ga_ngon') > Sh.sellPrice('trung_ga'));
  const s = fresh(); s.inventory.items.trung_ga_ngon = 3; O.syncSeen(s); assert.ok(!s.seen.includes('trung_ga_ngon'));
});
t('bản lưu cũ (chuồng chưa có điểm thân thiết) vẫn chạy', () => {
  const s = fresh(); s.coop = { chickens: 2, fedDay: null, feedAt: 0, laidFor: null, eggs: 3 };
  assert.equal(K.hearts(s), 0); assert.equal(K.pet(s, 1, 0).ok, true); assert.equal(K.collect(s, 0).qty, 3); assert.equal(I.count(s.inventory, 'trung_ga'), 3);
});
t('gà thứ 3 (level 8) cũng vuốt ve được', () => { const s = fresh(); s.coop.chickens = 3; assert.equal(K.pet(s, 2, 0).ok, true); });

console.log(`\n${ok} ca kiểm thử thân thiết với gà đều qua.`);
