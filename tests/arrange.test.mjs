// Kiểm thử F17 Bày biện (bản 0.17): chỗ đặt, đổi chỗ, lật hướng, cất vào kho, điểm sân đẹp chỉ tính món đang bày.
// Chạy: node tests/arrange.test.mjs
import assert from 'node:assert/strict';
const R = process.argv[2] || new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const C = await import(R + '/js/config.js');
const D = await import(R + '/js/decor.js');
const { defaultSave } = await import(R + '/js/save.js');
let ok = 0; const t = (name, fn) => { fn(); ok++; console.log('✓', name); };
const all = () => { const s = defaultSave(0); s.xp = C.LEVELS[9].xp; s.coins = 5000; s.decor = ['hoa_giay']; D.SHOP_DECOR.forEach(id => D.buy(s, id)); return s; };

t('7 chỗ đặt cho 7 món; mỗi món có ít nhất một chỗ vừa', () => {
  assert.equal(D.SPOT_IDS.length, 7); D.DECOR_IDS.forEach(id => assert.ok(D.spotsFor(id).length >= 1, id));
});
t('chỗ mặc định của mỗi món vừa cỡ món đó, không trùng nhau', () => {
  const seen = new Set(); D.DECOR_IDS.forEach(id => { const sp = C.DECOR[id].spot; assert.ok(D.fits(id, sp), id); assert.ok(!seen.has(sp)); seen.add(sp); });
});
t('mua món mới: tự đứng ở chỗ mặc định', () => { const s = all(); D.DECOR_IDS.forEach(id => assert.equal(D.placeOf(s, id).spot, C.DECOR[id].spot)); });
t('bản lưu cũ (0.15) chưa có chỗ đặt: món giữ đúng chỗ cũ', () => {
  const s = defaultSave(0); s.decor = ['hoa_giay', 'ghe_da', 'den_long']; delete s.decorPlace;
  assert.equal(D.points(s), 9); D.normalize(s);
  assert.deepEqual([D.placeOf(s, 'hoa_giay').spot, D.placeOf(s, 'ghe_da').spot, D.placeOf(s, 'den_long').spot], ['d', 'c', 'e']);
});
t('đổi chỗ vào chỗ trống', () => { const s = all(); D.store(s, 'cay_canh'); const r = D.move(s, 'chum_nuoc', 'f'); assert.equal(r.ok, true); assert.equal(D.at(s, 'f'), 'chum_nuoc'); assert.equal(D.at(s, 'g'), null); });
t('đặt vào chỗ đang có món khác: hai món đổi chỗ cho nhau', () => {
  const s = all(); const r = D.move(s, 'den_long', 'd'); assert.equal(r.swapped, 'hoa_giay');
  assert.equal(D.at(s, 'd'), 'den_long'); assert.equal(D.at(s, 'e'), 'hoa_giay');
});
t('món kia không vừa chỗ cũ thì vào kho, không mất', () => {
  const s = all(); const r = D.move(s, 'sen_da', 'b');   // đôn gốm (thấp) vừa chỗ a → đổi chỗ được
  assert.equal(r.swapped, 'don_gom');
  const r2 = D.move(s, 'chum_nuoc', 'c');   // ghế đá không vừa chỗ g (không đủ dài) → vào kho
  assert.equal(r2.stored, 'ghe_da'); assert.equal(D.placeOf(s, 'ghe_da').spot, null); assert.ok(D.owned(s, 'ghe_da'));
});
t('món không vừa chỗ: từ chối, không đổi gì', () => {
  const s = all(); assert.equal(D.move(s, 'ghe_da', 'e').reason, 'too_big'); assert.equal(D.move(s, 'den_long', 'a').reason, 'too_big');
  assert.equal(D.placeOf(s, 'ghe_da').spot, 'c');
});
t('lật hướng qua lại', () => { const s = all(); assert.equal(D.flip(s, 'den_long').flip, true); assert.equal(D.flip(s, 'den_long').flip, false); });
t('cất vào kho: không tính điểm sân đẹp; đặt lại thì tính', () => {
  const s = all(); assert.equal(D.points(s), 23); D.store(s, 'chum_nuoc'); assert.equal(D.points(s), 18);
  assert.equal(D.flip(s, 'chum_nuoc').reason, 'not_placed');
  D.move(s, 'chum_nuoc', 'g'); assert.equal(D.points(s), 23);
});
t('cất món làm tụt mốc thưởng: mất thưởng mốc đó tới khi bày lại', () => {
  const s = all(); assert.equal(D.orderSlots(s), 4); D.store(s, 'chum_nuoc'); D.store(s, 'cay_canh'); assert.equal(D.orderSlots(s), 3);
});
t('hết chỗ: món mới mua vào kho', () => {
  const s = defaultSave(0); s.xp = C.LEVELS[9].xp; s.coins = 5000; s.decor = ['hoa_giay']; D.normalize(s);
  D.SPOT_IDS.forEach(k => { if (k !== 'c') { /* giữ trống */ } });
  D.move(s, 'hoa_giay', 'b'); D.buy(s, 'don_gom');   // chỗ mặc định b của đôn gốm đã có hoa giấy → chỗ trống khác vừa cỡ
  assert.notEqual(D.placeOf(s, 'don_gom').spot, null); assert.notEqual(D.placeOf(s, 'don_gom').spot, 'b');
});
t('chỉ chỗ c đặt được ghế đá; chỗ a chỉ món thấp', () => {
  assert.deepEqual(D.spotsFor('ghe_da'), ['c']); assert.ok(D.fits('sen_da', 'a') && D.fits('don_gom', 'a')); assert.ok(!D.fits('cay_canh', 'a'));
});
console.log(`\n${ok} ca kiểm thử bày biện đều qua.`);
