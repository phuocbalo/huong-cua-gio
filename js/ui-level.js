// Giao diện level (bản 0.10): viên level trên thanh trạng thái, bảng con đường level, bảng chúc mừng lên level,
// chữ "+n KN" nổi lên mỗi khi được điểm. Luật nằm trong level.js.

import { LEVELS, XP, ITEMS, PENS, FERTILIZERS } from './config.js';
import { T, fmt } from './text.vi.js';
import { itemIcon, KITCHEN_ART } from './icons.js';
import { AVATARS, unitOf, nounOf } from './ui-economy.js';
import * as level from './level.js';
import * as decor from './decor.js';
import { BEAUTY_PERKS } from './config.js';

const $ = id => document.getElementById(id);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const STAR = n => `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3l3.9 8 8.6 1.2-6.3 6 1.6 8.6L16 22.6 8.2 26.8l1.6-8.6-6.3-6L12.1 11z" fill="#ffd84a" stroke="#3b2f2a" stroke-width="2.2" stroke-linejoin="round"/></svg><b>${n}</b>`;
const ICON = {
  neighbor: who => `<span class="avatar">${AVATARS[who] || ''}</span>`,
  boxes: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M7 15h26v16a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3z" fill="#f6f3ec" stroke="#3b2f2a" stroke-width="2.4" stroke-linejoin="round"/><path d="M5 10h30v7H5z" fill="#9b6f4c" stroke="#3b2f2a" stroke-width="2.4" stroke-linejoin="round"/><path d="M20 20v9M15.5 24.5h9" stroke="#5f9a4c" stroke-width="3" stroke-linecap="round"/></svg>',
  bag: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M10 15h20l-2 18H12z" fill="#d9a46b" stroke="#3b2f2a" stroke-width="2.5" stroke-linejoin="round"/><path d="M15 15c0-4 2-7 5-7s5 3 5 7" fill="none" stroke="#3b2f2a" stroke-width="2.5" stroke-linecap="round"/><path d="M20 20v8M16 24h8" stroke="#3b2f2a" stroke-width="2.5" stroke-linecap="round"/></svg>',
  chickens: '<svg viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="19" cy="25" rx="11" ry="8" fill="#b47644" stroke="#3b2f2a" stroke-width="2.4"/><circle cx="28" cy="15" r="5.5" fill="#c98d55" stroke="#3b2f2a" stroke-width="2.4"/><path d="M33 15l4 1-4 2z" fill="#f2b544" stroke="#3b2f2a" stroke-width="1.6" stroke-linejoin="round"/><path d="M26 9.5c0-3 3-3 3-1 1-2 3-1 2 1" fill="#d8352a" stroke="#3b2f2a" stroke-width="1.6"/></svg>',
  decor: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M12 26h16l-2 9H14z" fill="#c8703f" stroke="#3b2f2a" stroke-width="2.4" stroke-linejoin="round"/><circle cx="14" cy="17" r="5" fill="#e0559a" stroke="#3b2f2a" stroke-width="2"/><circle cx="25" cy="14" r="5" fill="#ef7ab4" stroke="#3b2f2a" stroke-width="2"/><circle cx="20" cy="21" r="5" fill="#d9418a" stroke="#3b2f2a" stroke-width="2"/></svg>',
  coins: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12" fill="#f2b544" stroke="#3b2f2a" stroke-width="2.5"/><circle cx="16" cy="16" r="7" fill="none" stroke="#c98a1c" stroke-width="2"/></svg>'
};

// Danh sách mở khóa của một level: [{ ico, text }]
export function unlockLines(u) {
  const out = [];
  (u.seeds || []).forEach(id => out.push({ ico: itemIcon(id), text: fmt(T.unlock_seed, { item: T['item_' + id] }) }));
  (u.items || []).forEach(id => out.push({ ico: itemIcon(id), text: fmt(FERTILIZERS[id] ? T.unlock_item : T.unlock_seed, { item: T['item_' + id] }) }));
  (u.neighbors || []).forEach(n => out.push({ ico: ICON.neighbor(n), text: fmt(T.unlock_neighbor, { name: T['name_' + n] }) }));
  if (u.kitchen) out.push({ ico: KITCHEN_ART, text: T.unlock_kitchen });
  const rec = u.recipes || [];
  if (rec.length > 2) out.push({ ico: itemIcon(rec[0]), text: fmt(T.unlock_recipe, { dish: rec.map(id => T['item_' + id]).join(', ') }) });
  else rec.forEach(id => out.push({ ico: itemIcon(id), text: fmt(T.unlock_recipe, { dish: T['item_' + id] }) }));
  if (u.pen) out.push({ ico: itemIcon(PENS[u.pen].product), text: T['unlock_pen_' + u.pen] });
  if (u.boxes) out.push({ ico: ICON.boxes, text: T.unlock_boxes });
  if (u.bag) out.push({ ico: ICON.bag, text: T.unlock_bag });
  if (u.chickens) out.push({ ico: ICON.chickens, text: fmt(T.unlock_chickens, { n: u.chickens }) });
  if (u.decor) out.push({ ico: ICON.decor, text: T['unlock_decor_' + u.decor] });
  return out;
}
const li = l => `<li><span class="ico">${l.ico}</span><span>${l.text}</span></li>`;

