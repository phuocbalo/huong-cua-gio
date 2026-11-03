// F08 Ngày và đêm: tính màu trời, phố, đèn cho một giờ bất kỳ trong ngày.
// Màu đổi dần giữa các mốc trong SKY_KEYS, nên không bao giờ giật khi qua một khung giờ.
// File này không đụng tới cảnh, nên kiểm thử được riêng.

import { W, PERIODS, SKY_KEYS, SUNRISE, SUNSET } from './config.js';

const lerp = (a, b, t) => a + (b - a) * t;

export function mixColor(a, b, t) {
  const ch = (c, s) => (c >> s) & 255;
  const m = s => Math.round(lerp(ch(a, s), ch(b, s), t));
  return (m(16) << 16) | (m(8) << 8) | m(0);
}

const COLOR_KEYS = ['skyTop', 'skyBot', 'far', 'mid', 'near', 'shade'];
const NUM_KEYS = ['lit', 'cloud', 'lamp', 'stars'];

// Làm mềm đoạn chuyển: chậm ở hai đầu, nhanh ở giữa
const ease = t => t * t * (3 - 2 * t);

// Giờ thập phân từ đối tượng Date: 18:45 → 18.75
export const hourOf = d => d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;

export function skyAt(hour) {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1].h <= h) i++;
  const a = SKY_KEYS[i], b = SKY_KEYS[i + 1];
  const t = b.h === a.h ? 0 : ease((h - a.h) / (b.h - a.h));
  const pa = PERIODS[a.p], pb = PERIODS[b.p];
  const out = { hour: h };
  COLOR_KEYS.forEach(k => { out[k] = mixColor(pa[k], pb[k], t); });
  NUM_KEYS.forEach(k => { out[k] = lerp(pa[k], pb[k], t); });

  // Mặt trời đi theo cung từ trái sang phải giữa lúc mọc và lặn; mặt trăng đi phần còn lại của ngày
  const arc = f => ({ x: lerp(30, W - 30, f), y: 300 - Math.sin(Math.PI * f) * 240 });
  const dayLen = SUNSET - SUNRISE;
  const fs = (h - SUNRISE) / dayLen;
  out.sun = { ...arc(Math.min(1, Math.max(0, fs))), alpha: fs > -0.04 && fs < 1.04 ? 1 : 0, low: Math.max(0, 1 - Math.sin(Math.PI * Math.min(1, Math.max(0, fs))) * 3) };
  const fm = (((h - SUNSET) % 24) + 24) % 24 / (24 - dayLen);
  out.moon = { ...arc(Math.min(1, fm)), alpha: fm < 1 ? Math.min(1, out.stars * 1.2) : 0 };
  return out;
}
