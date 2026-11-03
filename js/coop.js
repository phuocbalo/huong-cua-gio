// F05 Nuôi gà: cho ăn mỗi ngày, gà đẻ trứng, nhặt trứng vào túi.
//
// "Ngày" được tính theo ngày ảo = lúc bắt đầu chơi + thời gian game (gameTime). Ngày ảo trùng với ngày
// thật nếu không chỉnh giờ máy, và vì gameTime không bao giờ giảm nên lùi giờ máy không tạo ra
// "ngày mới" để cho ăn thêm lần nữa.
//
// Chuồng gà lưu:
//   chickens  số gà
//   fedDay    ngày ảo của lần cho ăn gần nhất ('2026-11-03'), null nếu chưa cho ăn lần nào
//   feedAt    thời gian game lúc cho ăn
//   laidFor   ngày ảo mà gà đã đẻ lứa trứng của ngày đó
//   eggs      số trứng đang nằm trong chuồng chờ nhặt

import { START_CHICKENS, LAY_DELAY, EGGS_PER_CHICKEN, FEED_ITEM } from './config.js';
import * as inv from './inventory.js';

export const newCoop = () => ({ chickens: START_CHICKENS, fedDay: null, feedAt: 0, laidFor: null, eggs: 0 });

const pad2 = n => String(n).padStart(2, '0');

// Ngày ảo dạng 'yyyy-mm-dd' theo giờ địa phương
export function dayKey(state, gameTime) {
  const d = new Date(state.createdAt + gameTime);
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

// Còn bao lâu tới nửa đêm của ngày ảo (dùng cho nút "Tua tới sáng mai" trong bản thử)
export function msToNextDay(state, gameTime) {
  const d = new Date(state.createdAt + gameTime);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - d.getTime();
}

// Đến giờ thì gà đẻ. Trả về số trứng vừa đẻ (0 nếu chưa).
export function update(state, now) {
  const c = state.coop;
  if (!c.fedDay || c.laidFor === c.fedDay || now < c.feedAt + LAY_DELAY) return 0;
  const laid = c.chickens * EGGS_PER_CHICKEN;
  c.eggs += laid;
  c.laidFor = c.fedDay;
  return laid;
}

// Trả về { ok } hoặc { ok: false, reason: 'fed_today' | 'no_feed' }
export function feed(state, now) {
  const c = state.coop;
  update(state, now);
  const today = dayKey(state, now);
  if (c.fedDay === today) return { ok: false, reason: 'fed_today' };
  if (!inv.remove(state.inventory, FEED_ITEM, 1)) return { ok: false, reason: 'no_feed' };
  c.fedDay = today;
  c.feedAt = now;
  return { ok: true };
}

// Trả về { ok, qty } hoặc { ok: false, reason: 'none' | 'full' }
export function collect(state, now) {
  const c = state.coop;
  update(state, now);
  if (c.eggs <= 0) return { ok: false, reason: 'none' };
  if (!inv.add(state.inventory, 'trung_ga', c.eggs)) return { ok: false, reason: 'full' };
  const qty = c.eggs;
  c.eggs = 0;
  return { ok: true, qty };
}

// Tình trạng để hiện cho người chơi:
//   hungry     hôm nay chưa cho ăn
//   digesting  đã ăn, sắp đẻ (left = còn bao lâu)
//   done       hôm nay đã ăn và đã đẻ
export function status(state, now) {
  const c = state.coop;
  if (c.fedDay !== dayKey(state, now)) return { key: 'hungry' };
  if (c.laidFor !== c.fedDay && now < c.feedAt + LAY_DELAY) return { key: 'digesting', left: c.feedAt + LAY_DELAY - now };
  return { key: 'done' };
}
