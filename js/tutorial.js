// F19 Mở đầu cùng bà Tư: dẫn người chơi mới qua gieo – tưới – thu – bán – cho gà ăn lần đầu.
// Từ bản 0.9.2 không bỏ qua được; trong lúc hướng dẫn chỉ bấm được đúng chỗ mũi tên đang chỉ.
//
// Phần luật (thuần, kiểm thử được): các bước, sự kiện nào đưa sang bước nào, bước nào cho chạm gì,
// và sửa bước cho khớp khi người chơi đóng game giữa chừng rồi mở lại (normalize).
// Phần giao diện (TutorialUI): hộp thoại bà Tư, mũi tên và làm sáng chỗ cần chạm, chặn chỗ khác,
// cho cây lớn nhanh.

import { T, fmt } from './text.vi.js';
import { AVATARS } from './ui-economy.js';
import { LAY_DELAY, FEED_ITEM } from './config.js';
import { duration } from './util.js';
import * as farm from './farm.js';
import * as shop from './shop.js';
import * as coop from './coop.js';

export const STEPS = ['intro', 'plant', 'water', 'grow', 'harvest', 'sell', 'feed', 'done'];
export const TUTORIAL_SEED = 'hat_rau_muong';

export const isActive = s => !s.tutorialDone;
const tut = s => s.tutorial || (s.tutorial = { step: 'intro', box: null });
const go = (s, step) => { tut(s).step = step; return step; };

export function finish(s) { s.tutorialDone = true; go(s, 'done'); }

export function restart(s) { s.tutorialDone = false; s.tutorial = { step: 'intro', box: null }; }

// Món nên bán trong bước bán: nông sản vừa thu (rau muống) nếu còn, không thì món bán được đầu tiên
export function sellTarget(s) {
  const list = shop.sellable(s);
  if (!list.length) return null;
  const box = tut(s).box;
  const crop = box != null && s.boxes[box] ? s.boxes[box].crop : null;
  return list.includes('rau_muong') ? 'rau_muong' : (crop && list.includes(crop) ? crop : list[0]);
}

// Sửa bước cho khớp với sân hiện tại (mở lại game giữa chừng, hoặc người chơi đã tự làm trước).
// Cũng tránh kẹt: không còn gì để bán thì sang bước cho gà ăn; gà đã ăn hôm nay thì xong luôn.
export function normalize(s, now) {
  if (s.tutorialDone) return null;
  const t = tut(s);
  if (t.step === 'plant') {
    const k = s.boxes.findIndex(b => b.crop);
    if (k >= 0) { t.box = k; t.step = 'water'; }
  }
  if (['water', 'grow', 'harvest'].includes(t.step)) {
    const box = t.box != null ? s.boxes[t.box] : null;
    if (!box || !box.crop) t.step = t.step === 'harvest' ? 'sell' : 'plant';
    else if (farm.isRipe(box)) t.step = 'harvest';
    else if (t.step === 'water' && box.wateredUntil > now) t.step = 'grow';
  }
  if (t.step === 'sell' && !shop.sellable(s).length) t.step = 'feed';
  if (t.step === 'feed' && s.coop && coop.status(s, now).key !== 'hungry') t.step = 'done';
  return t.step;
}

// Sự kiện từ game. Trả về bước mới (hoặc bước cũ nếu sự kiện không liên quan).
//   plant (index) · water (index | 'all') · ripe · harvest (index) · harvestFull · sell · feed · next
export function advance(s, event, data) {
  if (s.tutorialDone) return null;
  const t = tut(s);
  switch (t.step) {
    case 'intro': if (event === 'next') return go(s, 'plant'); break;
    case 'plant': if (event === 'plant') { t.box = data; return go(s, 'water'); } break;
    case 'water': if (event === 'water' && (data === t.box || data === 'all')) return go(s, 'grow'); break;
    case 'grow': if (event === 'ripe') return go(s, 'harvest'); break;
    case 'harvest':
      if (event === 'harvest' && data === t.box) return go(s, 'sell');
      // Túi đầy không thu được: đi bán bớt trước để không bị kẹt
      if (event === 'harvestFull') return go(s, 'sell');
      break;
    case 'sell': if (event === 'sell') return go(s, 'feed'); break;
    case 'feed': if (event === 'feed') return go(s, 'done'); break;
    case 'done': if (event === 'next') { finish(s); return 'done'; } break;
  }
  return t.step;
}

// Trong lúc hướng dẫn, bước nào cho chạm vào đâu. Chỉ đúng chỗ đang hướng dẫn; túi đồ, cài đặt cũng khóa.
// 'info' là nút bản thử, chỉ hiện ở chế độ kiểm thử, nên vẫn mở được.
export function allows(s, action, data) {
  if (s.tutorialDone) return true;
  if (action === 'info') return true;
  const t = tut(s);
  switch (t.step) {
    case 'plant': return (action === 'tapBox' && !s.boxes[data].crop) || (action === 'plant' && data === TUTORIAL_SEED);
    case 'water': return (action === 'tapBox' && data === t.box) || action === 'waterAll';
    case 'harvest': return action === 'tapBox' && data === t.box;
    case 'sell': return action === 'shop' || (action === 'sell' && data === sellTarget(s));
    case 'feed': return action === 'feed';
    default: return false;
  }
}

