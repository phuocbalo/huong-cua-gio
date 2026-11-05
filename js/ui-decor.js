// F17 Giao diện bày biện sân (bản 0.17): bảng "Bày biện sân" liệt kê món trang trí đã có, và chế độ chọn chỗ
// trên sân (vòng vàng ở các chỗ vừa cỡ món). Luật nằm trong decor.js.

import { DECOR } from './config.js';
import { T, fmt } from './text.vi.js';
import * as D from './decor.js';
import { DECOR_ICONS } from './ui-economy.js';

const $ = id => document.getElementById(id);
const nameOf = id => T['decor_' + id];

export class DecorUI {
  // h: { store, ui, scene(), sound(name), onChanged() }
  constructor(h) { this.h = h; this.placingId = null; }
  get s() { return this.h.store.data; }

  init() {
    $('arrangeList').addEventListener('click', e => {
      const b = e.target.closest('button[data-arr]');
      if (!b || b.disabled) return;
      const { arr, id } = b.dataset;
      if (arr === 'move') this.startPlacing(id);
      else if (arr === 'flip') this.apply(D.flip(this.s, id), null);
      else if (arr === 'store') this.apply(D.store(this.s, id), fmt(T.stored_ok, { name: nameOf(id).toLowerCase() }));
    });
    $('placeDone').addEventListener('click', () => this.stopPlacing(true));
  }

  open() {
    D.normalize(this.s);
    this.render();
    this.h.ui.openWrap($('arrangeWrap'));
  }

  render() {
    const s = this.s, pt = D.points(s), next = D.nextPerk(s);
    $('arrangeBeauty').textContent = fmt(T.beauty_now, { n: pt, max: D.maxPoints() }) + (next ? ' · ' + fmt(T.beauty_next, { n: next.points - pt, perk: T['perk_' + next.perk] }) : ' · ' + T.beauty_all);
    const ids = D.DECOR_IDS.filter(id => D.owned(s, id));
    if (!ids.length) { $('arrangeList').innerHTML = `<li class="note">${T.arrange_none}</li>`; return; }
    $('arrangeList').innerHTML = ids.map(id => {
      const placed = D.isPlaced(s, id), size = DECOR[id].size;
      const sizeNote = size === 'wide' ? `<small>${T.arrange_size_wide}</small>` : size === 'short' ? `<small>${T.arrange_size_short}</small>` : '';
      const acts = placed
        ? `<button class="btn small primary" type="button" data-arr="move" data-id="${id}">${T.arrange_move}</button>
           <button class="btn small" type="button" data-arr="flip" data-id="${id}">${T.arrange_flip}</button>
           <button class="btn small" type="button" data-arr="store" data-id="${id}">${T.arrange_store}</button>`
        : `<button class="btn small primary" type="button" data-arr="move" data-id="${id}">${T.arrange_place}</button>`;
      return `<li class="shop-row${placed ? '' : ' stored'}"><span class="ico">${DECOR_ICONS[id]}</span>
        <span class="meta"><b>${nameOf(id)}</b><small>${placed ? T.arrange_at : T.arrange_stored} · ${fmt(T.decor_points, { n: DECOR[id].points })}</small>${sizeNote}</span>
        <span class="acts ${placed ? 'three' : 'one'}">${acts}</span></li>`;
    }).join('');
  }

  apply(r, msg) {
    if (!r.ok) { this.h.sound('deny'); return; }
    this.h.sound('tap');
    if (msg) this.h.ui.toast(msg);
    this.h.onChanged();
    this.render();
  }

  // Chọn chỗ trên sân: đóng bảng, hiện vòng vàng ở mọi chỗ vừa cỡ món, thanh nhắc ở trên cùng
  startPlacing(id) {
    this.placingId = id;
    this.h.ui.closeWrap($('arrangeWrap'));
    $('placeText').textContent = fmt(T.place_bar, { name: nameOf(id).toLowerCase() });
    $('placeBar').hidden = false;
    $('frame').classList.add('placing');
    const sc = this.h.scene();
    if (sc) sc.setPlacing({ id, spots: D.spotsFor(id), current: D.placeOf(this.s, id).spot });
    this.h.sound('open');
  }

  // Người chơi chạm một chỗ trên sân
  pick(spot) {
    const id = this.placingId;
    if (!id) return;
    const r = D.move(this.s, id, spot);
    if (!r.ok) { this.h.sound('deny'); return; }
    const name = nameOf(id).toLowerCase();
    const msg = r.swapped ? fmt(T.placed_swap, { name, other: nameOf(r.swapped).toLowerCase() })
      : r.stored ? fmt(T.placed_stored, { name, other: nameOf(r.stored).toLowerCase() })
      : fmt(T.placed_ok, { name });
    this.h.sound('buy');
    this.h.ui.toast(msg);
    this.h.onChanged();
    this.stopPlacing(false);
    setTimeout(() => this.open(), 700);   // mở lại bảng để bày tiếp món khác
  }

  stopPlacing(reopen) {
    this.placingId = null;
    $('placeBar').hidden = true;
    $('frame').classList.remove('placing');
    const sc = this.h.scene();
    if (sc) sc.setPlacing(null);
    if (reopen) this.open();
  }
}
