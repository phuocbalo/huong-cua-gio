// Kiểm thử luật chơi chặng 1: gieo hạt (F01), tưới nước (F02), thu hoạch (F03), kho đồ (F10).
import assert from 'node:assert/strict';
// Chạy: node tests/farm.test.mjs
const R = process.argv[2] || new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const F = await import(R + '/js/farm.js');
const I = await import(R + '/js/inventory.js');
const C = await import(R + '/js/config.js');
const M = 60e3, Hh = 3600e3;
const WD = C.WATER_DURATION, SLOW = C.UNWATERED_SPEED;
const RM = C.CROPS.rau_muong.growTime / 60000, CC = C.CROPS.ca_chua.growTime;   // phút chín của rau muống, ms chín của cà chua
// Thời gian chín khi chỉ tưới MỘT lần lúc bắt đầu một lứa dài `g`
const ripeAfterOneWater = g => (WD >= g ? g : WD + (g - WD) / SLOW);
const fresh = () => ({ inventory: { slots: 3, items: { hat_rau_muong: 1, hat_ca_chua: 2 } }, boxes: [F.emptyBox(), F.emptyBox()] });
let ok = 0; const t = (name, fn) => { fn(); ok++; console.log('✓', name); };

t('F01 gieo trừ 1 hạt, thùng có cây', () => { const s = fresh(); assert.equal(F.plant(s, 0, 'hat_rau_muong', 0).ok, true); assert.equal(I.count(s.inventory, 'hat_rau_muong'), 0); assert.equal(s.boxes[0].crop, 'rau_muong'); });
t('F01 gieo vào thùng đã có cây bị từ chối, không mất hạt', () => { const s = fresh(); F.plant(s, 0, 'hat_ca_chua', 0); const r = F.plant(s, 0, 'hat_ca_chua', 0); assert.equal(r.reason, 'occupied'); assert.equal(I.count(s.inventory, 'hat_ca_chua'), 1); });
t('F01 hết hạt thì không gieo được', () => { const s = fresh(); F.plant(s, 0, 'hat_rau_muong', 0); assert.equal(F.plant(s, 1, 'hat_rau_muong', 0).reason, 'no_seed'); });
t('F01 đi đủ 4 giai đoạn hình', () => { const s = fresh(); F.plant(s, 0, 'hat_rau_muong', 0); const b = s.boxes[0]; const seen = new Set();
  for (let m = 0; m <= RM; m += RM / 30) { F.water(b, m * M); F.update(b, m * M); seen.add(F.stageOf(b)); } assert.deepEqual([...seen], ['seed', 'sprout', 'grown', 'ripe']); });
t('F02 tưới đủ: rau muống chín đúng thời gian trong config', () => { const s = fresh(); F.plant(s, 0, 'hat_rau_muong', 0); const b = s.boxes[0]; F.water(b, 0); F.update(b, (RM - 0.1) * M); assert.equal(F.isRipe(b), false); F.update(b, RM * M); assert.equal(F.isRipe(b), true); });
t('F02 không tưới: lớn bằng 50%, chín sau gấp đôi thời gian', () => { const s = fresh(); F.plant(s, 0, 'hat_rau_muong', 0); const b = s.boxes[0]; F.update(b, (RM / SLOW - 0.5) * M); assert.equal(F.isRipe(b), false); F.update(b, RM / SLOW * M); assert.equal(F.isRipe(b), true); });
t('F02 bỏ 3 ngày không tưới: cây vẫn còn', () => { const s = fresh(); F.plant(s, 0, 'hat_ca_chua', 0); const b = s.boxes[0]; F.update(b, 72 * Hh); assert.equal(b.crop, 'ca_chua'); });
t('F02 hai cây cùng loại, cây tưới chín trước', () => { const s = fresh(); F.plant(s, 0, 'hat_ca_chua', 0); F.plant(s, 1, 'hat_ca_chua', 0); F.water(s.boxes[0], 0); const T = ripeAfterOneWater(CC); F.updateAll(s, T); assert.equal(F.isRipe(s.boxes[0]), true); assert.equal(F.isRipe(s.boxes[1]), false); });
t('F02 hết tác dụng tưới giữa chừng: phần sau lớn chậm', () => { const s = fresh(); F.plant(s, 0, 'hat_ca_chua', 0); const b = s.boxes[0]; F.water(b, 0);
  // tưới đủ tốc độ trong WD đầu, phần còn lại lớn bằng 50% → chín muộn hơn thời gian gốc
  const T = ripeAfterOneWater(CC); assert.ok(T > CC);
  F.update(b, T - 60e3); assert.equal(F.isRipe(b), false); F.update(b, T); assert.equal(F.isRipe(b), true); });
