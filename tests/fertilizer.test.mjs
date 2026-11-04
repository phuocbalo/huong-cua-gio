// Kiểm thử F04 Phân bón: lớn nhanh, thêm sản lượng, mỗi lứa bón một lần, mở theo level, mua ở tiệm.
// Chạy: node tests/fertilizer.test.mjs
import assert from 'node:assert/strict';
const R = process.argv[2] || new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const F = await import(R + '/js/farm.js');
const I = await import(R + '/js/inventory.js');
const C = await import(R + '/js/config.js');
const L = await import(R + '/js/level.js');
const Sh = await import(R + '/js/shop.js');
const S = await import(R + '/js/save.js');
const M = 60e3;
let ok = 0; const t = (name, fn) => { fn(); ok++; console.log('✓', name); };
const fresh = () => ({ coins: 500, xp: 0, level: 1, inventory: { slots: 12, items: { hat_ca_chua: 5, hat_rau_muong: 5, phan_lon_nhanh: 3, phan_sai_qua: 3 } }, boxes: [F.emptyBox(), F.emptyBox()] });
const CC = C.CROPS.ca_chua.growTime, SPEED = C.FERTILIZERS.phan_lon_nhanh.speed;
// Tưới đều mỗi phút như người chơi chăm cây
const tend = (s, from, to) => { for (let x = from; x <= to; x += M) s.boxes.forEach(b => { if (b.crop) { F.water(b, x); F.update(b, x); } }); };

t('cây bón phân lớn nhanh chín trước cây không bón', () => {
  const s = fresh(); F.plant(s, 0, 'hat_ca_chua', 0); F.plant(s, 1, 'hat_ca_chua', 0);
  assert.equal(F.fertilize(s, 0, 'phan_lon_nhanh', 0).ok, true);
  const T = CC / SPEED; tend(s, 0, T + M);
  assert.equal(F.isRipe(s.boxes[0]), true); assert.equal(F.isRipe(s.boxes[1]), false);
});
t('phân lớn nhanh: chín đúng sau growTime / speed khi luôn được tưới', () => {
  const s = fresh(); F.plant(s, 0, 'hat_ca_chua', 0); F.fertilize(s, 0, 'phan_lon_nhanh', 0);
  const b = s.boxes[0]; b.wateredUntil = Infinity;
  F.update(b, CC / SPEED - 1000); assert.equal(F.isRipe(b), false);
  F.update(b, CC / SPEED); assert.equal(F.isRipe(b), true);
});
t('bón giữa chừng: phần trước tính tốc độ cũ, phần sau nhanh hơn', () => {
  const s = fresh(); F.plant(s, 0, 'hat_ca_chua', 0); const b = s.boxes[0]; b.wateredUntil = Infinity;
  F.fertilize(s, 0, 'phan_lon_nhanh', CC / 2);
  assert.ok(Math.abs(b.progress - 0.5) < 1e-9);
  const end = CC / 2 + CC / 2 / SPEED; F.update(b, end - 1000); assert.equal(F.isRipe(b), false); F.update(b, end); assert.equal(F.isRipe(b), true);
});
t('thời gian còn lại tính cả phân bón', () => {
  const s = fresh(); F.plant(s, 0, 'hat_ca_chua', 0); const b = s.boxes[0]; b.wateredUntil = Infinity;
  F.fertilize(s, 0, 'phan_lon_nhanh', 0); assert.ok(Math.abs(F.timeLeft(b, 0) - CC / SPEED) < 1);
});
t('phân sai quả: lần thu lứa này thêm sản lượng', () => {
  const s = fresh(); F.plant(s, 0, 'hat_ca_chua', 0); const r = F.fertilize(s, 0, 'phan_sai_qua', 0);
  const bonus = Math.max(1, Math.round(C.CROPS.ca_chua.yield * 0.5)); assert.equal(r.bonus, bonus);
  F.update(s.boxes[0], 10 * CC); const h = F.harvest(s, 0, 10 * CC);
  assert.equal(h.qty, C.CROPS.ca_chua.yield + bonus); assert.equal(I.count(s.inventory, 'ca_chua'), h.qty);
});
t('phân sai quả không làm cây lớn nhanh hơn', () => {
  const a = fresh(); F.plant(a, 0, 'hat_ca_chua', 0); F.fertilize(a, 0, 'phan_sai_qua', 0);
  const b = fresh(); F.plant(b, 0, 'hat_ca_chua', 0);
  F.update(a.boxes[0], CC / 3); F.update(b.boxes[0], CC / 3); assert.equal(a.boxes[0].progress, b.boxes[0].progress);
});
t('rau ít sản lượng vẫn được thêm ít nhất 1', () => {
  Object.entries(C.CROPS).forEach(([crop, c]) => assert.ok(F.yieldBonus({ crop, fert: 'phan_sai_qua' }) >= 1, crop));
});
t('không bón 2 lần cho một lứa, kể cả loại khác; không mất phân', () => {
  const s = fresh(); F.plant(s, 0, 'hat_ca_chua', 0); F.fertilize(s, 0, 'phan_lon_nhanh', 0);
  assert.equal(F.fertilize(s, 0, 'phan_lon_nhanh', M).reason, 'already');
  assert.equal(F.fertilize(s, 0, 'phan_sai_qua', M).reason, 'already');
  assert.equal(I.count(s.inventory, 'phan_lon_nhanh'), 2); assert.equal(I.count(s.inventory, 'phan_sai_qua'), 3);
});
t('thu xong cây thu nhiều lần: lứa mới bón lại được, phần thêm không dồn sang lứa sau', () => {
  const s = fresh(); F.plant(s, 0, 'hat_ca_chua', 0); F.fertilize(s, 0, 'phan_sai_qua', 0);
  F.update(s.boxes[0], 10 * CC); F.harvest(s, 0, 10 * CC);
  assert.equal(s.boxes[0].fert, null); assert.equal(F.yieldBonus(s.boxes[0]), 0);
  assert.equal(F.fertilize(s, 0, 'phan_sai_qua', 10 * CC).ok, true);
});
t('cây chín, thùng trống, hết phân, không phải phân: từ chối', () => {
  const s = fresh(); assert.equal(F.fertilize(s, 0, 'phan_lon_nhanh', 0).reason, 'empty');
  F.plant(s, 0, 'hat_rau_muong', 0); F.update(s.boxes[0], 10 * CC);
  assert.equal(F.fertilize(s, 0, 'phan_lon_nhanh', 10 * CC).reason, 'ripe');
  F.plant(s, 1, 'hat_ca_chua', 0); assert.equal(F.fertilize(s, 1, 'hat_cai', 0).reason, 'not_fert');
  s.inventory.items.phan_lon_nhanh = 0; delete s.inventory.items.phan_lon_nhanh;
  assert.equal(F.fertilize(s, 1, 'phan_lon_nhanh', 0).reason, 'none'); assert.equal(s.boxes[1].fert, null);
});
t('bón khi đã tưới không đổi lần tưới', () => {
  const s = fresh(); F.plant(s, 0, 'hat_ca_chua', 0); F.water(s.boxes[0], 0); const w = s.boxes[0].wateredUntil;
  F.fertilize(s, 0, 'phan_lon_nhanh', M); assert.equal(s.boxes[0].wateredUntil, w);
});
t('tính một lần dài bằng nhiều lần ngắn khi có phân (tắt game không lệch)', () => {
  const a = fresh(), b = fresh(); [a, b].forEach(s => { F.plant(s, 0, 'hat_ca_chua', 0); F.water(s.boxes[0], 0); F.fertilize(s, 0, 'phan_lon_nhanh', 0); });
  F.update(a.boxes[0], CC * 0.6); for (let x = 0; x <= CC * 0.6; x += 1000) F.update(b.boxes[0], x);
  assert.ok(Math.abs(a.boxes[0].progress - b.boxes[0].progress) < 1e-9);
});

