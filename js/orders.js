// F12 Đơn hàng hàng xóm: luôn có ORDER_SLOTS đơn ghim trên dây phơi.
// Mỗi đơn: ai đặt, món gì, bao nhiêu, thưởng bao nhiêu xu và điểm thân thiết, ghim lúc nào.
// - Không phạt: đơn để quá ORDER_EXPIRE thì người đặt "đã mua ngoài chợ", đơn mới thay vào.
// - Đơn khó thì đổi đơn khác miễn phí.
// - Chỉ đặt những món người chơi đã từng có (state.seen), để đơn luôn làm được.
// - Hàng xóm mở dần theo level người chơi (NEIGHBORS[...].level, bản 0.10).
// Mọi thời điểm là thời gian game (gameTime).

import { CROPS, ITEMS, ORDER_SLOTS, ORDER_BONUS, ORDER_EXPIRE, NEIGHBORS, LIKE_CHANCE } from './config.js';
import * as inv from './inventory.js';
import { sellPrice } from './shop.js';
import { levelNow } from './level.js';

export const newOrders = () => ({ list: [], nextId: 1, delivered: 0 });
export const newFriends = () => Object.fromEntries(Object.keys(NEIGHBORS).map(n => [n, 0]));

// Những hàng xóm đã quen (đủ level)
export function unlocked(state) {
  const lv = levelNow(state);
  return Object.keys(NEIGHBORS).filter(n => NEIGHBORS[n].level <= lv);
}

// Hàng xóm kế tiếp sẽ quen và ở level nào
export function nextNeighbor(state) {
  const lv = levelNow(state);
  const n = Object.keys(NEIGHBORS).filter(k => NEIGHBORS[k].level > lv).sort((a, b) => NEIGHBORS[a].level - NEIGHBORS[b].level)[0];
  return n ? { id: n, level: NEIGHBORS[n].level } : null;
}

// Hàng xóm mới quen (vừa lên level): gửi ngay một đơn của họ, thay đơn ghim cuối cùng, để người chơi gặp họ
export function welcome(state, who, now, rand = Math.random) {
  if (state.orders.list.some(x => x.from === who)) return false;
  const o = makeOrder(state, now, rand, who);
  if (!o) return false;
  if (state.orders.list.length >= ORDER_SLOTS) state.orders.list.pop();
  state.orders.list.push(o);
  return true;
}

