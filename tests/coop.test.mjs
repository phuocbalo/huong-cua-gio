// Kiểm thử chặng 3: nuôi gà (F05) và nâng cấp bản lưu cũ.
// Chạy: node tests/coop.test.mjs
import assert from 'node:assert/strict';
const R = process.argv[2] || new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const K = await import(R + '/js/coop.js');
const I = await import(R + '/js/inventory.js');
const C = await import(R + '/js/config.js');
const { migrate, defaultSave, SCHEMA_VERSION } = await import(R + '/js/save.js');

const Hh = 3600e3, D = 24 * Hh;
// Bắt đầu chơi lúc 8:00 sáng giờ địa phương để các mốc ngày dễ hiểu
const start = new Date(2026, 10, 3, 8, 0, 0).getTime();
const fresh = () => { const s = defaultSave(start); return s; };
let ok = 0; const t = (name, fn) => { fn(); ok++; console.log('✓', name); };

t('Người chơi mới có chuồng 2 gà và 5 thức ăn', () => { const s = fresh(); assert.equal(s.coop.chickens, 2); assert.equal(I.count(s.inventory, 'thuc_an_ga'), 5); });
t('Cho ăn trừ 1 thức ăn, gà chuyển sang chờ đẻ', () => { const s = fresh(); assert.equal(K.feed(s, 0).ok, true); assert.equal(I.count(s.inventory, 'thuc_an_ga'), 4); assert.equal(K.status(s, 0).key, 'digesting'); });
t('Một ngày chỉ cho ăn một lần', () => { const s = fresh(); K.feed(s, 0); assert.equal(K.feed(s, Hh).reason, 'fed_today'); assert.equal(I.count(s.inventory, 'thuc_an_ga'), 4); });
t('Hết thức ăn thì không cho ăn được', () => { const s = fresh(); s.inventory.items = {}; assert.equal(K.feed(s, 0).reason, 'no_feed'); });
t('Đẻ đúng sau LAY_DELAY, mỗi con một quả', () => { const s = fresh(); K.feed(s, 0); assert.equal(K.update(s, C.LAY_DELAY - 1000), 0); assert.equal(K.update(s, C.LAY_DELAY), 2); assert.equal(s.coop.eggs, 2); assert.equal(K.status(s, C.LAY_DELAY).key, 'done'); });
t('Mỗi ngày được cho ăn đẻ tối đa một lượt', () => { const s = fresh(); K.feed(s, 0); K.update(s, 10 * Hh); K.update(s, 12 * Hh); assert.equal(s.coop.eggs, 2); });
t('Không cho ăn 5 ngày: gà vẫn còn, chỉ không đẻ', () => { const s = fresh(); K.update(s, 5 * D); assert.equal(s.coop.chickens, 2); assert.equal(s.coop.eggs, 0); assert.equal(K.status(s, 5 * D).key, 'hungry'); });
t('Trứng chưa nhặt 3 ngày vẫn còn, và cộng dồn khi cho ăn tiếp', () => { const s = fresh(); K.feed(s, 0); K.update(s, 3 * Hh); K.feed(s, D + Hh); K.update(s, 3 * D); assert.equal(s.coop.eggs, 4); });
t('Sang ngày mới (qua nửa đêm) thì gà đói lại', () => { const s = fresh(); K.feed(s, 0); const toMidnight = K.msToNextDay(s, 0); assert.equal(toMidnight, 16 * Hh); assert.equal(K.status(s, toMidnight - 1000).key, 'done'); assert.equal(K.status(s, toMidnight).key, 'hungry'); });
t('Cho ăn rồi tắt game qua hôm sau: mở lại có trứng', () => { const s = fresh(); K.feed(s, 0); /* một lần tính dài như khi mở lại */ K.update(s, 30 * Hh); assert.equal(s.coop.eggs, 2); });
t('Nhặt trứng: vào túi, chuồng hết trứng', () => { const s = fresh(); K.feed(s, 0); const r = K.collect(s, 3 * Hh); assert.equal(r.qty, 2); assert.equal(I.count(s.inventory, 'trung_ga'), 2); assert.equal(s.coop.eggs, 0); });
t('Túi đầy: không nhặt được, trứng nằm lại trong chuồng', () => { const s = fresh(); K.feed(s, 0); s.inventory.slots = I.usedSlots(s.inventory); const r = K.collect(s, 3 * Hh); assert.equal(r.reason, 'full'); assert.equal(s.coop.eggs, 2); });
t('Không có trứng thì nhặt báo không có', () => { const s = fresh(); assert.equal(K.collect(s, 0).reason, 'none'); });
t('Ngày ảo không lùi vì thời gian game chỉ tăng', () => { const s = fresh(); assert.equal(K.dayKey(s, 0), '2026-11-03'); assert.equal(K.dayKey(s, 16 * Hh), '2026-11-04'); });

t('Nâng cấp bản lưu cũ (phiên bản 1) lên ' + SCHEMA_VERSION + ': giữ nguyên dữ liệu, thêm chuồng gà và thức ăn', () => {
  const old = { schemaVersion: 1, createdAt: start, savedAt: 1, coins: 140, clock: { lastSeen: 1, gameTime: 5, lastAway: 0, rewinds: 0, lastRewind: 0 },
    inventory: { slots: 12, items: { hat_cai: 1, rau_muong: 3 } }, boxes: [{ crop: 'cai', progress: 0.5, lastT: 0, wateredUntil: 0, harvestsLeft: 1, regrowing: false }, { crop: null }], tutorialDone: false, settings: {} };
  const m = migrate(old);
  assert.equal(m.schemaVersion, SCHEMA_VERSION); assert.equal(m.coins, 140); assert.equal(m.boxes[0].crop, 'cai'); assert.equal(m.boxes[0].progress, 0.5);
  assert.equal(I.count(m.inventory, 'rau_muong'), 3); assert.equal(I.count(m.inventory, 'thuc_an_ga'), 5); assert.equal(m.coop.chickens, 2);
  assert.equal(old.inventory.items.thuc_an_ga, undefined, 'không sửa vào bản lưu gốc');
});
t('Nâng cấp khi túi cũ đã đầy: không lỗi, chỉ không tặng thức ăn', () => {
  const old = { schemaVersion: 1, createdAt: start, coins: 1, clock: {}, inventory: { slots: 1, items: { rau_muong: 99 } }, boxes: [] };
  const m = migrate(old); assert.equal(I.count(m.inventory, 'thuc_an_ga'), 0); assert.ok(m.coop);
});
console.log(`\n${ok} ca đạt`);
