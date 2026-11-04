// Kiểm thử F09 Thời tiết: lịch cố định theo seed, mưa tưới cây kể cả lúc tắt game, không mưa trong lúc hướng dẫn.
// Chạy: node tests/weather.test.mjs
import assert from 'node:assert/strict';
const R = process.argv[2] || new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const W = await import(R + '/js/weather.js');
const F = await import(R + '/js/farm.js');
const C = await import(R + '/js/config.js');
const S = await import(R + '/js/save.js');
const M = 60e3, Hh = 3600e3, D = 24 * Hh, B = C.WEATHER_BLOCK;
let ok = 0; const t = (name, fn) => { fn(); ok++; console.log('✓', name); };
const wx = (seed = 12345, since = 0) => ({ seed, since, forced: [] });
// Tìm khối có mưa đầu tiên của một seed
const firstRain = w => { for (let b = 0; b < 400; b++) { const p = W.blockPlan(w.seed, b); if (p.rains.length) return p.rains[0]; } };
const plantBox = (crop, at) => { const s = { inventory: { slots: 5, items: { ['hat_' + crop]: 1 } }, boxes: [F.emptyBox()] }; F.plant(s, 0, 'hat_' + crop, at); return s.boxes[0]; };

t('cùng seed, cùng thời điểm → cùng kiểu trời (tính lại sau khi tắt game vẫn khớp)', () => {
  const a = wx(), b = wx();
  for (let x = 0; x < 3 * D; x += 7 * M) assert.equal(W.kindAt(a, x), W.kindAt(b, x));
});
t('seed khác cho lịch khác', () => {
  let diff = 0; for (let x = 0; x < 20 * D; x += B) if (W.kindAt(wx(1), x) !== W.kindAt(wx(2), x)) diff++;
  assert.ok(diff > 10);
});
t('tỉ lệ các kiểu trời gần với config (5000 khối)', () => {
  const n = { sun: 0, cloud: 0, wind: 0, rain: 0 };
  for (let b = 0; b < 5000; b++) n[W.blockPlan(777, b).kind]++;
  for (const k of W.KINDS) assert.ok(Math.abs(n[k] / 5000 - C.WEATHER_CHANCE[k]) < 0.03, k + ' ' + n[k]);
});
t('khối mưa có 2–3 trận, mỗi trận 15–40 phút, nằm trong khối; khối khác không mưa', () => {
  for (let b = 0; b < 2000; b++) {
    const p = W.blockPlan(99, b);
    if (p.kind !== 'rain') { assert.equal(p.rains.length, 0); continue; }
    assert.ok(p.rains.length >= 1 && p.rains.length <= 3);
    for (const [s, e] of p.rains) { assert.ok(s >= b * B && e <= (b + 1) * B); assert.ok(e - s >= C.RAIN_LEN[0] - 1 && e - s <= 2 * C.RAIN_LEN[1]); }
  }
});
t('trung bình mỗi ngày có mưa khoảng 40–100 phút', () => {
  const w = wx(4242); const per = W.total(W.rainIntervals(w, 0, 200 * D)) / 200 / M;
  assert.ok(per > 40 && per < 100, per);
});
t('chưa xong hướng dẫn (since = null): trời luôn nắng, không mưa', () => {
  const w = { seed: 12345, since: null, forced: [] };
  assert.equal(W.rainIntervals(w, 0, 30 * D).length, 0);
  assert.equal(W.kindAt(w, firstRain(wx())[0] + M), 'sun');
});
t('không có mưa trước lúc since', () => {
  const r = firstRain(wx()); const w = wx(12345, r[1] + 1);
  assert.equal(W.total(W.rainIntervals(w, 0, r[1])), 0);
});
t('đang mưa: kindAt = rain; giữa hai trận của khối mưa: mây', () => {
  const w = wx(), r = firstRain(w);
  assert.equal(W.kindAt(w, r[0] + 1000), 'rain');
  const b = Math.floor(r[0] / B), p = W.blockPlan(w.seed, b);
  const gap = p.rains[0][0] > b * B + 1000 ? b * B + 500 : p.rains[p.rains.length - 1][1] + 500;
  if (gap < (b + 1) * B) assert.equal(W.kindAt(w, gap), 'cloud');
});

