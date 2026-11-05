// F16 Giao diện bếp nhỏ: nút "Bếp" trên thanh công cụ (hiện từ level 6, có nhãn khi đang nấu hoặc đã chín),
// bảng bếp với món đang nấu và danh sách công thức. Luật nằm trong kitchen.js.

import { RECIPES } from './config.js';
import { T, fmt } from './text.vi.js';
import { itemIcon, KITCHEN_ART } from './icons.js';
import { duration } from './util.js';
import * as K from './kitchen.js';
import * as inv from './inventory.js';
import { sellPrice } from './shop.js';

const $ = id => document.getElementById(id);
const dishName = id => T['item_' + id];

export class KitchenUI {
  // h: { onCook(id), onTake(), now(), sound(name) }
  constructor(ui, store, h) { this.ui = ui; this.store = store; this.h = h; }
  get s() { return this.store.data; }

  init() {
    $('kitchenArt').innerHTML = KITCHEN_ART;
    $('recipeList').addEventListener('click', e => {
      const b = e.target.closest('button[data-cook]');
      if (b && !b.disabled) this.h.onCook(b.dataset.cook);
    });
    $('kitchenNow').addEventListener('click', e => { if (e.target.closest('#kitchenTake')) this.h.onTake(); });
    this.refresh();
  }

  open() { this.render(); this.ui.openWrap($('kitchenWrap')); }
  isOpen() { return !$('kitchenWrap').hidden; }

  // Nút trên thanh công cụ: hiện khi đã mở bếp; nhãn thời gian còn lại hoặc "Xong"
  refresh() {
    const on = K.unlocked(this.s);
    $('toolKitchen').hidden = !on;
    const badge = $('kitchenBadge');
    if (!on) { badge.hidden = true; return; }
    const st = K.status(this.s, this.h.now());
    badge.hidden = st.key === 'idle';
    badge.classList.toggle('ready', st.key === 'ready');
    badge.textContent = st.key === 'ready' ? T.badge_ready : st.key === 'cooking' ? Math.max(1, Math.floor(st.left / 60000)) + '′' : '';
    if (!this.isOpen()) return;
    // Mỗi giây chỉ cập nhật phần "đang nấu"; danh sách món chỉ vẽ lại khi trạng thái bếp hoặc nguyên liệu đổi,
    // để nút "Nấu" không bị thay giữa lúc người chơi đang bấm
    if (this.signature() !== this.sig) this.render(); else this.renderNow();
  }

  signature() {
    const s = this.s, st = K.status(s, this.h.now());
    const items = Object.values(RECIPES).flatMap(r => Object.keys(r.needs)).map(id => inv.count(s.inventory, id)).join(',');
    const ords = ((s.orders && s.orders.list) || []).map(o => o.id + ':' + o.item).join(',');
    return [st.key, st.id || '', K.unlocked(s), (s.xp || 0), items, ords].join('|');
  }

  renderNow() {
    const st = K.status(this.s, this.h.now());
    $('kitchenSay').textContent = T['kitchen_say_' + st.key];
    const box = $('kitchenNow');
    box.classList.toggle('ready', st.key === 'ready');
    if (st.key === 'idle') box.innerHTML = `<p class="note">${T.kitchen_idle} ${T.kitchen_note}</p>`;
    else if (st.key === 'cooking') box.innerHTML = `<div class="line"><span>${itemIcon(st.id)}</span><span>${fmt(T.kitchen_cooking, { dish: dishName(st.id), time: duration(st.left) })}</span></div><div class="lvl-bigbar"><i style="width:${Math.round(st.frac * 100)}%"></i></div>`;
    else if (!$('kitchenTake')) box.innerHTML = `<div class="line"><span>${itemIcon(st.id)}</span><span><b>${fmt(T.kitchen_ready, { dish: dishName(st.id) })}</b></span></div><button class="btn primary" type="button" id="kitchenTake">${T.kitchen_take}</button>`;
  }

  render() {
    const s = this.s, now = this.h.now();
    this.sig = this.signature();
    this.renderNow();
    $('recipeList').innerHTML = K.IDS.map(id => {
      const r = RECIPES[id], c = K.canCook(s, id, now);
      const needs = Object.entries(r.needs).map(([item, n]) => {
        const have = inv.count(s.inventory, item);
        return `<span class="${have < n ? 'short' : ''}">${T['item_' + item]} ${Math.min(have, 99)}/${n}</span>`;
      }).join('');
      const info = fmt(T.recipe_info, { time: duration(r.time), price: r.sell, value: K.ingredientValue(id, sellPrice) });
      if (c.reason === 'recipe_locked') {
        return `<li class="shop-row locked"><span class="ico">${itemIcon(id)}</span><span class="meta"><b>${dishName(id)}</b><small>${info}</small></span>
          <span class="acts one"><button class="btn small" type="button" disabled>${fmt(T.recipe_locked, { n: c.level })}</button></span></li>`;
      }
      // Bản 0.16.1: món đang có hàng xóm đặt thì ghi rõ ai đặt, bao nhiêu
      const wants = ((s.orders && s.orders.list) || []).filter(o => o.item === id)
        .map(o => `<small class="ordered">${fmt(T.kitchen_ordered, { name: T['name_' + o.from], qty: o.qty, unit: T['unit_' + r.unit] })}</small>`).join('');
      const label = c.ok ? T.recipe_cook : c.reason === 'busy' ? T.recipe_busy : T.recipe_missing;
      return `<li class="shop-row"><span class="ico">${itemIcon(id)}</span>
        <span class="meta"><b>${dishName(id)}</b><span class="needs">${needs}</span><small>${info}</small>${wants}</span>
        <span class="acts one"><button class="btn small${c.ok ? ' primary' : ''}" type="button" data-cook="${id}"${c.ok ? '' : ' disabled'}>${label}</button></span></li>`;
    }).join('');
  }
}
