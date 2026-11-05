// F16 Bếp nhỏ: nấu nông sản, trứng, sản phẩm vật nuôi thành món, bán giá cao hơn nguyên liệu.
//
// Bản lưu: kitchen = { cooking: null | { id, start, end }, ready: null | id }
//   Một bếp nấu một món mỗi lần. Nấu xong (theo thời gian game, kể cả lúc tắt game) món nằm trên bếp chờ lấy;
//   lấy món xong mới nấu món khác. Túi đầy thì món vẫn nằm trên bếp, không mất.
// Luật thuần, kiểm thử được bằng Node.

import { RECIPES } from './config.js';
import * as inv from './inventory.js';
import { isUnlocked, unlockLevel } from './level.js';

export const IDS = Object.keys(RECIPES);

export function kitchen(state) {
  if (!state.kitchen) state.kitchen = { cooking: null, ready: null };
  return state.kitchen;
}

export const unlocked = state => isUnlocked(state, 'kitchen');
export const kitchenLevel = () => unlockLevel('kitchen');
export const recipeLevel = id => unlockLevel('recipes', id);
export const recipeUnlocked = (state, id) => isUnlocked(state, 'recipes', id);

// Nguyên liệu còn thiếu: [{ id, need, have }]
export function missing(state, id) {
  return Object.entries(RECIPES[id].needs)
    .map(([item, need]) => ({ id: item, need, have: inv.count(state.inventory, item) }))
    .filter(x => x.have < x.need);
}

// Nấu xong thì chuyển sang "chờ lấy". Trả về id món vừa xong (hoặc null).
export function update(state, now) {
  const k = kitchen(state);
  if (k.cooking && now >= k.cooking.end) {
    const id = k.cooking.id;
    k.ready = id;
    k.cooking = null;
    return id;
  }
  return null;
}

// Có nấu được không. reason: 'locked' | 'recipe_locked' | 'busy' | 'missing'
export function canCook(state, id, now) {
  if (!RECIPES[id]) return { ok: false, reason: 'unknown' };
  if (!unlocked(state)) return { ok: false, reason: 'locked', level: kitchenLevel() };
  if (!recipeUnlocked(state, id)) return { ok: false, reason: 'recipe_locked', level: recipeLevel(id) };
  update(state, now);
  const k = kitchen(state);
  if (k.cooking || k.ready) return { ok: false, reason: 'busy' };
  const miss = missing(state, id);
  if (miss.length) return { ok: false, reason: 'missing', missing: miss };
  return { ok: true };
}

export function cook(state, id, now) {
  const c = canCook(state, id, now);
  if (!c.ok) return c;
  Object.entries(RECIPES[id].needs).forEach(([item, n]) => inv.remove(state.inventory, item, n));
  kitchen(state).cooking = { id, start: now, end: now + RECIPES[id].time };
  return { ok: true, end: now + RECIPES[id].time };
}

// idle · cooking { id, left, frac } · ready { id }
export function status(state, now) {
  update(state, now);
  const k = kitchen(state);
  if (k.ready) return { key: 'ready', id: k.ready };
  if (k.cooking) {
    const { id, start, end } = k.cooking;
    return { key: 'cooking', id, left: Math.max(0, end - now), frac: Math.min(1, (now - start) / (end - start)) };
  }
  return { key: 'idle' };
}

// Lấy món đã chín vào túi. reason: 'none' | 'full'
export function collect(state, now) {
  update(state, now);
  const k = kitchen(state);
  if (!k.ready) return { ok: false, reason: 'none' };
  if (!inv.add(state.inventory, k.ready, 1)) return { ok: false, reason: 'full' };
  const id = k.ready;
  k.ready = null;
  return { ok: true, id };
}

// Tổng giá anh Bảo mua các nguyên liệu của một món (để so với giá món)
export function ingredientValue(id, sellPrice) {
  return Object.entries(RECIPES[id].needs).reduce((n, [item, q]) => n + sellPrice(item) * q, 0);
}
