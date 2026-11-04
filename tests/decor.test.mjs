// Kiểm thử trang trí sân (bản 0.15). Chạy: node tests/decor.test.mjs
import assert from 'node:assert/strict';
const R = process.argv[2] || new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const C = await import(R + '/js/config.js');
const Dc = await import(R + '/js/decor.js');
const O = await import(R + '/js/orders.js');
const { defaultSave } = await import(R + '/js/save.js');
let ok = 0; const t = (name, fn) => { fn(); ok++; console.log('✓', name); };
const lv10 = () => { const s = defaultSave(0); s.xp = C.LEVELS[9].xp; s.coins = 1000; return s; };

t('Đủ bộ 5 món = 18 điểm', () => { assert.equal(Dc.maxPoints(), 18); });
t('Dưới level 10 chưa mua được', () => { const s = defaultSave(0); s.coins = 999; const r = Dc.canBuy(s, 'ghe_da'); assert.equal(r.reason, 'locked'); assert.equal(r.level, 10); });
t('Chậu hoa giấy không bán (quà level 10)', () => { assert.equal(Dc.canBuy(lv10(), 'hoa_giay').reason, 'not_for_sale'); });
t('Mua ghế đá: trừ xu, thêm vào sân, +3 điểm; không mua lại được', () => {
  const s = lv10(); const r = Dc.buy(s, 'ghe_da'); assert.equal(r.ok, true); assert.equal(s.coins, 920);
  assert.equal(Dc.points(s), 3); assert.equal(Dc.canBuy(s, 'ghe_da').reason, 'owned');
});
t('Thiếu xu: báo thiếu bao nhiêu', () => { const s = lv10(); s.coins = 50; const r = Dc.canBuy(s, 'den_long'); assert.equal(r.reason, 'coins'); assert.equal(r.missing, 70); });
t('Mốc 5 điểm: thêm 1 tim mỗi đơn; 10 điểm: thêm 10% xu', () => {
  const s = lv10(); s.decor = ['hoa_giay']; const o = { coins: 40, hearts: 1 };
  assert.deepEqual(Dc.orderReward(s, o), { coins: 40, hearts: 1 });
  const r = Dc.buy(s, 'ghe_da'); assert.deepEqual(r.perks.map(p => p.perk), ['heart']);
  assert.deepEqual(Dc.orderReward(s, o), { coins: 40, hearts: 2 });
  assert.deepEqual(Dc.buy(s, 'den_long').perks, [], '9 điểm: chưa tới mốc 10');
  const r2 = Dc.buy(s, 'cay_canh'); assert.deepEqual(r2.perks.map(p => p.perk), ['coins']);
  assert.deepEqual(Dc.orderReward(s, o), { coins: 44, hearts: 2 });
});
t('Mốc 18 điểm: 4 ô đơn hàng', () => {
  const s = lv10(); s.decor = ['hoa_giay']; O.syncSeen(s); O.refill(s, 0); assert.equal(s.orders.list.length, 3);
  ['ghe_da', 'den_long', 'cay_canh'].forEach(id => Dc.buy(s, id)); assert.equal(Dc.orderSlots(s), 3);
  const r = Dc.buy(s, 'chum_nuoc'); assert.deepEqual(r.perks.map(p => p.perk), ['slot']);
  assert.equal(Dc.orderSlots(s), 4); O.refill(s, 0); assert.equal(s.orders.list.length, 4);
});
t('Giao đơn nhận đúng thưởng đã cộng sân đẹp', () => {
  const s = lv10(); s.decor = ['hoa_giay', 'ghe_da', 'den_long', 'cay_canh']; O.syncSeen(s); O.refill(s, 0);
  const o = s.orders.list[0]; s.inventory.items[o.item] = 99; const c0 = s.coins, f0 = s.friends[o.from];
  const r = O.deliver(s, o.id, 0); assert.equal(r.coins, o.coins + Math.ceil(o.coins * 0.1)); assert.equal(r.hearts, o.hearts + 1);
  assert.equal(s.coins, c0 + r.coins); assert.equal(s.friends[o.from], f0 + r.hearts);
});
console.log(`\n${ok} ca đạt`);
