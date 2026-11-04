// Trồng trọt: gieo hạt (F01), tưới nước (F02), thu hoạch (F03).
//
// Mọi thời điểm ở đây là "thời gian game" (gameTime trong clock.js), không phải giờ máy.
// Nhờ vậy cây lớn đúng cả khi tắt game, và lùi giờ máy không làm cây mất tiến độ.
//
// Mỗi thùng xốp lưu:
//   crop          loại cây, null nếu thùng trống
//   progress      tiến độ lứa hiện tại, 0 → 1 (1 = chín)
//   lastT         lần cuối tính tiến độ
//   wateredUntil  tưới còn tác dụng tới lúc này
//   harvestsLeft  còn thu được mấy lần
//   regrowing     đang chín lại sau một lần thu (cây thu nhiều lần)

import { CROPS, ITEMS, STAGES, UNWATERED_SPEED, WATER_DURATION } from './config.js';
import * as inv from './inventory.js';
import * as weather from './weather.js';

// Cây thu nhiều lần quay về giai đoạn "lớn" sau mỗi lần thu
export const REGROW_FROM = STAGES.find(s => s.key === 'grown').from;

export const emptyBox = () => ({ crop: null });

// Thời gian cả lứa hiện tại (0 → 1) nếu luôn được tưới
export function cycleTime(box) {
  const c = CROPS[box.crop];
  return box.regrowing ? c.regrowTime / (1 - REGROW_FROM) : c.growTime;
}

// Tính tiến độ từ lần trước tới `now`. Phần có tưới (bằng bình tưới hoặc nhờ mưa, F09) lớn đủ tốc độ,
// phần không tưới lớn bằng UNWATERED_SPEED.
export function update(box, now) {
  if (!box.crop) return false;
  const from = box.lastT;
  box.lastT = Math.max(box.lastT, now);
  if (box.progress >= 1 || now <= from) return false;
  const dt = now - from;
  const wet = weather.wetIntervals(weather.current(), from, now);
  if (box.wateredUntil > from) wet.push([from, Math.min(now, box.wateredUntil)]);
  const watered = weather.total(wet);
  const effective = watered + (dt - watered) * UNWATERED_SPEED;
  const before = stageOf(box);
  box.progress = box.progress + effective / cycleTime(box);
  // Cộng dồn từng giây sinh sai số làm tròn (0,99999…): coi như đã chín
  if (box.progress > 1 - 1e-9) box.progress = 1;
  return stageOf(box) !== before;
}

export function stageOf(box) {
  if (!box.crop) return null;
  let key = STAGES[0].key;
  for (const s of STAGES) if (box.progress >= s.from) key = s.key;
  return key;
}

export const isRipe = box => !!box.crop && box.progress >= 1;
// Lúc `now` đất còn ẩm tới khi nào: lần tưới gần nhất hoặc mưa (F09), lấy cái muộn hơn
export const moistUntil = (box, now) => Math.max(box.wateredUntil || 0, weather.wetUntil(weather.current(), now));
export const isDry = (box, now) => !!box.crop && box.progress < 1 && moistUntil(box, now) <= now;
// Đang mưa hoặc đất còn ẩm vì mưa
export const isRainWet = now => weather.wetUntil(weather.current(), now) > now;

// ----- F01 Gieo hạt -----
// Trả về { ok } hoặc { ok: false, reason: 'occupied' | 'no_seed' | 'not_seed' }
export function plant(state, index, seedId, now) {
  const box = state.boxes[index];
  if (!box || box.crop) return { ok: false, reason: 'occupied' };
  const item = ITEMS[seedId];
  if (!item || item.kind !== 'seed') return { ok: false, reason: 'not_seed' };
  if (!inv.remove(state.inventory, seedId, 1)) return { ok: false, reason: 'no_seed' };
  state.boxes[index] = {
    crop: item.crop,
    progress: 0,
    lastT: now,
    wateredUntil: 0,
    harvestsLeft: CROPS[item.crop].harvests,
    regrowing: false
  };
  return { ok: true };
}

// ----- F02 Tưới nước -----
// Trả về { ok } hoặc { ok: false, reason: 'empty' | 'ripe' | 'already' | 'rain' }
export function water(box, now) {
  if (!box.crop) return { ok: false, reason: 'empty' };
  update(box, now);
  if (isRipe(box)) return { ok: false, reason: 'ripe' };
  if (box.wateredUntil > now) return { ok: false, reason: 'already' };
  if (isRainWet(now)) return { ok: false, reason: 'rain' };
  box.wateredUntil = now + WATER_DURATION;
  return { ok: true };
}

// ----- F03 Thu hoạch -----
// Trả về { ok, crop, qty } hoặc { ok: false, reason: 'not_ripe' | 'full' }
export function harvest(state, index, now) {
  const box = state.boxes[index];
  update(box, now);
  if (!isRipe(box)) return { ok: false, reason: 'not_ripe' };
  const crop = box.crop, qty = CROPS[crop].yield;
  if (!inv.add(state.inventory, crop, qty)) return { ok: false, reason: 'full' };
  box.harvestsLeft -= 1;
  if (box.harvestsLeft <= 0) {
    state.boxes[index] = emptyBox();
  } else {
    box.progress = REGROW_FROM;
    box.regrowing = true;
    box.lastT = now;
  }
  return { ok: true, crop, qty };
}

// Còn bao lâu nữa chín, tính theo tình trạng tưới hiện tại (hết tác dụng tưới thì lớn chậm lại)
export function timeLeft(box, now) {
  if (!box.crop || box.progress >= 1) return 0;
  const need = (1 - box.progress) * cycleTime(box);   // cần bấy nhiêu thời gian "đủ tốc độ"
  const wateredLeft = Math.max(0, moistUntil(box, now) - now);
  if (need <= wateredLeft) return need;
  return wateredLeft + (need - wateredLeft) / UNWATERED_SPEED;
}

// Cập nhật mọi thùng; trả về danh sách thùng vừa đổi giai đoạn hình
export function updateAll(state, now) {
  const changed = [];
  state.boxes.forEach((b, i) => { if (update(b, now)) changed.push(i); });
  return changed;
}
