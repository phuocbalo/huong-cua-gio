// Kiểm thử F08 Ngày và đêm: đúng màu ở giữa mỗi khung giờ, không giật khi chuyển khung.
// Chạy: node tests/daylight.test.mjs
import assert from 'node:assert/strict';
const R = process.argv[2] || new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const { skyAt } = await import(R + '/js/daylight.js');
const { PERIODS } = await import(R + '/js/config.js');

let ok = 0; const t = (name, fn) => { fn(); ok++; console.log('✓', name); };
const ch = (c, s) => (c >> s) & 255;
const maxChannelDiff = (a, b) => Math.max(...[16, 8, 0].map(s => Math.abs(ch(a, s) - ch(b, s))));

t('Giữa mỗi khung giờ ra đúng màu của khung đó', () => {
  [[8, 'morning'], [14, 'afternoon'], [18, 'evening'], [22, 'night'], [2, 'night']].forEach(([h, p]) => {
    assert.equal(skyAt(h).skyTop, PERIODS[p].skyTop, h + 'h');
    assert.equal(skyAt(h).lit, PERIODS[p].lit, h + 'h');
  });
});

t('Không giật: hai phút liền nhau, mỗi kênh màu lệch không quá 6 trên 255', () => {
  let worst = 0;
  for (let m = 0; m < 24 * 60; m++) {
    const a = skyAt(m / 60), b = skyAt((m + 1) / 60);
    for (const k of ['skyTop', 'skyBot', 'far', 'mid', 'near', 'shade']) worst = Math.max(worst, maxChannelDiff(a[k], b[k]));
    assert.ok(Math.abs(a.lit - b.lit) < 0.02 && Math.abs(a.lamp - b.lamp) < 0.04, 'đèn đổi quá nhanh lúc ' + m + ' phút');
  }
  assert.ok(worst <= 6, 'lệch lớn nhất ' + worst);
});

t('Qua nửa đêm liền mạch (23:59 → 0:00)', () => {
  assert.ok(maxChannelDiff(skyAt(23 + 59 / 60).skyTop, skyAt(0).skyTop) <= 1);
});

t('Ban ngày có mặt trời, ban đêm có mặt trăng', () => {
  assert.equal(skyAt(12).sun.alpha, 1); assert.equal(skyAt(12).moon.alpha, 0);
  assert.equal(skyAt(23).sun.alpha, 0); assert.ok(skyAt(23).moon.alpha > 0.9);
  assert.ok(skyAt(12).sun.y < skyAt(7).sun.y, 'trưa mặt trời cao hơn sáng sớm');
});

t('Phố lên đèn dần buổi tối', () => {
  assert.ok(skyAt(16).lit < skyAt(17.2).lit && skyAt(17.2).lit < skyAt(19).lit && skyAt(19).lit < skyAt(21).lit);
});

console.log(`\n${ok} ca đạt`);