// ----- Mưa tưới cây -----
t('lúc mưa: cây không khô, tưới bằng tay báo "đang mưa"', () => {
  const w = wx(), r = firstRain(w); W.bind(() => w);
  const b = plantBox('ca_chua', r[0] - 2 * M);
  assert.equal(F.isDry(b, r[0] - M), true);
  assert.equal(F.isDry(b, r[0] + M), false);
  assert.equal(F.water(b, r[0] + M).reason, 'rain');
  // tạnh rồi đất còn ẩm thêm RAIN_WET_AFTER, sau đó khô lại
  const c = plantBox('ca_chua', r[1] + C.RAIN_WET_AFTER - 2 * M);   // cây mới gieo, chưa chín
  assert.equal(F.isDry(c, r[1] + C.RAIN_WET_AFTER - M), false);
  assert.equal(F.isDry(c, r[1] + C.RAIN_WET_AFTER + M), true);
  W.bind(() => null);
});
t('mưa lúc tắt game: mở lại cây lớn đúng như được tưới phần thời gian mưa', () => {
  const w = wx(), r = firstRain(w); W.bind(() => w);
  const start = r[0] - 5 * M, end = r[1] + 5 * M;
  const b = plantBox('ca_chua', start);
  F.update(b, end);   // một lần dài, như mở game sau khi vắng
  const wet = r[1] - r[0] + C.RAIN_WET_AFTER, dt = end - start;
  const expect = Math.min(1, (Math.min(wet, end - r[0]) + (dt - Math.min(wet, end - r[0])) * C.UNWATERED_SPEED) / C.CROPS.ca_chua.growTime);
  assert.ok(Math.abs(b.progress - expect) < 1e-9, b.progress + ' vs ' + expect);
  // cây không có mưa (thời tiết chưa bắt đầu) lớn chậm hơn
  W.bind(() => null);
  const c = plantBox('ca_chua', start); F.update(c, end);
  assert.ok(c.progress < b.progress);
});
t('tính một lần dài bằng tính từng giây (mưa xen giữa)', () => {
  const w = wx(), r = firstRain(w); W.bind(() => w);
  const start = r[0] - 4 * M, end = r[1] + 4 * M;
  const a = plantBox('ca_chua', start), b = plantBox('ca_chua', start);
  F.water(a, start); F.water(b, start);
  F.update(a, end); for (let x = start; x <= end; x += 1000) F.update(b, x); F.update(b, end);
  assert.ok(Math.abs(a.progress - b.progress) < 1e-9);
  W.bind(() => null);
});
t('tưới tay và mưa trùng nhau không bị tính hai lần', () => {
  const w = wx(), r = firstRain(w); W.bind(() => w);
  const b = plantBox('ca_chua', r[0]);
  b.wateredUntil = r[0] + C.WATER_DURATION;   // vừa tưới tay đúng lúc trời đổ mưa
  const end = r[0] + 5 * M; F.update(b, end);
  assert.ok(Math.abs(b.progress - 5 * M / C.CROPS.ca_chua.growTime) < 1e-9);
  W.bind(() => null);
});
t('thời gian còn lại tính cả phần đất ẩm vì mưa', () => {
  const w = wx(), r = firstRain(w); W.bind(() => w);
  const b = plantBox('rau_muong', r[0] + M);
  assert.equal(F.timeLeft(b, r[0] + M), C.CROPS.rau_muong.growTime);
  W.bind(() => null);
});
t('vắng 30 ngày có mưa: không lỗi, cây chín', () => {
  const w = wx(); W.bind(() => w);
  const b = plantBox('ca_chua', 0); F.update(b, 30 * D); assert.equal(F.isRipe(b), true);
  W.bind(() => null);
});

// ----- Bản thử: đặt tay kiểu trời -----
t('đặt mưa ngay: mưa từ bây giờ trong khoảng đã chọn; "Tự động" trả về theo lịch', () => {
  const w = wx(5), now = 3 * D + 17 * M;
  W.force(w, 'rain', now, 30 * M);
  assert.equal(W.kindAt(w, now + M), 'rain');
  assert.ok(W.total(W.rainIntervals(w, now, now + 30 * M)) >= 30 * M - 1);
  W.force(w, 'auto', now + 5 * M);
  const plan = W.kindAt(wx(5), now + 6 * M);
  assert.equal(W.kindAt(w, now + 6 * M), plan);
});
t('đặt nắng đè lên trận mưa theo lịch', () => {
  const w = wx(), r = firstRain(w);
  W.force(w, 'sun', r[0] - M, Hh);
  assert.equal(W.kindAt(w, r[0] + M), 'sun');
  assert.equal(W.total(W.rainIntervals(w, r[0] - M, r[0] + Hh - M)), 0);
});
t('báo trước trận mưa kế tiếp', () => {
  const w = wx(), r = firstRain(w);
  const n = W.nextRain(w, r[0] - Hh, 3 * Hh);
  assert.ok(n && Math.abs(n.s - r[0]) < 1 && n.e >= r[1] - 1);
  assert.equal(W.nextRain(w, r[0] - 5 * Hh, Hh), null);
});

// ----- Bản lưu -----
t('bản lưu mới có thời tiết, chưa bắt đầu', () => { const s = S.defaultSave(0); assert.equal(s.schemaVersion, 8); assert.equal(s.weather.since, null); assert.ok(Number.isInteger(s.weather.seed)); });
t('bản lưu cũ (7) đã xong hướng dẫn: có thời tiết từ lúc cập nhật', () => {
  const old = { ...S.defaultSave(0), schemaVersion: 7, tutorialDone: true, clock: { gameTime: 5 * D, lastSeen: 0 } }; delete old.weather;
  const s = S.migrate(old); assert.equal(s.schemaVersion, 8); assert.equal(s.weather.since, 5 * D);
});
t('bản lưu cũ (7) chưa xong hướng dẫn: thời tiết chờ', () => {
  const old = { ...S.defaultSave(0), schemaVersion: 7, tutorialDone: false }; delete old.weather;
  assert.equal(S.migrate(old).weather.since, null);
});

console.log(`\n${ok} ca kiểm thử thời tiết đều qua.`);
