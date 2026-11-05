// Kiểm thử B-01 (bản 0.16.2): câu phụ dưới đơn hàng có đủ cho mọi người đặt và mọi loại hàng.
// Chạy: node tests/flavor.test.mjs
import assert from 'node:assert/strict';
const R = process.argv[2] || new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const { T } = await import(R + '/js/text.vi.js');
const C = await import(R + '/js/config.js');
let ok = 0; const t = (name, fn) => { fn(); ok++; console.log('✓', name); };
t('mỗi hàng xóm có câu cho cả 4 loại hàng (rau quả, trứng, vật nuôi, món nấu)', () => {
  Object.keys(C.NEIGHBORS).forEach(n => ['veg', 'egg', 'pet', 'dish'].forEach(k => {
    const arr = T['order_flavor_' + n + '_' + k]; assert.ok(Array.isArray(arr) && arr.length >= 2, n + '_' + k);
  }));
});
t('không còn câu cũ chọn theo người đặt', () => { Object.keys(C.NEIGHBORS).forEach(n => assert.equal(T['order_flavor_' + n], undefined)); });
console.log(`\n${ok} ca kiểm thử câu đơn hàng đều qua.`);
