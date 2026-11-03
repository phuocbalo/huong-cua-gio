// Kiểm thử F19 Mở đầu cùng bà Tư (phần luật).
// Chạy: node tests/tutorial.test.mjs
import assert from 'node:assert/strict';
// tutorial.js có dùng chữ và ảnh bà Tư; giả lập document tối thiểu để nạp được trong Node
globalThis.document = globalThis.document || { getElementById: () => null };
globalThis.window = globalThis.window || { matchMedia: () => ({ matches: false }) };
const R = process.argv[2] || new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const Tu = await import(R + '/js/tutorial.js');
const F = await import(R + '/js/farm.js');
const C = await import(R + '/js/coop.js');
const { defaultSave } = await import(R + '/js/save.js');
let ok = 0; const t = (name, fn) => { fn(); ok++; console.log('✓', name); };
const fresh = () => defaultSave(0);

t('Đi trọn các bước: chào → gieo → tưới → lớn → thu → bán → cho gà ăn → xong', () => {
  const s = fresh();
  assert.equal(Tu.advance(s, 'next'), 'plant');
  assert.equal(Tu.advance(s, 'plant', 2), 'water'); assert.equal(s.tutorial.box, 2);
  assert.equal(Tu.advance(s, 'water', 2), 'grow');
  assert.equal(Tu.advance(s, 'ripe'), 'harvest');
  assert.equal(Tu.advance(s, 'harvest', 2), 'sell');
  assert.equal(Tu.advance(s, 'sell'), 'feed');
  assert.equal(Tu.advance(s, 'feed'), 'done'); assert.equal(s.tutorialDone, false, 'còn lời chào cuối');
  Tu.advance(s, 'next'); assert.equal(s.tutorialDone, true);
});
t('Bấm "Bình tưới" (tưới tất cả) cũng tính là tưới', () => { const s = fresh(); Tu.advance(s, 'next'); Tu.advance(s, 'plant', 0); assert.equal(Tu.advance(s, 'water', 'all'), 'grow'); });
t('Sự kiện không đúng bước thì không nhảy bước', () => {
  const s = fresh(); Tu.advance(s, 'next'); assert.equal(Tu.advance(s, 'sell'), 'plant'); assert.equal(Tu.advance(s, 'harvest', 0), 'plant');
  Tu.advance(s, 'plant', 1); assert.equal(Tu.advance(s, 'water', 3), 'water', 'tưới thùng khác không tính');
});
t('Không còn bỏ qua được: sự kiện "skip" không làm gì', () => {
  for (const step of ['intro', 'plant', 'water', 'harvest', 'sell', 'feed']) { const s = fresh(); s.tutorial.step = step; assert.equal(Tu.advance(s, 'skip'), step); assert.equal(s.tutorialDone, false); }
});
t('Đang hướng dẫn chỉ cho chạm đúng chỗ; túi đồ, cài đặt cũng khóa', () => {
  const s = fresh(); Tu.advance(s, 'next');
  assert.equal(Tu.allows(s, 'tapBox', 0), true); assert.equal(Tu.allows(s, 'shop'), false); assert.equal(Tu.allows(s, 'coop'), false);
  assert.equal(Tu.allows(s, 'bag'), false); assert.equal(Tu.allows(s, 'settings'), false); assert.equal(Tu.allows(s, 'info'), true);
  assert.equal(Tu.allows(s, 'plant', 'hat_rau_muong'), true); assert.equal(Tu.allows(s, 'plant', 'hat_cai'), false, 'chỉ gieo hạt rau muống');
  F.plant(s, 0, 'hat_rau_muong', 0); Tu.advance(s, 'plant', 0);
  assert.equal(Tu.allows(s, 'tapBox', 0), true); assert.equal(Tu.allows(s, 'tapBox', 1), false); assert.equal(Tu.allows(s, 'waterAll'), true);
  s.tutorial.step = 'sell'; s.inventory.items.rau_muong = 3; s.inventory.items.trung_ga = 2;
  assert.equal(Tu.allows(s, 'shop'), true); assert.equal(Tu.allows(s, 'tapBox', 0), false);
  assert.equal(Tu.allows(s, 'sell', 'rau_muong'), true); assert.equal(Tu.allows(s, 'sell', 'trung_ga'), false, 'chỉ bán món mũi tên chỉ');
  s.tutorial.step = 'feed'; assert.equal(Tu.allows(s, 'feed'), true); assert.equal(Tu.allows(s, 'coop'), false); assert.equal(Tu.allows(s, 'shop'), false);
  Tu.finish(s); assert.equal(Tu.allows(s, 'coop'), true); assert.equal(Tu.allows(s, 'bag'), true);
});
t('Túi đầy không thu được: sang bước bán để không kẹt', () => { const s = fresh(); s.tutorial = { step: 'harvest', box: 0 }; assert.equal(Tu.advance(s, 'harvestFull'), 'sell'); });
t('Bước bán mà không còn gì để bán: sang bước cho gà ăn', () => { const s = fresh(); s.tutorial = { step: 'sell', box: 0 }; assert.equal(Tu.normalize(s, 0), 'feed'); });
t('Bước cho gà ăn mà gà đã ăn hôm nay: xong hướng dẫn', () => { const s = fresh(); s.tutorial = { step: 'feed', box: 0 }; C.feed(s, 1000); assert.equal(Tu.normalize(s, 2000), 'done'); });
t('Món mũi tên chỉ trong tiệm: ưu tiên rau muống', () => { const s = fresh(); s.inventory.items.trung_ga = 1; assert.equal(Tu.sellTarget(s), 'trung_ga'); s.inventory.items.rau_muong = 3; assert.equal(Tu.sellTarget(s), 'rau_muong'); });
t('Đóng game lúc đang chờ gieo nhưng thực ra đã gieo: mở lại sang bước tưới', () => { const s = fresh(); s.tutorial.step = 'plant'; F.plant(s, 1, 'hat_rau_muong', 0); assert.equal(Tu.normalize(s, 0), 'water'); assert.equal(s.tutorial.box, 1); });
t('Đóng game lúc đang chờ tưới nhưng đã tưới: mở lại sang bước lớn nhanh', () => { const s = fresh(); F.plant(s, 0, 'hat_rau_muong', 0); s.tutorial = { step: 'water', box: 0 }; F.water(s.boxes[0], 0); assert.equal(Tu.normalize(s, 1000), 'grow'); });
t('Đóng game lúc cây đang lớn nhanh, mở lại thì cây đã chín: sang bước thu hoạch', () => { const s = fresh(); F.plant(s, 0, 'hat_rau_muong', 0); s.tutorial = { step: 'grow', box: 0 }; s.boxes[0].progress = 1; assert.equal(Tu.normalize(s, 0), 'harvest'); });
t('Đóng game lúc chờ thu nhưng đã thu (thùng trống): mở lại sang bước bán', () => { const s = fresh(); s.inventory.items.rau_muong = 3; s.tutorial = { step: 'harvest', box: 0 }; assert.equal(Tu.normalize(s, 0), 'sell'); });
t('Cây của hướng dẫn bị mất (thùng trống) lúc đang chờ tưới: quay về bước gieo', () => { const s = fresh(); s.tutorial = { step: 'water', box: 0 }; assert.equal(Tu.normalize(s, 0), 'plant'); });
t('Xem lại hướng dẫn từ cài đặt: bắt đầu lại từ lời chào', () => { const s = fresh(); Tu.finish(s); Tu.restart(s); assert.equal(s.tutorialDone, false); assert.equal(s.tutorial.step, 'intro'); });

