// F23 Quét bụi sân thượng: cứ 3–4 ngày sân bám vài vệt bụi, quét từng vệt để nhận xu.
//
// Tính theo thời gian game (gameTime) như cây và gà, nên tắt game vẫn bám bụi đúng hẹn và
// lùi giờ máy không làm bụi bám thêm.
//
// Bụi lưu:
//   spots   chỉ số các chỗ đang có bụi (0 … DUST_SPOT_COUNT-1)
//   nextAt  thời gian game bụi bám lần tới; chỉ hẹn lại khi đã quét sạch

import { DUST_INTERVAL_MIN, DUST_INTERVAL_MAX, DUST_SPOTS_MIN, DUST_SPOTS_MAX, DUST_SPOT_COUNT, DUST_REWARD } from './config.js';

const interval = rand => DUST_INTERVAL_MIN + rand() * (DUST_INTERVAL_MAX - DUST_INTERVAL_MIN);

export const newDust = (now, rand = Math.random) => ({ spots: [], nextAt: now + interval(rand) });

// Đến hẹn thì bụi bám. Trả về số vệt vừa bám (0 nếu chưa).
export function update(state, now, rand = Math.random) {
  const d = state.dust;
  if (d.spots.length || now < d.nextAt) return 0;
  const n = DUST_SPOTS_MIN + Math.floor(rand() * (DUST_SPOTS_MAX - DUST_SPOTS_MIN + 1));
  const pool = Array.from({ length: DUST_SPOT_COUNT }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  d.spots = pool.slice(0, n).sort((a, b) => a - b);
  return n;
}

// Quét một vệt. Trả về { ok, reward, clean } hoặc { ok: false } nếu chỗ đó không có bụi.
export function sweep(state, spot, now, rand = Math.random) {
  const d = state.dust;
  const k = d.spots.indexOf(spot);
  if (k < 0) return { ok: false };
  d.spots.splice(k, 1);
  state.coins += DUST_REWARD;
  const clean = d.spots.length === 0;
  if (clean) d.nextAt = now + interval(rand);   // sạch rồi mới hẹn lần bám tới
  return { ok: true, reward: DUST_REWARD, clean };
}

// Chỉ dùng trong bản thử: cho bụi bám ngay
export function forceNow(state, now, rand = Math.random) {
  state.dust.spots = [];
  state.dust.nextAt = now;
  return update(state, now, rand);
}