// ----- Giao diện -----
const $ = id => document.getElementById(id);
const isOpen = id => { const el = $(id); return !!el && !el.hidden; };
const anySheetOpen = () => !!document.querySelector('.wrap:not([hidden])');

// Mũi tên chỉ xuống, vàng sáng, viền nâu
const ARROW_SVG = '<svg viewBox="0 0 48 56" aria-hidden="true"><path d="M17 3h14v24h12L24 52 5 27h12z" fill="#ffd84a" stroke="#3b2f2a" stroke-width="3.5" stroke-linejoin="round"/><path d="M21 7h6v22" fill="none" stroke="#fff6c9" stroke-width="3" stroke-linecap="round"/></svg>';

export class TutorialUI {
  // h: { store, ui, scene(), now(), render(), onToggle(), sound(name) }
  constructor(h) { this.h = h; this.growTimer = 0; this.raf = 0; this.targetEl = null; this.spotKey = ''; this.lastDeny = 0; }

  get s() { return this.h.store.data; }

  init() {
    $('tutAvatar').innerHTML = AVATARS.ba_tu;
    $('tutNext').addEventListener('click', () => this.event('next'));
    const arrow = document.createElement('div');
    arrow.id = 'tutArrow'; arrow.className = 'tut-arrow'; arrow.hidden = true; arrow.innerHTML = ARROW_SVG;
    $('frame').appendChild(arrow);
    this.arrow = arrow;
    // Chặn mọi nút ngoài chỗ đang hướng dẫn (bắt sớm ở pha capture, trước khi nút kịp xử lý).
    // Chạm trên sân (canvas) không qua đây; phần đó do allows() trong main.js quyết định.
    document.addEventListener('click', e => this.guardClick(e), true);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isActive(this.s) && (isOpen('seedWrap') || isOpen('shopWrap'))) { e.stopImmediatePropagation(); e.preventDefault(); }
    }, true);
  }

  // Bắt đầu (hoặc tiếp tục) nếu người chơi chưa xong hướng dẫn
  start() {
    if (!isActive(this.s)) { this.hide(); return; }
    this.ensureSupplies();
    normalize(this.s, this.h.now());
    this.show();
  }

  // Bảo đảm có hạt rau muống để gieo và thức ăn để cho gà ăn, để không bao giờ bị kẹt
  ensureSupplies() {
    const items = this.s.inventory.items, step = tut(this.s).step;
    if (['intro', 'plant'].includes(step) && !items[TUTORIAL_SEED]) items[TUTORIAL_SEED] = 1;
    if (step === 'feed' && !items[FEED_ITEM]) items[FEED_ITEM] = 1;
  }

  event(name, data) {
    if (!isActive(this.s)) return;
    const before = tut(this.s).step;
    advance(this.s, name, data);
    if (tut(this.s).step !== before || this.s.tutorialDone) {
      this.ensureSupplies();
      normalize(this.s, this.h.now());
      this.h.store.flush();
      if (this.s.tutorialDone) { this.hide(); this.h.sound('chime'); return; }
      this.h.sound('open');
      // Bán xong: đóng tiệm giúp người chơi để thấy máng ăn của gà
      if (before === 'sell' && isOpen('shopWrap')) setTimeout(() => { if (isOpen('shopWrap')) this.h.ui.closeWrap($('shopWrap')); }, 900);
      this.show();
    }
  }

  allows(action, data) {
    if (allows(this.s, action, data)) return true;
    this.deny();
    return false;
  }

  deny() {
    const t = Date.now();
    if (t - this.lastDeny < 600) return;   // chạm liên tục chỉ báo một lần
    this.lastDeny = t;
    this.h.sound('deny');
    this.h.ui.toast(T.tut_blocked);
  }

  show() {
    const step = tut(this.s).step;
    $('tutWrap').hidden = false;
    $('tutText').textContent = fmt(T['tut_' + step], { time: duration(LAY_DELAY) });
    const talkOnly = step === 'intro' || step === 'done';
    $('tutNext').hidden = !talkOnly;
    $('tutNext').textContent = step === 'done' ? T.tut_start : T.tut_next;
    if (step === 'grow') this.fastGrow();
    this.spotKey = '';
    this.loop();
    if (this.h.onToggle) this.h.onToggle();
  }

  hide() {
    $('tutWrap').hidden = true;
    cancelAnimationFrame(this.raf); this.raf = 0;
    this.setTarget(null);
    this.arrow.hidden = true;
    $('frame').classList.remove('tut-toolbar');
    const sc = this.h.scene();
    if (sc) sc.setSpotlight(null);
    this.spotKey = '';
    clearInterval(this.growTimer);
    if (this.h.onToggle) this.h.onToggle();
  }

  // ----- Chỗ cần chạm ở mỗi bước -----
  // Nút HTML mũi tên chỉ vào (null nếu chỗ cần chạm nằm trên sân)
  domTarget() {
    const step = tut(this.s).step;
    if (step === 'intro' || step === 'done') return null;
    if (step === 'plant') return isOpen('seedWrap') ? document.querySelector(`#seedList button[data-seed="${TUTORIAL_SEED}"]`) : null;
    if (step === 'water') return anySheetOpen() ? null : $('toolWater');
    if (step === 'sell') {
      if (isOpen('shopWrap')) {
        const id = sellTarget(this.s);
        return id ? document.querySelector(`#shopList button.primary[data-act="sell"][data-id="${id}"]`) : null;
      }
      return anySheetOpen() ? null : $('toolShop');
    }
    return null;
  }

  // Những chỗ HTML được phép bấm ở bước hiện tại
  allowedEl(el) {
    if (el.closest('#infoBtn, #sheetWrap, #awayWrap, #tutNext')) return true;   // bản thử, bảng đi vắng, nút Tiếp
    // Nút đóng bảng: khóa ở bảng chọn hạt (bước gieo) và tiệm (bước bán) để người chơi làm theo mũi tên;
    // bảng khác lỡ đang mở thì vẫn đóng được, tránh bị kẹt
    const closer = el.closest('[data-close]');
    if (closer) {
      const step = tut(this.s).step, wrap = closer.closest('.wrap');
      const locked = (step === 'plant' && wrap && wrap.id === 'seedWrap') || (step === 'sell' && wrap && wrap.id === 'shopWrap');
      if (!locked) return true;
    }
    const target = this.domTarget();
    return !!target && (el === target || target.contains(el));
  }

  guardClick(e) {
    if (!isActive(this.s)) return;
    const el = e.target;
    if (!(el instanceof Element) || el.tagName === 'CANVAS') return;
    if (!$('frame').contains(el) || this.allowedEl(el)) return;
    const interactive = el.closest('button, [data-close], .chip, input, label, select, a');
    if (!interactive) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    this.deny();
  }

  // Trên sân: thùng hoặc máng ăn được làm sáng; có mũi tên hay không
  sceneSpot() {
    const step = tut(this.s).step, box = tut(this.s).box;
    if (anySheetOpen()) return null;
    if (step === 'plant') { const k = this.s.boxes.findIndex(b => !b.crop); return k >= 0 ? { kind: 'box', index: k, arrow: true } : null; }
    if (step === 'water') return box != null ? { kind: 'box', index: box, arrow: false } : null;   // mũi tên ở nút Bình tưới
    if (step === 'grow') return box != null ? { kind: 'box', index: box, arrow: false } : null;
    if (step === 'harvest') return box != null ? { kind: 'box', index: box, arrow: true } : null;
    if (step === 'feed') return { kind: 'trough', arrow: true };
    return null;
  }

  setTarget(el) {
    if (this.targetEl === el) return;
    if (this.targetEl) this.targetEl.classList.remove('tut-target');
    this.targetEl = el;
    if (el) el.classList.add('tut-target');
  }

  // Cập nhật mũi tên theo từng khung hình: bảng mở ra, cuộn danh sách, xoay màn hình…
  loop() {
    cancelAnimationFrame(this.raf);
    const tick = () => {
      if (!isActive(this.s) || $('tutWrap').hidden) { this.raf = 0; return; }
      const el = this.domTarget();
      this.setTarget(el);
      const r = el ? el.getBoundingClientRect() : null;
      // Mũi tên chỉ vào thanh công cụ: đẩy thông báo lên cao để không che mũi tên
      $('frame').classList.toggle('tut-toolbar', !!(el && el.classList.contains('tool')));
      if (r && r.width > 0) {
        const f = $('frame').getBoundingClientRect();
        this.arrow.hidden = false;
        this.arrow.style.left = (r.left + r.width / 2 - f.left) + 'px';
        this.arrow.style.top = (r.top - f.top) + 'px';
      } else this.arrow.hidden = true;
      const sc = this.h.scene();
      if (sc) {
        const spot = this.sceneSpot();
        const key = JSON.stringify(spot);
        if (key !== this.spotKey) { this.spotKey = key; sc.setSpotlight(spot); }
      }
      this.raf = requestAnimationFrame(tick);
    };
    tick();
  }

  // Lần đầu bà Tư cho rau lớn nhanh: đi qua đủ 4 hình trong khoảng 3 giây
  fastGrow() {
    clearInterval(this.growTimer);
    const k = tut(this.s).box;
    this.growTimer = setInterval(() => {
      const b = this.s.boxes[k];
      if (!b || !b.crop) { clearInterval(this.growTimer); normalize(this.s, this.h.now()); this.show(); return; }
      b.progress = Math.min(1, b.progress + 0.06);
      b.lastT = this.h.now();
      this.h.render();
      if (b.progress >= 1) { clearInterval(this.growTimer); this.h.sound('harvest'); this.event('ripe'); }
    }, 170);
  }
}
