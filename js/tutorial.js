// F19 Mở đầu cùng bà Tư: dẫn người chơi mới qua gieo – tưới – thu – bán lần đầu. Bỏ qua được.
//
// Phần luật (thuần, kiểm thử được): các bước, sự kiện nào đưa sang bước nào, bước nào cho chạm gì,
// và sửa bước cho khớp khi người chơi đóng game giữa chừng rồi mở lại (normalize).
// Phần giao diện (TutorialUI): hộp thoại bà Tư, làm sáng chỗ cần chạm, cho cây lớn nhanh.

import { T } from './text.vi.js';
import { AVATARS } from './ui-economy.js';
import * as farm from './farm.js';

export const STEPS = ['intro', 'plant', 'water', 'grow', 'harvest', 'sell', 'done'];
export const TUTORIAL_SEED = 'hat_rau_muong';

export const isActive = s => !s.tutorialDone;
const tut = s => s.tutorial || (s.tutorial = { step: 'intro', box: null });
const go = (s, step) => { tut(s).step = step; return step; };

export function finish(s) { s.tutorialDone = true; go(s, 'done'); }

export function restart(s) { s.tutorialDone = false; s.tutorial = { step: 'intro', box: null }; }

// Sửa bước cho khớp với sân hiện tại (mở lại game giữa chừng, hoặc người chơi đã tự làm trước)
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
  return t.step;
}

// Sự kiện từ game. Trả về bước mới (hoặc bước cũ nếu sự kiện không liên quan).
//   plant (index) · water (index) · ripe · harvest (index) · sell · next · skip
export function advance(s, event, data) {
  if (s.tutorialDone) return null;
  const t = tut(s);
  if (event === 'skip') { finish(s); return 'done'; }
  switch (t.step) {
    case 'intro': if (event === 'next') return go(s, 'plant'); break;
    case 'plant': if (event === 'plant') { t.box = data; return go(s, 'water'); } break;
    case 'water': if (event === 'water' && (data === t.box || data === 'all')) return go(s, 'grow'); break;
    case 'grow': if (event === 'ripe') return go(s, 'harvest'); break;
    case 'harvest': if (event === 'harvest' && data === t.box) return go(s, 'sell'); break;
    case 'sell': if (event === 'sell') return go(s, 'done'); break;
    case 'done': if (event === 'next') { finish(s); return 'done'; } break;
  }
  return t.step;
}

// Trong lúc hướng dẫn, bước nào cho chạm vào đâu. Túi đồ, cài đặt luôn mở được.
export function allows(s, action, data) {
  if (s.tutorialDone) return true;
  if (action === 'bag' || action === 'settings' || action === 'info') return true;
  const t = tut(s);
  switch (t.step) {
    case 'plant': return (action === 'tapBox' && !s.boxes[data].crop) || action === 'plant';
    case 'water': return (action === 'tapBox' && data === t.box) || action === 'waterAll';
    case 'harvest': return action === 'tapBox' && data === t.box;
    case 'sell': return action === 'shop' || action === 'sell';
    default: return false;
  }
}

// ----- Giao diện -----
const $ = id => document.getElementById(id);
const TOOL_FOR = { water: 'toolWater', sell: 'toolShop' };

export class TutorialUI {
  // h: { store, ui, scene(), now(), render(), sound(name) }
  constructor(h) { this.h = h; this.growTimer = 0; }

  get s() { return this.h.store.data; }

  init() {
    $('tutAvatar').innerHTML = AVATARS.ba_tu;
    $('tutNext').addEventListener('click', () => this.event('next'));
    $('tutSkip').addEventListener('click', () => { this.event('skip'); this.h.ui.toast(T.tut_skipped); });
  }

  // Bắt đầu (hoặc tiếp tục) nếu người chơi chưa xong hướng dẫn
  start() {
    if (!isActive(this.s)) { this.hide(); return; }
    // Bảo đảm có hạt rau muống để gieo
    const items = this.s.inventory.items;
    if (['intro', 'plant'].includes(tut(this.s).step) && !items[TUTORIAL_SEED]) items[TUTORIAL_SEED] = 1;
    normalize(this.s, this.h.now());
    this.show();
  }

  event(name, data) {
    if (!isActive(this.s) && name !== 'next') return;
    const before = tut(this.s).step;
    advance(this.s, name, data);
    if (tut(this.s).step !== before || this.s.tutorialDone) {
      this.h.store.flush();
      if (this.s.tutorialDone) { this.hide(); this.h.sound('chime'); return; }
      this.h.sound('open');
      this.show();
    }
  }

  allows(action, data) {
    if (allows(this.s, action, data)) return true;
    this.h.sound('deny');
    this.h.ui.toast(T.tut_blocked);
    return false;
  }

  show() {
    const step = tut(this.s).step;
    $('tutWrap').hidden = false;
    $('tutText').textContent = T['tut_' + step];
    const talkOnly = step === 'intro' || step === 'done';
    $('tutNext').hidden = !talkOnly;
    $('tutNext').textContent = step === 'done' ? T.tut_start : T.tut_next;
    $('tutSkip').hidden = step === 'done';
    // Làm sáng nút cần bấm và thùng cần chạm
    Object.values(TOOL_FOR).forEach(id => $(id).classList.remove('hint'));
    if (TOOL_FOR[step]) $(TOOL_FOR[step]).classList.add('hint');
    const sc = this.h.scene();
    if (sc) {
      const box = tut(this.s).box;
      const target = step === 'plant' ? this.s.boxes.findIndex(b => !b.crop) : (['water', 'grow', 'harvest'].includes(step) ? box : -1);
      sc.setSpotlight(target == null ? -1 : target);
    }
    if (step === 'grow') this.fastGrow();
  }

  hide() {
    $('tutWrap').hidden = true;
    Object.values(TOOL_FOR).forEach(id => $(id).classList.remove('hint'));
    const sc = this.h.scene();
    if (sc) sc.setSpotlight(-1);
    clearInterval(this.growTimer);
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
