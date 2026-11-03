// F12 Đơn hàng hàng xóm: luôn có ORDER_SLOTS đơn ghim trên dây phơi.
// Mỗi đơn: ai đặt, món gì, bao nhiêu, thưởng bao nhiêu xu và điểm thân thiết.
// Không có hạn chót; đơn nào khó thì đổi đơn khác miễn phí.
// Chỉ đặt những món người chơi đã từng có (state.seen), để đơn luôn làm được.

import { CROPS, ITEMS, ORDER_SLOTS, ORDER_BONUS, NEIGHBORS } from './config.js';
import * as inv from './inventory.js';
import { sellPrice } from './shop.js';

export const newOrders = () => ({ list: [], nextId: 1 });
export const newFriends = () => Object.fromEntries(NEIGHBORS.map(n => [n, 0]));

// Ghi nhận món người chơi đã có: nông sản, trứng, và nông sản của hạt giống đang có hoặc đang trồng
export function syncSeen(state) {
  const seen = new Set(state.seen || []);
  const before = seen.size;
  Object.keys(state.inventory.items).forEach(id => {
    const it = ITEMS[id];
    if (!it) return;
    if (it.kind === 'seed') seen.add(it.crop);
    else if (it.kind === 'produce' || it.kind === 'animal') seen.add(id);
  });
  state.boxes.forEach(b => { if (b.crop) seen.add(b.crop); });
  if (state.coop && state.coop.chickens > 0) seen.add('trung_ga');
  state.seen = [...seen];
  return seen.size !== before;
}

// Món có thể đặt: những món đã có và anh Bảo có thu mua (để tính thưởng)
export function pool(state) {
  return (state.seen || []).filter(id => sellPrice(id) > 0);
}

// Số lượng hợp lý cho một đơn: theo sản lượng một lần thu
function qtyFor(id, rand) {
  const y = CROPS[id] ? CROPS[id].yield : 2;
  const lo = 2, hi = Math.max(lo + 1, y * 2);
  return lo + Math.floor(rand() * (hi - lo + 1));
}

export function makeOrder(state, rand = Math.random) {
  const p = pool(state);
  if (!p.length) return null;
  // Tránh trùng món với các đơn đang có nếu còn lựa chọn khác
  const taken = new Set(state.orders.list.map(o => o.item));
  const choices = p.filter(id => !taken.has(id));
  const from = choices.length ? choices : p;
  const item = from[Math.floor(rand() * from.length)];
  const qty = qtyFor(item, rand);
  return {
    id: state.orders.nextId++,
    from: NEIGHBORS[Math.floor(rand() * NEIGHBORS.length)],
    item, qty,
    coins: Math.ceil(sellPrice(item) * qty * ORDER_BONUS),
    hearts: qty >= 5 ? 2 : 1
  };
}

// Bổ sung cho đủ ORDER_SLOTS đơn. Trả về số đơn vừa thêm.
export function refill(state, rand = Math.random) {
  let n = 0;
  while (state.orders.list.length < ORDER_SLOTS) {
    const o = makeOrder(state, rand);
    if (!o) break;
    state.orders.list.push(o);
    n++;
  }
  return n;
}

export const canDeliver = (state, o) => inv.count(state.inventory, o.item) >= o.qty;

// reason: 'no_order' | 'not_enough' (missing = còn thiếu bao nhiêu)
export function deliver(state, orderId, rand = Math.random) {
  const k = state.orders.list.findIndex(o => o.id === orderId);
  if (k < 0) return { ok: false, reason: 'no_order' };
  const o = state.orders.list[k];
  const have = inv.count(state.inventory, o.item);
  if (have < o.qty) return { ok: false, reason: 'not_enough', missing: o.qty - have };
  inv.remove(state.inventory, o.item, o.qty);
  state.coins += o.coins;
  state.friends[o.from] = (state.friends[o.from] || 0) + o.hearts;
  state.orders.list.splice(k, 1);
  refill(state, rand);
  return { ok: true, order: o };
}

// Đổi đơn khác: bỏ đơn này, ghim đơn mới vào
export function skip(state, orderId, rand = Math.random) {
  const k = state.orders.list.findIndex(o => o.id === orderId);
  if (k < 0) return { ok: false, reason: 'no_order' };
  const old = state.orders.list.splice(k, 1)[0];
  // Cố tránh ghim lại đúng món vừa bỏ
  const o = makeOrder({ ...state, orders: { ...state.orders, list: [...state.orders.list, old] } }, rand);
  if (o) { o.id = state.orders.nextId++; state.orders.list.splice(k, 0, o); }
  refill(state, rand);
  return { ok: true };
}
