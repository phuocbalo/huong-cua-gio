// Kiểm thử F23 Quét bụi sân thượng và nâng cấp bản lưu lên phiên bản 3.
// Chạy: node tests/dust.test.mjs
import assert from 'node:assert/strict';
const R = process.argv[2] || new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const Dz = await import(R + '/js/dust.js');
const C = await import(R + '/js/config.js');
const { migrate, defaultSave, SCHEMA_VERSION } = await import(R + '/js/save.js');
const D = 24 * 3600e3;
// Số ngẫu nhiên lặp lại được để kiểm thử ổn định
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
let ok = 0; const t = (name, fn) => { fn(); ok++; console.log('✓', name); };

t('Người chơi mới: chưa có bụi, hẹn bụi bám sau 3–4 ngày', () => {
  const s = defaultSave(0); assert.deepEqual(s.dust.spots, []);
  assert.ok(s.dust.nextAt >= 3 * D && s.dust.nextAt <= 4 * D);
});
t('Chưa đến hẹn thì không bám bụi', () => { const s = { dust: Dz.newDust(0, seq(0)), coins: 0 }; assert.equal(Dz.update(s, 3 * D - 1000), 0); assert.equal(s.dust.spots.length, 0); });
t('Đến hẹn thì bám 3–4 vệt, ở các chỗ khác nhau', () => {
  for (const r of [0, 0.3, 0.6, 0.99]) {
    const s = { dust: Dz.newDust(0, seq(0)), coins: 0 };
    const n = Dz.update(s, 3 * D, seq(r, 0.5, 0.2, 0.8, 0.1, 0.9, 0.4, 0.7));
    assert.ok(n >= C.DUST_SPOTS_MIN && n <= C.DUST_SPOTS_MAX, 'số vệt ' + n);
    assert.equal(new Set(s.dust.spots).size, n);
    assert.ok(s.dust.spots.every(i => i >= 0 && i < C.DUST_SPOT_COUNT));
  }
});
t('Còn bụi thì không bám thêm', () => { const s = { dust: Dz.newDust(0, seq(0)), coins: 0 }; Dz.update(s, 3 * D, seq(0)); const before = [...s.dust.spots]; Dz.update(s, 9 * D, seq(0.9)); assert.deepEqual(s.dust.spots, before); });
t('Quét một vệt: mất vệt đó, +5 xu', () => { const s = { dust: { spots: [1, 4, 6], nextAt: 0 }, coins: 100 }; const r = Dz.sweep(s, 4, 0); assert.equal(r.ok, true); assert.equal(s.coins, 100 + C.DUST_REWARD); assert.deepEqual(s.dust.spots, [1, 6]); assert.equal(r.clean, false); });
t('Quét chỗ không có bụi: không được xu', () => { const s = { dust: { spots: [1], nextAt: 0 }, coins: 100 }; assert.equal(Dz.sweep(s, 3, 0).ok, false); assert.equal(s.coins, 100); });
t('Quét sạch thì hẹn lần sau sau 3–4 ngày', () => { const s = { dust: { spots: [2], nextAt: 0 }, coins: 0 }; const r = Dz.sweep(s, 2, 10 * D, seq(0.5)); assert.equal(r.clean, true); assert.equal(s.dust.nextAt, 10 * D + 3.5 * D); });
t('Tắt game 5 ngày: mở lại thấy bụi (một lần tính dài)', () => { const s = { dust: Dz.newDust(0, seq(0.2)), coins: 0 }; assert.ok(Dz.update(s, 5 * D) > 0); });
t('Nâng cấp bản lưu phiên bản 2 lên ' + SCHEMA_VERSION + ': giữ chuồng gà, thêm bụi hẹn sau 3–4 ngày', () => {
  const old = { schemaVersion: 2, createdAt: 0, coins: 77, clock: { gameTime: 10 * D }, inventory: { slots: 12, items: { trung_ga: 2 } }, boxes: [{ crop: null }], coop: { chickens: 2, eggs: 1, fedDay: null, feedAt: 0, laidFor: null } };
  const m = migrate(old);
  assert.equal(m.schemaVersion, SCHEMA_VERSION); assert.equal(m.coins, 77); assert.equal(m.coop.eggs, 1);
  assert.deepEqual(m.dust.spots, []); assert.ok(m.dust.nextAt >= 13 * D && m.dust.nextAt <= 14 * D);
});
t('Nâng cấp liền từ phiên bản 1 lên ' + SCHEMA_VERSION, () => {
  const v1 = { schemaVersion: 1, createdAt: 0, coins: 1, clock: { gameTime: 0 }, inventory: { slots: 12, items: {} }, boxes: [] };
  const m = migrate(v1); assert.equal(m.schemaVersion, SCHEMA_VERSION); assert.ok(m.coop && m.dust);
});
console.log(`\n${ok} ca đạt`);
