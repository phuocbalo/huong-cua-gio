// F06 Vật nuôi khác: thỏ, bồ câu, bể cá. Dùng lại khung nuôi gà (coop.js): cho ăn mỗi ngày một lần,
// sau một lúc có sản phẩm chờ nhặt; không cho ăn thì thôi không có, không bệnh, không chết.
//
// Bản lưu: pens = { tho: { fedDay, feedAt, laidFor, items }, bo_cau: {…}, ca: {…} }
//   (tạo dần khi cần; bản lưu cũ chưa có cũng chạy được)
// Luật thuần, kiểm thử được bằng Node.

import { PENS } from './config.js';
import { dayKey } from './coop.js';
import * as inv from './inventory.js';
import { isUnlocked, unlockLevel } from './level.js';

export const KINDS = Object.keys(PENS);

export function pen(state, k) {
  if (!state.pens) state.pens = {};
  if (!state.pens[k]) state.pens[k] = { fedDay: null, feedAt: 0, laidFor: null, items: 0 };
  return state.pens[k];
}

export const unlocked = (state, k) => isUnlocked(state, 'pen', k);
export const level = k => unlockLevel('pen', k);

// Đến giờ thì có sản phẩm. Trả về số sản phẩm vừa có.
export function update(state, k, now) {
  const p = pen(state, k), def = PENS[k];
  if (!p.fedDay || p.laidFor === p.fedDay || now < p.feedAt + def.delay) return 0;
  p.items += def.yield;
  p.laidFor = p.fedDay;
  return def.yield;
}

// Cập nhật mọi chuồng đã mở; trả về { k: số sản phẩm vừa có } (chỉ chuồng có thay đổi)
export function updateAll(state, now) {
  const out = {};
  KINDS.forEach(k => { if (state.pens && state.pens[k]) { const n = update(state, k, now); if (n) out[k] = n; } });
  return out;
}

// reason: 'locked' | 'fed_today' | 'no_feed'
export function feed(state, k, now) {
  if (!unlocked(state, k)) return { ok: false, reason: 'locked', level: level(k) };
  const p = pen(state, k), today = dayKey(state, now);
  update(state, k, now);
  if (p.fedDay === today) return { ok: false, reason: 'fed_today' };
  if (!inv.remove(state.inventory, PENS[k].feed, 1)) return { ok: false, reason: 'no_feed' };
  p.fedDay = today;
  p.feedAt = now;
  return { ok: true };
}

// reason: 'none' | 'full'
export function collect(state, k, now) {
  const p = pen(state, k);
  update(state, k, now);
  if (p.items <= 0) return { ok: false, reason: 'none' };
  if (!inv.add(state.inventory, PENS[k].product, p.items)) return { ok: false, reason: 'full' };
  const qty = p.items;
  p.items = 0;
  return { ok: true, qty, item: PENS[k].product };
}

// hungry: hôm nay chưa ăn · digesting: đã ăn, sắp có sản phẩm (left) · done: hôm nay đã có rồi
export function status(state, k, now) {
  const p = pen(state, k);
  if (p.fedDay !== dayKey(state, now)) return { key: 'hungry' };
  if (p.laidFor !== p.fedDay && now < p.feedAt + PENS[k].delay) return { key: 'digesting', left: p.feedAt + PENS[k].delay - now };
  return { key: 'done' };
}

// Một lần chạm vào chuồng: có sản phẩm thì nhặt; chưa ăn thì cho ăn; không thì cho biết tình trạng.
// Trả về { action: 'locked' | 'collect' | 'feed' | 'status', ...kết quả }
export function tap(state, k, now) {
  if (!unlocked(state, k)) return { action: 'locked', level: level(k) };
  update(state, k, now);
  if (pen(state, k).items > 0) return { action: 'collect', ...collect(state, k, now) };
  if (status(state, k, now).key === 'hungry') return { action: 'feed', ...feed(state, k, now) };
  return { action: 'status', ...status(state, k, now) };
}
