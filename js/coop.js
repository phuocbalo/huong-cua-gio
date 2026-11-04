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
//   good      trong số trứng đó, bao nhiêu quả là trứng ngon (F07)
//   love      mức thân thiết 0 → LOVE_MAX (F07)
//   careDay   ngày ảo gần nhất có chăm gà; decayed: số ngày bỏ không chăm đã trừ điểm (tính từ careDay)
//   waterDay  ngày đã đổ nước; petDay + petted: ngày và danh sách con gà đã vuốt ve trong ngày đó
//   goodAcc   phần lẻ dồn lại để chia trứng ngon đều đặn, không phụ thuộc may rủi

import { START_CHICKENS, LAY_DELAY, EGGS_PER_CHICKEN, FEED_ITEM, LOVE_MAX, LOVE_PER_HEART, LOVE_GAIN, LOVE_DECAY, LOVE_GOOD_SHARE } from './config.js';
import * as inv from './inventory.js';

export const newCoop = () => ({ chickens: START_CHICKENS, fedDay: null, feedAt: 0, laidFor: null, eggs: 0, good: 0, love: 0, careDay: null, decayed: 0, waterDay: null, petDay: null, petted: [], goodAcc: 0 });

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

// Số ngày giữa hai ngày ảo 'yyyy-mm-dd'
export function daysBetween(a, b) {
  const t = k => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((t(b) - t(a)) / 86400000);
}

// ----- F07 Thân thiết -----
export const hearts = state => Math.floor(Math.min(LOVE_MAX, (state.coop.love || 0)) / LOVE_PER_HEART);

// Trừ điểm cho những ngày đã trôi qua mà không chăm gà (ngày có chăm và hôm nay không bị trừ)
function decay(state, now) {
  const c = state.coop;
  if (!c.careDay) return false;
  const missed = Math.max(0, daysBetween(c.careDay, dayKey(state, now)) - 1);
  const todo = missed - (c.decayed || 0);
  if (todo <= 0) return false;
  c.decayed = missed;
  c.love = Math.max(0, (c.love || 0) - todo * LOVE_DECAY);
  return true;
}

// Ghi nhận một việc chăm gà hôm nay
function care(state, now, gain) {
  const c = state.coop;
  decay(state, now);
  const today = dayKey(state, now);
  if (c.careDay !== today) { c.careDay = today; c.decayed = 0; }
  const before = hearts(state);
  c.love = Math.min(LOVE_MAX, (c.love || 0) + gain);
  return { gain, hearts: hearts(state), heartUp: hearts(state) > before };
}

// Đến giờ thì gà đẻ; tim lúc đẻ quyết định bao nhiêu quả là trứng ngon. Trả về số trứng vừa đẻ (0 nếu chưa).
// Cũng trừ điểm thân thiết cho những ngày bỏ không chăm.
export function update(state, now) {
  const c = state.coop;
  decay(state, now);
  if (!c.fedDay || c.laidFor === c.fedDay || now < c.feedAt + LAY_DELAY) return 0;
  const laid = c.chickens * EGGS_PER_CHICKEN;
  const share = LOVE_GOOD_SHARE[hearts(state)] || 0;
  let good = 0, acc = c.goodAcc || 0;
  for (let k = 0; k < laid; k++) { acc += share; if (acc >= 1 - 1e-9) { good++; acc -= 1; } }
  c.goodAcc = acc;
  c.eggs += laid;
  c.good = (c.good || 0) + good;
  c.laidFor = c.fedDay;
  return laid;
}

// Đổ nước vào bình. Trả về { ok, gain, hearts, heartUp } hoặc { ok: false, reason: 'done_today' }
export function water(state, now) {
  const c = state.coop, today = dayKey(state, now);
  if (c.waterDay === today) return { ok: false, reason: 'done_today' };
  c.waterDay = today;
  return { ok: true, ...care(state, now, LOVE_GAIN.water) };
}
export const wateredToday = (state, now) => state.coop.waterDay === dayKey(state, now);

// Vuốt ve con gà thứ `idx`. Mỗi con một lần mỗi ngày. reason: 'done_today' | 'no_chicken'
export function pet(state, idx, now) {
  const c = state.coop, today = dayKey(state, now);
  if (!(idx >= 0 && idx < c.chickens)) return { ok: false, reason: 'no_chicken' };
  if (c.petDay !== today) { c.petDay = today; c.petted = []; }
  if (c.petted.includes(idx)) return { ok: false, reason: 'done_today' };
  c.petted = c.petted.concat(idx);
  return { ok: true, ...care(state, now, LOVE_GAIN.pet) };
}
export const pettedToday = (state, now, idx) => state.coop.petDay === dayKey(state, now) && (state.coop.petted || []).includes(idx);

// Trả về { ok } hoặc { ok: false, reason: 'fed_today' | 'no_feed' }
export function feed(state, now) {
  const c = state.coop;
  update(state, now);
  const today = dayKey(state, now);
  if (c.fedDay === today) return { ok: false, reason: 'fed_today' };
  if (!inv.remove(state.inventory, FEED_ITEM, 1)) return { ok: false, reason: 'no_feed' };
  c.fedDay = today;
  c.feedAt = now;
  return { ok: true, ...care(state, now, LOVE_GAIN.feed) };
}

// Trả về { ok, qty, good } hoặc { ok: false, reason: 'none' | 'full' }. Túi không đủ chỗ cho cả hai loại thì không nhặt quả nào.
export function collect(state, now) {
  const c = state.coop;
  update(state, now);
  if (c.eggs <= 0) return { ok: false, reason: 'none' };
  const good = Math.min(c.good || 0, c.eggs), normal = c.eggs - good;
  if (normal > 0 && !inv.add(state.inventory, 'trung_ga', normal)) return { ok: false, reason: 'full' };
  if (good > 0 && !inv.add(state.inventory, 'trung_ga_ngon', good)) {
    if (normal > 0) inv.remove(state.inventory, 'trung_ga', normal);
    return { ok: false, reason: 'full' };
  }
  const qty = c.eggs;
  c.eggs = 0; c.good = 0;
  return { ok: true, qty, good };
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