// Ghi nhận món người chơi đã có: nông sản, trứng, và nông sản của hạt giống đang có hoặc đang trồng
export function syncSeen(state) {
  const seen = new Set(state.seen || []);
  const before = seen.size;
  Object.keys(state.inventory.items).forEach(id => {
    const it = ITEMS[id];
    if (!it || it.noOrder) return;
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

// Số lượng hợp lý cho một đơn: theo sản lượng một lần thu, nhân hệ số của người đặt
function qtyFor(id, who, rand) {
  const y = CROPS[id] ? CROPS[id].yield : 2;
  const lo = 2, hi = Math.max(lo + 1, y * 2);
  const q = lo + Math.floor(rand() * (hi - lo + 1));
  return Math.max(2, Math.round(q * (NEIGHBORS[who].bulk || 1)));
}

// forceWho: chọn sẵn người đặt (dùng khi vừa quen một hàng xóm mới)
export function makeOrder(state, now, rand = Math.random, forceWho = null) {
  const p = pool(state);
  if (!p.length) return null;
  // Người đặt: ưu tiên người chưa có đơn trên dây phơi
  const people = unlocked(state);
  const busy = new Set(state.orders.list.map(o => o.from));
  const free = people.filter(n => !busy.has(n));
  const fromList = free.length ? free : people;
  const who = forceWho || fromList[Math.floor(rand() * fromList.length)];
  // Món: thường là món người đó thích (nếu đã có), tránh trùng món với đơn đang ghim
  const taken = new Set(state.orders.list.map(o => o.item));
  const likes = NEIGHBORS[who].likes.filter(id => p.includes(id) && !taken.has(id));
  const others = p.filter(id => !taken.has(id));
  const choices = likes.length && rand() < LIKE_CHANCE ? likes : (others.length ? others : p);
  const item = choices[Math.floor(rand() * choices.length)];
  const qty = qtyFor(item, who, rand);
  return {
    id: state.orders.nextId++,
    from: who, item, qty,
    coins: Math.ceil(sellPrice(item) * qty * ORDER_BONUS),
    hearts: qty >= 5 ? 2 : 1,
    createdAt: now
  };
}

// Bổ sung cho đủ ORDER_SLOTS đơn. Trả về số đơn vừa thêm.
export function refill(state, now, rand = Math.random) {
  let n = 0;
  while (state.orders.list.length < ORDER_SLOTS) {
    const o = makeOrder(state, now, rand);
    if (!o) break;
    state.orders.list.push(o);
    n++;
  }
  return n;
}

// Đơn quá hạn: thay bằng đơn mới ngay tại chỗ đó. Trả về danh sách đơn vừa bị thay.
export function expire(state, now, rand = Math.random) {
  const gone = [];
  const list = state.orders.list;
  for (let k = 0; k < list.length; k++) {
    const o = list[k];
    if (o.createdAt == null) o.createdAt = now;          // đơn cũ từ bản trước chưa có mốc thời gian
    if (now - o.createdAt < ORDER_EXPIRE) continue;
    gone.push(o);
    // Đơn mới tránh trùng món với các đơn còn lại và đơn vừa hết hạn
    const fresh = makeOrder({ ...state, orders: { ...state.orders, list: list.filter((_, j) => j !== k).concat([o]) } }, now, rand);
    if (fresh) { fresh.id = state.orders.nextId++; list[k] = fresh; }
    else { list.splice(k, 1); k--; }
  }
  if (gone.length) refill(state, now, rand);
  return gone;
}

// Còn bao lâu nữa thì đơn hết hạn
export const timeLeft = (o, now) => Math.max(0, (o.createdAt ?? now) + ORDER_EXPIRE - now);

export const canDeliver = (state, o) => inv.count(state.inventory, o.item) >= o.qty;

// reason: 'no_order' | 'not_enough' (missing = còn thiếu bao nhiêu)
// Trả về cả danh sách hàng xóm vừa quen nhờ đơn này (newFriends)
export function deliver(state, orderId, now, rand = Math.random) {
  const k = state.orders.list.findIndex(o => o.id === orderId);
  if (k < 0) return { ok: false, reason: 'no_order' };
  const o = state.orders.list[k];
  const have = inv.count(state.inventory, o.item);
  if (have < o.qty) return { ok: false, reason: 'not_enough', missing: o.qty - have };
  const before = new Set(unlocked(state));
  inv.remove(state.inventory, o.item, o.qty);
  state.coins += o.coins;
  state.friends[o.from] = (state.friends[o.from] || 0) + o.hearts;
  state.orders.delivered = (state.orders.delivered || 0) + 1;
  state.orders.list.splice(k, 1);
  const met = unlocked(state).filter(n => !before.has(n));
  refill(state, now, rand);
  // Người mới quen thì gửi ngay một đơn (thay đơn vừa ghim cuối cùng) để người chơi gặp họ
  if (met.length && !state.orders.list.some(x => x.from === met[0])) {
    const last = state.orders.list.pop();
    state.orders.list.push(makeOrder(state, now, rand, met[0]) || last);
  }
  return { ok: true, order: o, met };
}

// Đổi đơn khác: bỏ đơn này, ghim đơn mới vào đúng chỗ
export function skip(state, orderId, now, rand = Math.random) {
  const k = state.orders.list.findIndex(o => o.id === orderId);
  if (k < 0) return { ok: false, reason: 'no_order' };
  const old = state.orders.list.splice(k, 1)[0];
  // Cố tránh ghim lại đúng món vừa bỏ
  const o = makeOrder({ ...state, orders: { ...state.orders, list: [...state.orders.list, old] } }, now, rand);
  if (o) { o.id = state.orders.nextId++; state.orders.list.splice(k, 0, o); }
  refill(state, now, rand);
  return { ok: true };
}
