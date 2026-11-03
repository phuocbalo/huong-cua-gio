// Kiểm thử F19 Mở đầu cùng bà Tư (phần luật).
// Chạy: node tests/tutorial.test.mjs
import assert from 'node:assert/strict';
// tutorial.js có dùng chữ và ảnh bà Tư; giả lập document tối thiểu để nạp được trong Node
globalThis.document = globalThis.document || { getElementById: () => null };
globalThis.window = globalThis.window || { matchMedia: () => ({ matches: false }) };
const R = process.argv[2] || new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const Tu = await import(R + '/js/tutorial.js');
const F = await import(R + '/js/farm.js');
const { defaultSave } = await import(R + '/js/save.js');
let ok = 0; const t = (name, fn) => { fn(); ok++; console.log('✓', name); };
const fresh = () => defaultSave(0);

t('Đi trọn 5 bước: chào → gieo → tưới → lớn → thu → bán → xong', () => {
  const s = fresh();
  assert.equal(Tu.advance(s, 'next'), 'plant');
  assert.equal(Tu.advance(s, 'plant', 2), 'water'); assert.equal(s.tutorial.box, 2);
  assert.equal(Tu.advance(s, 'water', 2), 'grow');
  assert.equal(Tu.advance(s, 'ripe'), 'harvest');
  assert.equal(Tu.advance(s, 'harvest', 2), 'sell');
  assert.equal(Tu.advance(s, 'sell'), 'done'); assert.equal(s.tutorialDone, false, 'còn lời chào cuối');
  Tu.advance(s, 'next'); assert.equal(s.tutorialDone, true);
});
t('Bấm "Bình tưới" (tưới tất cả) cũng tính là tưới', () => { const s = fresh(); Tu.advance(s, 'next'); Tu.advance(s, 'plant', 0); assert.equal(Tu.advance(s, 'water', 'all'), 'grow'); });
t('Sự kiện không đúng bước thì không nhảy bước', () => {
  const s = fresh(); Tu.advance(s, 'next'); assert.equal(Tu.advance(s, 'sell'), 'plant'); assert.equal(Tu.advance(s, 'harvest', 0), 'plant');
  Tu.advance(s, 'plant', 1); assert.equal(Tu.advance(s, 'water', 3), 'water', 'tưới thùng khác không tính');
});
t('Bỏ qua ở bất kỳ bước nào: xong hướng dẫn, vẫn giữ hạt và xu khởi đầu', () => {
  for (const step of ['intro', 'plant', 'water', 'harvest', 'sell']) {
    const s = fresh(); s.tutorial.step = step; Tu.advance(s, 'skip');
    assert.equal(s.tutorialDone, true); assert.equal(s.coins, 120); assert.equal(s.inventory.items.hat_rau_muong, 3);
  }
});
t('Đang hướng dẫn chỉ cho chạm đúng chỗ; túi đồ và cài đặt luôn mở được', () => {
  const s = fresh(); Tu.advance(s, 'next');
  assert.equal(Tu.allows(s, 'tapBox', 0), true); assert.equal(Tu.allows(s, 'shop'), false); assert.equal(Tu.allows(s, 'coop'), false);
  assert.equal(Tu.allows(s, 'bag'), true); assert.equal(Tu.allows(s, 'settings'), true);
  F.plant(s, 0, 'hat_rau_muong', 0); Tu.advance(s, 'plant', 0);
  assert.equal(Tu.allows(s, 'tapBox', 0), true); assert.equal(Tu.allows(s, 'tapBox', 1), false); assert.equal(Tu.allows(s, 'waterAll'), true);
  s.tutorial.step = 'sell'; assert.equal(Tu.allows(s, 'shop'), true); assert.equal(Tu.allows(s, 'tapBox', 0), false);
  Tu.finish(s); assert.equal(Tu.allows(s, 'coop'), true);
});
t('Đóng game lúc đang chờ gieo nhưng thực ra đã gieo: mở lại sang bước tưới', () => { const s = fresh(); s.tutorial.step = 'plant'; F.plant(s, 1, 'hat_rau_muong', 0); assert.equal(Tu.normalize(s, 0), 'water'); assert.equal(s.tutorial.box, 1); });
t('Đóng game lúc đang chờ tưới nhưng đã tưới: mở lại sang bước lớn nhanh', () => { const s = fresh(); F.plant(s, 0, 'hat_rau_muong', 0); s.tutorial = { step: 'water', box: 0 }; F.water(s.boxes[0], 0); assert.equal(Tu.normalize(s, 1000), 'grow'); });
t('Đóng game lúc cây đang lớn nhanh, mở lại thì cây đã chín: sang bước thu hoạch', () => { const s = fresh(); F.plant(s, 0, 'hat_rau_muong', 0); s.tutorial = { step: 'grow', box: 0 }; s.boxes[0].progress = 1; assert.equal(Tu.normalize(s, 0), 'harvest'); });
t('Đóng game lúc chờ thu nhưng đã thu (thùng trống): mở lại sang bước bán', () => { const s = fresh(); s.tutorial = { step: 'harvest', box: 0 }; assert.equal(Tu.normalize(s, 0), 'sell'); });
t('Cây của hướng dẫn bị mất (thùng trống) lúc đang chờ tưới: quay về bước gieo', () => { const s = fresh(); s.tutorial = { step: 'water', box: 0 }; assert.equal(Tu.normalize(s, 0), 'plant'); });
t('Xem lại hướng dẫn từ cài đặt: bắt đầu lại từ lời chào', () => { const s = fresh(); Tu.finish(s); Tu.restart(s); assert.equal(s.tutorialDone, false); assert.equal(s.tutorial.step, 'intro'); });
console.log(`\n${ok} ca đạt`);
