// F11 Tiệm tạp hóa anh Bảo, F14 mua thêm thùng xốp, và nâng cấp túi đồ (F10).
// Mọi hàm trả về { ok, ... } hoặc { ok: false, reason } để giao diện báo lý do cho người chơi.

import { CROPS, ITEMS, SHOP_BUY, SHOP_SELL_KINDS, BAG_UPGRADES, BOX_PRICES, MAX_BOXES, START_BOXES } from './config.js';
import * as inv from './inventory.js';
import { emptyBox } from './farm.js';
import { isUnlocked, itemUnlockLevel, levelNow, unlockLevel } from './level.js';

// Giá anh Bảo mua của người chơi (mỗi món)
export function sellPrice(id) {
  const it = ITEMS[id];
  if (!it || !SHOP_SELL_KINDS.includes(it.kind)) return 0;
  return CROPS[id] ? CROPS[id].sellPrice : (it.sellPrice || 0);
}

// Giá người chơi mua ở tiệm (mỗi món)
export function buyPrice(id) {
  const it = ITEMS[id];
  if (!it || !SHOP_BUY.includes(id)) return 0;
  return it.kind === 'seed' ? CROPS[it.crop].seedPrice : (it.price || 0);
}

// Danh sách món bán được đang có trong túi
export function sellable(state) {
  return Object.keys(state.inventory.items).filter(id => sellPrice(id) > 0 && inv.count(state.inventory, id) > 0);
}

// reason: 'not_sellable' | 'not_enough'
export function sell(state, id, qty) {
  const price = sellPrice(id);
  if (!price) return { ok: false, reason: 'not_sellable' };
  if (qty <= 0 || !inv.remove(state.inventory, id, qty)) return { ok: false, reason: 'not_enough' };
  state.coins += price * qty;
  return { ok: true, coins: price * qty };
}

// Có mua được không, để giao diện làm mờ nút và ghi lý do. reason: 'not_for_sale' | 'locked' | 'coins' | 'bag_full'
export function canBuy(state, id, qty) {
  const price = buyPrice(id);
  if (!price) return { ok: false, reason: 'not_for_sale' };
  const need = itemUnlockLevel(id);
  if (levelNow(state) < need) return { ok: false, reason: 'locked', level: need };
  if (state.coins < price * qty) return { ok: false, reason: 'coins', missing: price * qty - state.coins };
  if (!inv.canAdd(state.inventory, id, qty)) return { ok: false, reason: 'bag_full' };
  return { ok: true, cost: price * qty };
}

export function buy(state, id, qty) {
  const c = canBuy(state, id, qty);
  if (!c.ok) return c;
  inv.add(state.inventory, id, qty);
  state.coins -= c.cost;
  return { ok: true, cost: c.cost };
}

// ----- Nâng cấp túi đồ -----
export function nextBagUpgrade(state) {
  const done = state.bagUpgrades || 0;
  return done < BAG_UPGRADES.length ? BAG_UPGRADES[done] : null;
}

// reason: 'max' | 'locked' | 'coins'
export function buyBagUpgrade(state) {
  const up = nextBagUpgrade(state);
  if (!up) return { ok: false, reason: 'max' };
  if (!isUnlocked(state, 'bag')) return { ok: false, reason: 'locked', level: unlockLevel('bag') };
  if (state.coins < up.price) return { ok: false, reason: 'coins', missing: up.price - state.coins };
  state.coins -= up.price;
  state.inventory.slots += up.slots;
  state.bagUpgrades = (state.bagUpgrades || 0) + 1;
  return { ok: true, slots: state.inventory.slots };
}

// ----- F14 Mua thêm thùng xốp -----
export function nextBoxPrice(state) {
  if (state.boxes.length >= MAX_BOXES) return 0;
  return BOX_PRICES[Math.max(0, state.boxes.length - START_BOXES)] || 0;
}

// reason: 'max' | 'locked' | 'coins'. Trả về index của thùng mới
export function buyBox(state) {
  const price = nextBoxPrice(state);
  if (!price) return { ok: false, reason: 'max' };
  if (!isUnlocked(state, 'boxes')) return { ok: false, reason: 'locked', level: unlockLevel('boxes') };
  if (state.coins < price) return { ok: false, reason: 'coins', missing: price - state.coins };
  state.coins -= price;
  state.boxes.push(emptyBox());
  return { ok: true, index: state.boxes.length - 1, cost: price };
}