// ----- Hướng dẫn trả đơn cho hàng xóm -----
const O = await import(R + '/js/orders.js');
const ready = () => { const s = fresh(); Tu.finish(s); s.orders.list = [{ id: 1, from: 'ba_tu', item: 'rau_muong', qty: 2, coins: 10, hearts: 1, at: 0 }]; return s; };
t('Trả đơn: chưa xong hướng dẫn chính thì chưa hiện', () => { const s = ready(); s.tutorialDone = false; s.inventory.items.rau_muong = 5; assert.equal(Tu.ordersTipStep(s, false), null); });
t('Trả đơn: chưa đủ hàng thì chưa hiện', () => { const s = ready(); assert.equal(Tu.ordersTipStep(s, false), null); });
t('Trả đơn: lần đầu đủ hàng → chạm dây phơi; mở bảng → bấm Giao hàng', () => { const s = ready(); s.inventory.items.rau_muong = 2; assert.equal(Tu.ordersTipStep(s, false), 'notes'); assert.equal(Tu.ordersTipStep(s, true), 'deliver'); });
t('Trả đơn: bảng làm mới ngay sau khi giao (đã giao 1 đơn) vẫn không tắt hướng dẫn đang chạy', () => { const s = ready(); s.inventory.items.rau_muong = 2; Tu.ordersTipStep(s, true); s.orders.delivered = 1; s.inventory.items.rau_muong = 0; Tu.ordersTipStep(s, true); assert.equal(s.tips.orders, 'active'); Tu.ordersTipDelivered(s, true); assert.equal(Tu.ordersTipStep(s, false), 'thanks'); });
t('Trả đơn: giao xong khi đang hướng dẫn → lời cuối → xong, không hiện lại', () => { const s = ready(); s.inventory.items.rau_muong = 2; Tu.ordersTipDelivered(s, true); assert.equal(Tu.ordersTipStep(s, false), 'thanks'); Tu.ordersTipFinish(s); s.inventory.items.rau_muong = 9; assert.equal(Tu.ordersTipStep(s, false), null); });
t('Trả đơn: người chơi đã tự giao đơn trước đó → không hiện', () => { const s = ready(); s.orders.delivered = 1; s.inventory.items.rau_muong = 2; assert.equal(Tu.ordersTipStep(s, false), null); assert.equal(s.tips.orders, 'done'); });
console.log(`\n${ok} ca đạt`);
