// F09 Thời tiết: nắng, mây, gió, mưa theo lịch ngẫu nhiên nhưng cố định.
//
// Lịch thời tiết tính được từ một con số (seed) lưu trong bản lưu và thời gian game, không cần lưu từng trận mưa:
// cùng seed và cùng thời điểm thì luôn ra cùng một kiểu trời. Nhờ vậy khi tắt game, lúc mở lại game biết
// chính xác trong lúc vắng đã mưa những lúc nào, và cây được tưới đúng phần thời gian đó (cùng cách với F20).
//
// Bản lưu: weather = { seed, since, forced }
//   since   thời điểm bắt đầu có thời tiết (lúc xong hướng dẫn); null = chưa có, trời luôn nắng
//   forced  kiểu trời đặt tay trong bản thử: [{ kind, s, e }], đè lên lịch trong khoảng [s, e)
//
// Không phụ thuộc giao diện để kiểm thử được bằng Node.

import { WEATHER_BLOCK, WEATHER_CHANCE, RAIN_SHOWERS, RAIN_LEN, RAIN_WET_AFTER } from './config.js';

export const KINDS = ['sun', 'cloud', 'wind', 'rain'];
const B = WEATHER_BLOCK;

export const newWeather = (seed = Math.floor(Math.random() * 2147483647)) => ({ seed, since: null, forced: [] });

// Số ngẫu nhiên cố định cho (seed, khối, lần bốc thứ k), trong khoảng [0, 1)
function rand(seed, block, k) {
  let h = (seed ^ Math.imul(block + 1, 0x9e3779b1) ^ Math.imul(k + 1, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Gộp các khoảng chồng nhau, sắp theo thời gian
export function merge(list) {
  const a = list.filter(([s, e]) => e > s).sort((x, y) => x[0] - y[0]), out = [];
  for (const [s, e] of a) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e); else out.push([s, e]);
  }
  return out;
}
const clip = (list, from, to) => list.map(([s, e]) => [Math.max(s, from), Math.min(e, to)]).filter(([s, e]) => e > s);
// Bỏ phần nằm trong `cut` ra khỏi `list`
function subtract(list, cut) {
  let cur = list;
  for (const [cs, ce] of cut) {
    const next = [];
    for (const [s, e] of cur) {
      if (e <= cs || s >= ce) { next.push([s, e]); continue; }
      if (s < cs) next.push([s, cs]);
      if (e > ce) next.push([ce, e]);
    }
    cur = next;
  }
  return cur;
}
export const total = list => merge(list).reduce((n, [s, e]) => n + (e - s), 0);

// Kiểu trời của một khối 6 giờ, và các trận mưa trong khối đó
export function blockPlan(seed, block) {
  const r = rand(seed, block, 0);
  let acc = 0, kind = 'sun';
  for (const k of KINDS) { acc += WEATHER_CHANCE[k]; if (r < acc) { kind = k; break; } }
  const rains = [];
  if (kind === 'rain') {
    const n = RAIN_SHOWERS[0] + Math.floor(rand(seed, block, 1) * (RAIN_SHOWERS[1] - RAIN_SHOWERS[0] + 1));
    for (let i = 0; i < n; i++) {
      const len = RAIN_LEN[0] + rand(seed, block, 2 + i * 2) * (RAIN_LEN[1] - RAIN_LEN[0]);
      const s = block * B + rand(seed, block, 3 + i * 2) * (B - len);
      rains.push([s, s + len]);
    }
  }
  return { kind, rains: merge(rains) };
}

const active = w => !!w && w.since != null;
const forcedList = w => (w && w.forced) || [];

// Các khoảng mưa nằm trong [from, to)
export function rainIntervals(w, from, to) {
  if (!active(w) || to <= from) return [];
  from = Math.max(from, w.since);
  if (to <= from) return [];
  let list = [];
  for (let b = Math.floor(from / B); b <= Math.floor((to - 1) / B); b++) list.push(...blockPlan(w.seed, b).rains);
  const forced = forcedList(w).filter(f => f.e > from && f.s < to);
  list = subtract(list, forced.map(f => [f.s, f.e]));
  list.push(...forced.filter(f => f.kind === 'rain').map(f => [f.s, f.e]));
  return clip(merge(list), from, to);
}

// Những lúc đất được mưa làm ẩm trong [from, to): lúc mưa và RAIN_WET_AFTER sau khi tạnh
export function wetIntervals(w, from, to) {
  if (!active(w) || to <= from) return [];
  const rains = rainIntervals(w, from - RAIN_WET_AFTER, to);
  return clip(merge(rains.map(([s, e]) => [s, e + RAIN_WET_AFTER])), from, to);
}

// Mưa làm đất ẩm tới lúc nào (tính từ thời điểm t); 0 nếu lúc t đất không ẩm vì mưa
export function wetUntil(w, t) {
  if (!active(w)) return 0;
  const rains = merge(rainIntervals(w, t - RAIN_WET_AFTER - 1, t + B).map(([s, e]) => [s, e + RAIN_WET_AFTER]));
  const hit = rains.find(([s, e]) => s <= t && t < e);
  return hit ? hit[1] : 0;
}

// Kiểu trời lúc t: 'sun' | 'cloud' | 'wind' | 'rain'
export function kindAt(w, t) {
  if (!active(w) || t < w.since) return 'sun';
  const list = forcedList(w);
  for (let i = list.length - 1; i >= 0; i--) if (list[i].s <= t && t < list[i].e) return list[i].kind;
  if (rainIntervals(w, t, t + 1).length) return 'rain';
  const plan = blockPlan(w.seed, Math.floor(t / B));
  return plan.kind === 'rain' ? 'cloud' : plan.kind;   // giữa hai trận mưa trời nhiều mây
}

// Trận mưa đang diễn ra (nếu có) hoặc trận kế tiếp trong `ahead`: { s, e } hoặc null
export function nextRain(w, t, ahead) {
  const list = rainIntervals(w, t - RAIN_LEN[1], t + ahead);
  const r = list.find(([s, e]) => e > t);
  return r ? { s: r[0], e: r[1] } : null;
}

// Bản thử: đặt tay kiểu trời từ bây giờ trong `len`; 'auto' trả về theo lịch
export function force(w, kind, t, len) {
  if (!w) return;
  w.forced = forcedList(w).filter(f => f.e > t - 2 * B).map(f => (f.s <= t && t < f.e ? { ...f, e: t } : f)).filter(f => f.e > f.s);
  if (kind !== 'auto') w.forced.push({ kind, s: t, e: t + len });
}

// ----- Nguồn thời tiết dùng chung cho luật trồng trọt -----
// main.js gắn hàm trả về bản thời tiết đang dùng (null trong lúc hướng dẫn: không mưa làm lệch các bước).
let source = () => null;
export function bind(fn) { source = fn; }
export const current = () => source();