// ----- Tiệm và level -----
t('phân lớn nhanh mở ở level 3, phân sai quả ở level 4', () => {
  assert.equal(L.itemUnlockLevel('phan_lon_nhanh'), 3); assert.equal(L.itemUnlockLevel('phan_sai_qua'), 4);
  assert.equal(L.itemUnlockLevel('thuc_an_ga'), 1); assert.equal(L.itemUnlockLevel('hat_dua_leo'), 3);
});
t('chưa đủ level: tiệm khóa phân bón', () => {
  const s = fresh(); assert.equal(Sh.canBuy(s, 'phan_lon_nhanh', 1).reason, 'locked');
  s.xp = C.LEVELS[2].xp; assert.equal(Sh.canBuy(s, 'phan_lon_nhanh', 1).ok, true); assert.equal(Sh.canBuy(s, 'phan_sai_qua', 1).reason, 'locked');
});
t('mua phân: trừ đúng xu, phân vào túi; không bán lại được', () => {
  const s = fresh(); s.xp = C.LEVELS[3].xp; const c0 = s.coins, n0 = I.count(s.inventory, 'phan_sai_qua');
  const r = Sh.buy(s, 'phan_sai_qua', 5); assert.equal(r.ok, true); assert.equal(s.coins, c0 - 5 * C.ITEMS.phan_sai_qua.price);
  assert.equal(I.count(s.inventory, 'phan_sai_qua'), n0 + 5); assert.equal(Sh.sellPrice('phan_sai_qua'), 0);
});
t('lên level 3 và 4 được tặng 2 gói phân', () => {
  const s = S.defaultSave(0); s.xp = C.LEVELS[3].xp;
  const g3 = L.claimLevel(s, 2) && L.claimLevel(s, 3), g4 = L.claimLevel(s, 4);
  assert.ok(g3.items.some(i => i.id === 'phan_lon_nhanh' && i.qty === 2)); assert.ok(g4.items.some(i => i.id === 'phan_sai_qua' && i.qty === 2));
  assert.deepEqual(g3.unlock.items, ['phan_lon_nhanh']);
});
t('bản lưu cũ (thùng chưa có trường fert) vẫn chạy đúng', () => {
  const s = fresh(); s.boxes[0] = { crop: 'ca_chua', progress: 0.2, lastT: 0, wateredUntil: 0, harvestsLeft: 4, regrowing: false };
  F.update(s.boxes[0], M); assert.equal(F.fertilize(s, 0, 'phan_lon_nhanh', M).ok, true);
});

console.log(`\n${ok} ca kiểm thử phân bón đều qua.`);
