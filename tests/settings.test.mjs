// Kiểm thử chặng 5: nhập/xuất file lưu (F21, N04) và nâng cấp bản lưu lên phiên bản 6.
// Chạy: node tests/settings.test.mjs
import assert from 'node:assert/strict';
const R = process.argv[2] || new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const { migrate, defaultSave, validateImport, exportText, SCHEMA_VERSION } = await import(R + '/js/save.js');
let ok = 0; const t = (name, fn) => { fn(); ok++; console.log('✓', name); };

t('Người chơi mới: chưa xem hướng dẫn, tắt chế độ kiểm thử, có chỗ ghi thống kê', () => {
  const s = defaultSave(0); assert.equal(s.tutorialDone, false); assert.equal(s.tutorial.step, 'intro'); assert.equal(s.settings.testMode, false); assert.deepEqual(s.stats, { days: [], sessions: 0, playMs: 0 });
});
t('Xuất rồi nhập lại: ra đúng bản lưu (xu, thùng, cây, túi)', () => {
  const s = defaultSave(0); s.coins = 345; s.boxes[1] = { crop: 'cai', progress: 0.5, lastT: 0, wateredUntil: 0, harvestsLeft: 1, regrowing: false }; s.inventory.items.trung_ga = 7;
  const r = validateImport(exportText(s, 123));
  assert.equal(r.ok, true); assert.equal(r.data.coins, 345); assert.equal(r.data.boxes[1].crop, 'cai'); assert.equal(r.data.inventory.items.trung_ga, 7);
  assert.equal(r.summary.coins, 345); assert.equal(r.summary.boxes, 4);
});
t('Nhập file không phải JSON: báo lỗi, không đổi gì', () => { assert.equal(validateImport('xin chào').reason, 'not_json'); });
t('Nhập file JSON lạ (không phải bản lưu của game): báo lỗi', () => {
  assert.equal(validateImport('{"a":1}').reason, 'not_save');
  assert.equal(validateImport(JSON.stringify({ app: 'game-khac', save: defaultSave(0) })).reason, 'not_save');
  assert.equal(validateImport(JSON.stringify({ app: 'san-thuong-xanh', save: { schemaVersion: 6 } })).reason, 'not_save');
});
t('Nhập file từ bản game mới hơn: báo cần cập nhật game', () => { const s = defaultSave(0); s.schemaVersion = SCHEMA_VERSION + 1; assert.equal(validateImport(exportText(s)).reason, 'newer'); });
t('Nhập file xuất từ bản cũ (phiên bản 2): được nâng cấp lên bản mới nhất', () => {
  const old = { schemaVersion: 2, createdAt: 0, coins: 50, clock: { lastSeen: 0, gameTime: 0 }, inventory: { slots: 12, items: { cai: 2 } }, boxes: [{ crop: null }], coop: { chickens: 2, eggs: 0, fedDay: null, feedAt: 0, laidFor: null } };
  const r = validateImport(JSON.stringify({ app: 'san-thuong-xanh', save: old }));
  assert.equal(r.ok, true); assert.equal(r.data.schemaVersion, SCHEMA_VERSION); assert.equal(r.data.coins, 50); assert.ok(r.data.dust && r.data.orders && r.data.stats);
});
t('Nâng cấp bản lưu phiên bản 5: bỏ qua hướng dẫn, bật chế độ kiểm thử, giữ âm lượng đã chỉnh', () => {
  const v5 = { schemaVersion: 5, createdAt: 0, coins: 9, clock: { gameTime: 0 }, inventory: { slots: 12, items: {} }, boxes: [], settings: { music: 0.2, sfx: 0.9 }, tutorialDone: false };
  const m = migrate(v5);
  assert.equal(m.tutorialDone, true); assert.equal(m.settings.testMode, true); assert.equal(m.settings.music, 0.2); assert.equal(m.settings.sfx, 0.9); assert.equal(m.stats.sessions, 0);
});
console.log(`\n${ok} ca đạt`);
