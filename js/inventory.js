// F10 Kho đồ: chứa hạt giống, nông sản, sản phẩm vật nuôi.
//
// Kho có số ô giới hạn (inventory.slots). Vật phẩm cùng loại gộp chung, mỗi ô chứa tối đa STACK_SIZE;
// 120 bó rau muống chiếm 2 ô. Khi kho đầy, việc thêm đồ bị từ chối và đồ nằm lại chỗ cũ, không mất.
// File này không đụng tới giao diện, nên kiểm thử được riêng.

import { ITEMS, STACK_SIZE } from './config.js';

export const slotsFor = qty => (qty > 0 ? Math.ceil(qty / STACK_SIZE) : 0);

export function count(inv, id) { return inv.items[id] || 0; }

export function usedSlots(inv) {
  return Object.values(inv.items).reduce((n, q) => n + slotsFor(q), 0);
}

// Thêm n vật phẩm vào kho có làm tràn số ô không?
export function canAdd(inv, id, n = 1) {
  if (!ITEMS[id] || n <= 0) return false;
  const cur = count(inv, id);
  return usedSlots(inv) - slotsFor(cur) + slotsFor(cur + n) <= inv.slots;
}

// Trả về true nếu thêm được; false thì kho giữ nguyên
export function add(inv, id, n = 1) {
  if (!canAdd(inv, id, n)) return false;
  inv.items[id] = count(inv, id) + n;
  return true;
}

// Trả về true nếu đủ để bớt; false thì kho giữ nguyên
export function remove(inv, id, n = 1) {
  const cur = count(inv, id);
  if (n <= 0 || cur < n) return false;
  if (cur === n) delete inv.items[id];
  else inv.items[id] = cur - n;
  return true;
}

// Danh sách ô để vẽ lưới: mỗi phần tử là { id, qty } của MỘT ô, theo thứ tự loại rồi tên khóa.
const KIND_ORDER = ['seed', 'produce', 'animal', 'supply'];
export function slotList(inv, kind = 'all') {
  const ids = Object.keys(inv.items)
    .filter(id => ITEMS[id] && (kind === 'all' || ITEMS[id].kind === kind))
    .sort((a, b) => KIND_ORDER.indexOf(ITEMS[a].kind) - KIND_ORDER.indexOf(ITEMS[b].kind) || Object.keys(ITEMS).indexOf(a) - Object.keys(ITEMS).indexOf(b));
  const out = [];
  for (const id of ids) {
    let q = inv.items[id];
    while (q > 0) { out.push({ id, qty: Math.min(q, STACK_SIZE) }); q -= STACK_SIZE; }
  }
  return out;
}
