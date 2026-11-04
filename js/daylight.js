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

// ----- F09 Thời tiết phủ lên màu trời -----
// gloom: độ âm u 0 → 1 (mây dày, mưa); rain: độ mưa 0 → 1. Trả về bộ màu mới, không sửa `p`.
const mulColor = (a, b) => {
  const ch = (c, s) => (c >> s) & 255;
  return (Math.round(ch(a, 16) * ch(b, 16) / 255) << 16) | (Math.round(ch(a, 8) * ch(b, 8) / 255) << 8) | Math.round(ch(a, 0) * ch(b, 0) / 255);
};
// Màu xám có cùng độ sáng, hơi ngả xanh lam như trời mưa
const grayOf = c => {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  const y = Math.round((0.3 * r + 0.59 * g + 0.11 * b) * 0.9);
  return (Math.max(0, y - 6) << 16) | (y << 8) | Math.min(255, y + 14);
};
export function withWeather(p, gloom = 0, rain = 0) {
  if (gloom <= 0.001 && rain <= 0.001) return p;
  const q = { ...p, sun: { ...p.sun }, moon: { ...p.moon } };
  ['skyTop', 'skyBot', 'far', 'mid', 'near'].forEach(k => { q[k] = mixColor(p[k], grayOf(p[k]), Math.min(1, gloom * 0.8)); });
  q.sun.alpha = p.sun.alpha * Math.max(0, 1 - gloom * 1.3);
  q.moon.alpha = p.moon.alpha * Math.max(0, 1 - gloom * 1.2);
  q.stars = p.stars * Math.max(0, 1 - gloom * 1.1);
  q.cloud = Math.max(p.cloud, gloom);
  q.lit = Math.max(p.lit, rain * 0.25);   // trời mưa ban ngày, vài nhà bật đèn
  const dark = gloom * 0.3 + rain * 0.6;
  q.shade = mixColor(p.shade, mulColor(p.shade, 0xb8c0ce), Math.min(1, dark));
  return q;
}
