// Trang trí sân (bản 0.15) và bày biện (F17, bản 0.17): mua món trang trí, chọn chỗ đặt, lật hướng, cất vào kho,
// điểm sân đẹp và các mốc thưởng. Phần luật thuần, kiểm thử được.
// Dữ liệu trong config.js (DECOR, DECOR_SPOTS, BEAUTY_PERKS, DECOR_LEVEL).
//
// Bản lưu:
//   decor       ['hoa_giay', 'ghe_da', …] — các món đã có (có sẵn từ bản 0.10 cho chậu hoa giấy)
//   decorPlace  { id: { spot: 'c' | null, flip: false } } — chỗ đặt và hướng (bản 0.17); spot null = đang cất trong kho

import { DECOR, DECOR_SPOTS, DECOR_LEVEL, BEAUTY_PERKS, ORDER_SLOTS, LEVELS } from './config.js';

export const DECOR_IDS = Object.keys(DECOR);
export const SHOP_DECOR = DECOR_IDS.filter(id => DECOR[id].price > 0);
export const SPOT_IDS = Object.keys(DECOR_SPOTS);

const levelOf = s => { let lv = 1; LEVELS.forEach((L, i) => { if ((s.xp || 0) >= L.xp) lv = i + 1; }); return lv; };

export const owned = (s, id) => (s.decor || []).includes(id);
export const fits = (id, spot) => !!DECOR[id] && !!DECOR_SPOTS[spot] && DECOR_SPOTS[spot].fits.includes(DECOR[id].size);

// ----- Bày biện (bản 0.17) -----
// Món nào đang đứng ở chỗ `spot` (hoặc null)
export function at(s, spot) {
  const pl = s.decorPlace || {};
  return Object.keys(pl).find(id => owned(s, id) && pl[id] && pl[id].spot === spot) || null;
}

// Mọi món đã có đều có chỗ trong decorPlace: món mới (hoặc bản lưu cũ) vào chỗ mặc định nếu còn trống,
// không thì chỗ trống đầu tiên vừa cỡ, hết chỗ thì cất vào kho. Trả về true nếu có thay đổi.
export function normalize(s) {
  if (!s.decorPlace) s.decorPlace = {};
  let changed = false;
  (s.decor || []).forEach(id => {
    if (!DECOR[id] || s.decorPlace[id]) return;
    const def = DECOR[id].spot;
    const spot = def && fits(id, def) && !at(s, def) ? def : SPOT_IDS.find(k => fits(id, k) && !at(s, k)) || null;
    s.decorPlace[id] = { spot, flip: false };
    changed = true;
  });
  return changed;
}

export const placeOf = (s, id) => (s.decorPlace && s.decorPlace[id]) || { spot: null, flip: false };
export const isPlaced = (s, id) => owned(s, id) && !!placeOf(s, id).spot;

// Đặt món vào chỗ `spot`. Chỗ đó đang có món khác thì đổi chỗ cho nhau nếu món kia vừa chỗ cũ, không thì món kia vào kho.
// reason: 'not_owned' | 'no_spot' | 'too_big'
export function move(s, id, spot) {
  normalize(s);
  if (!owned(s, id)) return { ok: false, reason: 'not_owned' };
  if (!DECOR_SPOTS[spot]) return { ok: false, reason: 'no_spot' };
  if (!fits(id, spot)) return { ok: false, reason: 'too_big' };
  const from = placeOf(s, id).spot;
  if (from === spot) return { ok: true, swapped: null, stored: null };
  const other = at(s, spot);
  let swapped = null, stored = null;
  if (other) {
    if (from && fits(other, from)) { s.decorPlace[other].spot = from; swapped = other; }
    else { s.decorPlace[other].spot = null; stored = other; }
  }
  s.decorPlace[id].spot = spot;
  return { ok: true, swapped, stored };
}

export function flip(s, id) {
  normalize(s);
  if (!isPlaced(s, id)) return { ok: false, reason: 'not_placed' };
  s.decorPlace[id].flip = !s.decorPlace[id].flip;
  return { ok: true, flip: s.decorPlace[id].flip };
}

// Cất vào kho (không mất món, không tính điểm sân đẹp)
export function store(s, id) {
  normalize(s);
  if (!isPlaced(s, id)) return { ok: false, reason: 'not_placed' };
  s.decorPlace[id].spot = null;
  return { ok: true };
}

// Những chỗ món `id` đặt được (kể cả chỗ đang có món khác — sẽ đổi chỗ)
export const spotsFor = id => SPOT_IDS.filter(k => fits(id, k));

// Tổng điểm sân đẹp (chỉ món đang bày) và điểm tối đa
export const points = s => (s.decor || []).reduce((a, id) => a + (DECOR[id] && (!s.decorPlace || isPlaced(s, id)) ? DECOR[id].points : 0), 0);
export const maxPoints = () => DECOR_IDS.reduce((a, id) => a + DECOR[id].points, 0);

export const hasPerk = (s, perk) => BEAUTY_PERKS.some(p => p.perk === perk && points(s) >= p.points);

// Mốc kế tiếp chưa đạt (để hiện "còn N điểm nữa…"), null nếu đã đạt hết
export function nextPerk(s) {
  const pt = points(s);
  return BEAUTY_PERKS.find(p => pt < p.points) || null;
}

// Mua được không. reason: 'not_for_sale' | 'owned' | 'locked' (level) | 'coins'
export function canBuy(s, id) {
  const d = DECOR[id];
  if (!d || !d.price) return { ok: false, reason: 'not_for_sale' };
  if (owned(s, id)) return { ok: false, reason: 'owned' };
  if (levelOf(s) < DECOR_LEVEL) return { ok: false, reason: 'locked', level: DECOR_LEVEL };
  if (s.coins < d.price) return { ok: false, reason: 'coins', missing: d.price - s.coins };
  return { ok: true, cost: d.price };
}

// Mua và đặt lên sân (chỗ mặc định hoặc chỗ trống vừa cỡ; hết chỗ thì vào kho).
// Trả về { ok, cost, spot, perks: [mốc vừa đạt] }
export function buy(s, id) {
  const c = canBuy(s, id);
  if (!c.ok) return c;
  normalize(s);
  const before = points(s);
  s.coins -= c.cost;
  s.decor = [...(s.decor || []), id];
  normalize(s);
  return { ok: true, cost: c.cost, spot: placeOf(s, id).spot, perks: perksBetween(before, points(s)) };
}

// Các mốc vừa vượt qua khi điểm tăng từ a lên b
export const perksBetween = (a, b) => BEAUTY_PERKS.filter(p => a < p.points && b >= p.points);

// ----- Tác dụng lên đơn hàng hàng xóm -----
export const orderSlots = s => ORDER_SLOTS + (hasPerk(s, 'slot') ? 1 : 0);

// Phần thưởng thực nhận của một đơn, đã cộng các mốc sân đẹp
export function orderReward(s, o) {
  const cb = BEAUTY_PERKS.find(p => p.perk === 'coins');
  return {
    coins: o.coins + (hasPerk(s, 'coins') ? Math.ceil(o.coins * cb.bonus) : 0),
    hearts: o.hearts + (hasPerk(s, 'heart') ? 1 : 0)
  };
}
