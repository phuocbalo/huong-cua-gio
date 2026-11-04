// Kiểm thử level (bản 0.10). Chạy: node tests/level.test.mjs
import assert from 'node:assert/strict';
const R = process.argv[2] || new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const C = await import(R + '/js/config.js');
const L = await import(R + '/js/level.js');
const S = await import(R + '/js/shop.js');
const I = await import(R + '/js/inventory.js');
const { defaultSave, migrate } = await import(R + '/js/save.js');
let ok = 0; const t = (name, fn) => { fn(); ok++; console.log('✓', name); };
const fresh = () => defaultSave(0);

t('Có đúng 10 level, điểm cần tăng dần', () => { assert.equal(C.LEVELS.length, 10); C.LEVELS.forEach((x, i) => { if (i) assert.ok(x.xp > C.LEVELS[i - 1].xp); }); });
t('Người chơi mới ở level 1, 0 điểm', () => { const s = fresh(); assert.equal(L.levelNow(s), 1); assert.equal(s.xp, 0); });
t('levelOf: đúng mốc', () => { assert.equal(L.levelOf(19), 1); assert.equal(L.levelOf(20), 2); assert.equal(L.levelOf(539), 9); assert.equal(L.levelOf(99999), 10); });
t('Điểm theo việc: thu hoạch theo nhóm cây, giao đơn, gà, bụi', () => {
  assert.equal(L.xpFor('harvest', 'rau_muong'), C.XP.harvest[1]); assert.equal(L.xpFor('harvest', 'dua_leo'), C.XP.harvest[2]); assert.equal(L.xpFor('harvest', 'ca_chua'), C.XP.harvest[3]);
  assert.equal(L.xpFor('deliver'), C.XP.deliver); assert.equal(L.xpFor('dust', 3), 3 * C.XP.dust);
});
t('Cộng điểm qua mốc: báo các level vừa đạt, nhận quà từng level đúng một lần', () => {
  const s = fresh(); const c0 = s.coins;
  const r = L.addXp(s, 55); assert.deepEqual(r.ups, [2, 3]);
  const g2 = L.claimLevel(s, 2), g3 = L.claimLevel(s, 3);
  assert.equal(g2.coins + g3.coins, 45); assert.equal(s.coins, c0 + 45);
  assert.equal(I.count(s.inventory, 'hat_hung_que'), 2); assert.equal(I.count(s.inventory, 'hat_dua_leo'), 2);
  assert.equal(L.claimLevel(s, 3), null, 'không nhận quà hai lần'); assert.deepEqual(L.pendingLevels(s), []);
});
t('Quà khi túi đầy: đổi ra xu, không mất', () => {
  const s = fresh(); s.inventory.slots = I.usedSlots(s.inventory); s.xp = 20; const c0 = s.coins;
  const g = L.claimLevel(s, 2); assert.equal(g.items.length, 0); assert.equal(s.coins, c0 + 20 + 2 * C.CROPS.hung_que.seedPrice);
});
t('Tiệm: hạt khóa theo level, thức ăn gà bán sẵn', () => {
  const s = fresh(); s.coins = 999;
  assert.equal(S.canBuy(s, 'hat_rau_muong', 1).ok, true); assert.equal(S.canBuy(s, 'thuc_an_ga', 1).ok, true);
  const r = S.canBuy(s, 'hat_dua_leo', 1); assert.equal(r.reason, 'locked'); assert.equal(r.level, 3);
  s.xp = C.LEVELS[2].xp; assert.equal(S.canBuy(s, 'hat_dua_leo', 1).ok, true); assert.equal(S.canBuy(s, 'hat_ca_chua', 1).level, 7);
});
t('Mua thùng mở ở level 2, nâng cấp túi ở level 5', () => {
  const s = fresh(); s.coins = 999;
  assert.equal(S.buyBox(s).reason, 'locked'); assert.equal(S.buyBagUpgrade(s).reason, 'locked');
  s.xp = C.LEVELS[1].xp; assert.equal(S.buyBox(s).ok, true); assert.equal(S.buyBagUpgrade(s).reason, 'locked');
  s.xp = C.LEVELS[4].xp; assert.equal(S.buyBagUpgrade(s).ok, true);
});
t('Level 8 thêm 1 con gà, level 10 mở chậu hoa giấy', () => {
  const s = fresh(); const n0 = s.coop.chickens; s.xp = 9999;
  for (let lv = 2; lv <= 10; lv++) L.claimLevel(s, lv);
  assert.equal(s.coop.chickens, n0 + 1); assert.deepEqual(s.decor, ['hoa_giay']); assert.equal(s.level, 10);
});
t('Tiến độ: level cao nhất thì đầy thanh', () => { const s = fresh(); s.xp = 30; const p = L.progress(s); assert.equal(p.level, 2); assert.equal(p.have, 10); assert.equal(p.need, 30); s.xp = 9999; assert.equal(L.progress(s).max, true); });
t('Nâng cấp bản lưu cũ: xếp level theo số đơn đã giao, giữ hàng xóm đã quen', () => {
  const v6 = fresh(); v6.schemaVersion = 6; delete v6.xp; delete v6.level; delete v6.decor; v6.orders.delivered = 7;
  const m = migrate(v6); assert.ok(m.schemaVersion >= 7); assert.equal(L.levelNow(m), 6); assert.equal(m.level, 6);
  const v6b = fresh(); v6b.schemaVersion = 6; delete v6b.xp; v6b.orders.delivered = 0; v6b.boxes = Array.from({ length: 5 }, () => ({ crop: null }));
  assert.equal(L.levelNow(migrate(v6b)), 2, 'đã mua thùng thì ít nhất level 2');
  const v6c = fresh(); v6c.schemaVersion = 6; delete v6c.xp; v6c.orders.delivered = 25; const mc = migrate(v6c);
  assert.equal(L.levelNow(mc), 10); assert.equal(mc.coop.chickens, v6c.coop.chickens + 1); assert.deepEqual(mc.decor, ['hoa_giay']);
});
console.log(`\n${ok} ca đạt`);