export class LevelUI {
  // h: { store, ui, sound(name), canCelebrate() }
  constructor(h) { this.h = h; this.queue = []; this.lastLevel = 0; }
  get s() { return this.h.store.data; }

  init() {
    $('levelPill').addEventListener('click', () => { this.h.sound('open'); this.openRoad(); });
    $('levelUpOk').addEventListener('click', () => { this.h.ui.closeWrap($('levelUpWrap')); this.showNext(); });
    $('levelUpAvatar').innerHTML = AVATARS.ba_tu;
    this.refresh();
  }

  // Cập nhật viên level trên thanh trạng thái (và bảng nếu đang mở)
  refresh() {
    const p = level.progress(this.s);
    $('lvlNum').textContent = p.level;
    $('lvlBar').style.width = Math.round(p.frac * 100) + '%';
    $('levelPill').setAttribute('aria-label', fmt(T.level_pill_label, { n: p.level }));
    if (!$('levelWrap').hidden) this.renderRoad();
  }

  // Chữ "+n KN" nổi lên cạnh viên level, viên nảy nhẹ
  showGain(n) {
    if (!(n > 0)) return;
    const pill = $('levelPill'), f = $('frame').getBoundingClientRect(), r = pill.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'xp-float';
    el.textContent = fmt(T.xp_gain, { n });
    el.style.left = (r.left + r.width / 2 - f.left) + 'px';
    el.style.top = (r.bottom - f.top) + 'px';
    $('frame').appendChild(el);
    setTimeout(() => el.remove(), 1400);
    pill.classList.remove('pop'); void pill.offsetWidth; pill.classList.add('pop');
  }

  // ----- Bảng con đường level -----
  openRoad() { this.renderRoad(); this.h.ui.openWrap($('levelWrap')); }

  renderRoad() {
    const p = level.progress(this.s);
    $('levelBadge').innerHTML = STAR(p.level);
    $('levelTitle').textContent = fmt(T.level_title, { n: p.level });
    $('levelBigBar').style.width = Math.round(p.frac * 100) + '%';
    $('levelLeft').textContent = p.max ? T.level_max : fmt(T.level_progress, { have: p.have, need: p.need }) + ' · ' + fmt(T.level_left, { n: p.left, next: p.level + 1 });
    $('levelHow').textContent = fmt(T.level_how, { h1: XP.harvest[1], h2: XP.harvest[2], h3: XP.harvest[3], deliver: XP.deliver, feed: XP.feed, eggs: XP.eggs, dust: XP.dust });
    // Sân đẹp (bản 0.15): thanh điểm và ba mốc thưởng
    const pt = decor.points(this.s), max = decor.maxPoints();
    $('beautyBox').innerHTML = `<div class="beauty-head"><b>${fmt(T.beauty_now, { n: pt, max })}</b><span class="lvl-bigbar"><i style="width:${Math.round(pt / max * 100)}%"></i></span></div>`
      + `<ul class="beauty-perks">${BEAUTY_PERKS.map(p => `<li class="${pt >= p.points ? 'done' : ''}"><b>${p.points}</b><span>${T['perk_' + p.perk]}</span></li>`).join('')}</ul>`
      + `<p class="note">${T.beauty_how}</p>`;
    $('levelRoad').innerHTML = LEVELS.map((L, i) => {
      const lv = i + 1, state = lv < p.level ? 'done' : lv === p.level ? 'now' : 'later';
      const lines = unlockLines(L.unlock || {});
      const text = lines.map(l => l.text).join(' · ') || T.level_start;
      return `<li class="${state}"><span class="lvl-badge small">${STAR(lv)}</span><span class="txt">${text}</span></li>`;
    }).join('');
  }

  // ----- Chúc mừng lên level -----
  // got: kết quả level.claimLevel; xếp hàng, hiện lần lượt khi được phép (không chen vào lúc hướng dẫn)
  celebrate(got) { if (got) { this.queue.push(got); this.showNext(); } }

  showNext() {
    if (!$('levelUpWrap').hidden || !this.queue.length || !this.h.canCelebrate()) return;
    const got = this.queue.shift();
    $('levelUpBadge').innerHTML = STAR(got.level);
    $('levelUpTitle').textContent = fmt(T.level_up_title, { n: got.level });
    $('levelUpSay').textContent = pick(T.level_up_say);
    $('levelUpUnlocks').innerHTML = unlockLines(got.unlock).map(li).join('');
    const gifts = [];
    if (got.coins) gifts.push({ ico: ICON.coins, text: fmt(T.gift_coins, { n: got.coins }) });
    got.items.forEach(it => gifts.push({ ico: itemIcon(it.id), text: fmt(T.gift_item, { qty: it.qty, unit: unitOf(it.id), noun: nounOf(it.id) }) }));
    $('levelUpGifts').innerHTML = gifts.map(li).join('');
    $('levelUpGiftsLabel').hidden = !gifts.length;
    this.h.sound('chime');
    this.h.ui.openWrap($('levelUpWrap'), '#levelUpOk');
  }
}
