// Level (bản 0.10): điểm kinh nghiệm (KN), lên level, mở khóa và quà.
// Phần luật thuần, kiểm thử được. Dữ liệu các level nằm trong config.js (LEVELS, XP).
//
// Bản lưu:
//   xp     tổng điểm KN đã có (chỉ tăng)
//   level  level cao nhất đã nhận quà; so với levelOf(xp) để biết vừa lên level nào

import { LEVELS, MAX_LEVEL, XP, CROPS, ITEMS, SHOP_BUY } from './config.js';
import * as inv from './inventory.js';

// Giá một món ở tiệm (để đổi quà ra xu khi túi đầy). Không gọi shop.js để tránh hai file gọi vòng nhau.
const priceOf = id => { const it = ITEMS[id]; return (it && it.kind === 'seed' ? CROPS[it.crop].seedPrice : it && it.price) || 5; };

// Level ứng với số điểm KN
export function levelOf(xp) {
  let lv = 1;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].xp) lv = i + 1;
  return lv;
}

export const levelNow = s => levelOf(s.xp || 0);

// Tiến độ trong level hiện tại, cho thanh trên thanh trạng thái
export function progress(s) {
  const xp = s.xp || 0, lv = levelOf(xp);
  if (lv >= MAX_LEVEL) return { level: lv, max: true, have: xp - LEVELS[lv - 1].xp, need: 0, frac: 1 };
  const from = LEVELS[lv - 1].xp, to = LEVELS[lv].xp;
  return { level: lv, max: false, have: xp - from, need: to - from, frac: (xp - from) / (to - from), left: to - xp };
}

// Level cần để mở một thứ. kind: 'seeds' | 'neighbors' | 'boxes' | 'bag' | 'decor'
export function unlockLevel(kind, key) {
  for (let i = 0; i < LEVELS.length; i++) {
    const u = LEVELS[i].unlock || {};
    if (kind === 'seeds' || kind === 'neighbors') { if ((u[kind] || []).includes(key)) return i + 1; }
    else if (u[kind] && (key == null || u[kind] === key)) return i + 1;
  }
  return 1;   // không có trong bảng: mở sẵn từ đầu
}

export const isUnlocked = (s, kind, key) => levelNow(s) >= unlockLevel(kind, key);

// Món ở tiệm: hạt giống mở theo level, món khác (thức ăn gà) bán sẵn
export function itemUnlockLevel(id) {
  return ITEMS[id] && ITEMS[id].kind === 'seed' && SHOP_BUY.includes(id) ? unlockLevel('seeds', id) : 1;
}

// Điểm KN cho một việc. what: 'harvest' (tier) | 'deliver' | 'feed' | 'eggs' | 'dust' (số vệt)
export function xpFor(what, arg) {
  if (what === 'harvest') return XP.harvest[CROPS[arg] ? CROPS[arg].tier : 1] || 0;
  if (what === 'dust') return XP.dust * (arg || 1);
  return XP[what] || 0;
}

// Cộng điểm KN. Trả về { gained, ups: [level mới…] } — các level vừa đạt nhưng chưa nhận quà
export function addXp(s, amount) {
  if (!(amount > 0)) return { gained: 0, ups: [] };
  s.xp = (s.xp || 0) + amount;
  return { gained: amount, ups: pendingLevels(s) };
}

export function pendingLevels(s) {
  const now = levelNow(s), seen = s.level || 1, out = [];
  for (let lv = seen + 1; lv <= now; lv++) out.push(lv);
  return out;
}

// Nhận quà và áp dụng mở khóa của một level (gọi đúng một lần cho mỗi level, theo thứ tự).
// Trả về những gì người chơi nhận được để hiện bảng chúc mừng.
export function claimLevel(s, lv) {
  const def = LEVELS[lv - 1];
  if (!def || lv <= (s.level || 1)) return null;
  const r = def.reward || {}, u = def.unlock || {};
  let coins = r.coins || 0;
  const items = [];
  Object.entries(r.items || {}).forEach(([id, qty]) => {
    if (inv.add(s.inventory, id, qty)) items.push({ id, qty });
    else coins += priceOf(id) * qty;   // túi đầy: đổi ra xu, không để mất quà
  });
  s.coins += coins;
  if (u.chickens && s.coop) s.coop.chickens += u.chickens;
  if (u.decor) s.decor = [...new Set([...(s.decor || []), u.decor])];
  s.level = lv;
  return { level: lv, coins, items, unlock: u };
}

// Những gì level kế tiếp sẽ mở (để hiện "Lên level N sẽ mở: …")
export function nextUnlock(s) {
  const lv = levelNow(s);
  return lv >= MAX_LEVEL ? null : { level: lv + 1, unlock: LEVELS[lv].unlock || {} };
}
