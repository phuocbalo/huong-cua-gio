// Trang trí sân (bản 0.15): mua món trang trí, điểm sân đẹp, các mốc thưởng.
// Phần luật thuần, kiểm thử được. Dữ liệu trong config.js (DECOR, BEAUTY_PERKS, DECOR_LEVEL).
//
// Bản lưu: decor = ['hoa_giay', 'ghe_da', …] — các món đã có (đã có sẵn từ bản 0.10 cho chậu hoa giấy)

import { DECOR, DECOR_LEVEL, BEAUTY_PERKS, ORDER_SLOTS, LEVELS } from './config.js';

export const DECOR_IDS = Object.keys(DECOR);
export const SHOP_DECOR = DECOR_IDS.filter(id => DECOR[id].price > 0);

const levelOf = s => { let lv = 1; LEVELS.forEach((L, i) => { if ((s.xp || 0) >= L.xp) lv = i + 1; }); return lv; };

export const owned = (s, id) => (s.decor || []).includes(id);

// Tổng điểm sân đẹp và điểm tối đa
export const points = s => (s.decor || []).reduce((a, id) => a + (DECOR[id] ? DECOR[id].points : 0), 0);
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

// Mua và đặt lên sân. Trả về { ok, cost, perks: [mốc vừa đạt] }
export function buy(s, id) {
  const c = canBuy(s, id);
  if (!c.ok) return c;
  const before = points(s);
  s.coins -= c.cost;
  s.decor = [...(s.decor || []), id];
  return { ok: true, cost: c.cost, perks: perksBetween(before, points(s)) };
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