t('F02 tưới lại khi đang còn tác dụng: báo đã tưới', () => { const s = fresh(); F.plant(s, 0, 'hat_ca_chua', 0); F.water(s.boxes[0], 0); assert.equal(F.water(s.boxes[0], M).reason, 'already'); });
t('F02 tính một lần dài bằng nhiều lần ngắn (tắt game không lệch)', () => { const a = fresh(), b = fresh(); F.plant(a, 0, 'hat_ca_chua', 0); F.plant(b, 0, 'hat_ca_chua', 0); F.water(a.boxes[0], 0); F.water(b.boxes[0], 0);
  F.update(a.boxes[0], CC * 0.9); for (let x = 0; x <= CC * 0.9; x += 1000) F.update(b.boxes[0], x); assert.ok(Math.abs(a.boxes[0].progress - b.boxes[0].progress) < 1e-9); });
t('F02 thời gian lùi không làm mất tiến độ', () => { const s = fresh(); F.plant(s, 0, 'hat_ca_chua', 0); const b = s.boxes[0]; F.update(b, 2 * Hh); const p = b.progress; F.update(b, 1 * Hh); assert.equal(b.progress, p); });
t('F03 chưa chín không thu được', () => { const s = fresh(); F.plant(s, 0, 'hat_rau_muong', 0); assert.equal(F.harvest(s, 0, M).reason, 'not_ripe'); });
t('F03 thu rau muống: thùng trống lại, kho +3', () => { const s = fresh(); F.plant(s, 0, 'hat_rau_muong', 0); F.update(s.boxes[0], 60 * M); const r = F.harvest(s, 0, 60 * M); assert.equal(r.qty, 3); assert.equal(I.count(s.inventory, 'rau_muong'), 3); assert.equal(s.boxes[0].crop, null); });
t('F03 thu cà chua: quay về giai đoạn lớn, chín lại sau regrowTime nếu tưới đủ', () => { const s = fresh(); F.plant(s, 0, 'hat_ca_chua', 0); const b = s.boxes[0]; F.update(b, 16 * Hh); F.harvest(s, 0, 16 * Hh);
  assert.equal(F.stageOf(b), 'grown'); assert.equal(b.harvestsLeft, 3);
  // tưới lại mỗi khi khô, như người chơi chăm đều
  const R = C.CROPS.ca_chua.regrowTime, end = 16 * Hh + R;
  for (let x = 16 * Hh; x < end - 6e3; x += 60e3) { F.water(b, x); F.update(b, x); }
  F.update(b, end - 6e3); assert.equal(F.isRipe(b), false); F.water(b, end - 6e3); F.update(b, end); assert.equal(F.isRipe(b), true); });
t('F03 cà chua thu đủ 4 lần thì thùng trống', () => { const s = fresh(); s.inventory.slots = 10; F.plant(s, 0, 'hat_ca_chua', 0); let T = 0; for (let k = 0; k < 4; k++) { T += 100 * Hh; F.update(s.boxes[0], T); assert.equal(F.harvest(s, 0, T).ok, true); } assert.equal(s.boxes[0].crop, null); assert.equal(I.count(s.inventory, 'ca_chua'), 12); });
t('F10 kho đầy: không thu được, cây giữ nông sản', () => { const s = fresh(); s.inventory = { slots: 1, items: { hat_ca_chua: 1 } }; F.plant(s, 0, 'hat_ca_chua', 0); s.inventory.items.cai = 5; s.inventory.slots = 1; F.update(s.boxes[0], 100 * Hh);
  const r = F.harvest(s, 0, 100 * Hh); assert.equal(r.reason, 'full'); assert.equal(F.isRipe(s.boxes[0]), true); assert.equal(I.count(s.inventory, 'ca_chua'), 0); });
t('F10 gộp cùng loại, 120 món chiếm 2 ô', () => { const inv = { slots: 2, items: {} }; assert.ok(I.add(inv, 'rau_muong', 120)); assert.equal(I.usedSlots(inv), 2); assert.equal(I.add(inv, 'cai', 1), false); assert.equal(I.slotList(inv).length, 2); });
t('F10 timeLeft khớp với lúc chín thật', () => { const s = fresh(); F.plant(s, 0, 'hat_ca_chua', 0); const b = s.boxes[0]; F.water(b, 0); F.update(b, Hh); const left = F.timeLeft(b, Hh); F.update(b, Hh + left - 1000); assert.equal(F.isRipe(b), false); F.update(b, Hh + left); assert.equal(F.isRipe(b), true); });
console.log(`\n${ok} ca đạt`);
