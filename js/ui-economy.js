// Giao diện chặng 4: tiệm anh Bảo (F11), bảng đơn hàng hàng xóm (F12), xác nhận mua thùng (F14).
// Luật nằm trong shop.js và orders.js; file này chỉ vẽ và gọi hàm xử lý do main.js truyền vào.

import { ITEMS, SHOP_BUY } from './config.js';
import { T, fmt } from './text.vi.js';
import { itemIcon } from './icons.js';
import * as shop from './shop.js';
import * as inv from './inventory.js';

const $ = id => document.getElementById(id);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const S = 'stroke="#3b2f2a" stroke-width="2.4" stroke-linejoin="round"';
export const AVATARS = {
  // Anh Bảo: nón kết xanh, ria mép, áo ba lỗ
  bao: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#cfe3c4"/><path d="M10 46c1-9 6-13 14-13s13 4 14 13z" fill="#f3f0e6" ${S}/><circle cx="24" cy="21" r="10" fill="#e9b98d" ${S}/><path d="M13 18c0-6 5-9 11-9s11 3 11 9z" fill="#3f7fb3" ${S}/><path d="M33 17h7" stroke="#3b2f2a" stroke-width="2.4" stroke-linecap="round"/><path d="M19 26c3 1.5 7 1.5 10 0" stroke="#3b2f2a" stroke-width="2.4" stroke-linecap="round" fill="none"/><circle cx="20" cy="21" r="1.4" fill="#3b2f2a"/><circle cx="28" cy="21" r="1.4" fill="#3b2f2a"/></svg>`,
  // Bà Tư: tóc bạc búi, kính tròn, áo bà ba tím
  ba_tu: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#efe0f3"/><path d="M10 46c1-9 6-13 14-13s13 4 14 13z" fill="#a98ad8" ${S}/><circle cx="24" cy="8" r="5" fill="#d9d6d0" ${S}/><circle cx="24" cy="22" r="10" fill="#f0c9a2" ${S}/><path d="M14 20c1-6 5-9 10-9s9 3 10 9c-3-3-6-4-10-4s-7 1-10 4z" fill="#d9d6d0" ${S}/><circle cx="20" cy="22" r="3" fill="none" ${S}/><circle cx="28" cy="22" r="3" fill="none" ${S}/><path d="M23 22h2" stroke="#3b2f2a" stroke-width="2"/><path d="M20 28c2.5 1.5 5.5 1.5 8 0" stroke="#3b2f2a" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>`,
  // Bé Na: tóc thắt hai bím, nơ đỏ, má hồng
  be_na: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#fde2cf"/><path d="M12 46c1-8 5-12 12-12s11 4 12 12z" fill="#f2b544" ${S}/><circle cx="11" cy="24" r="4" fill="#4a3326" ${S}/><circle cx="37" cy="24" r="4" fill="#4a3326" ${S}/><circle cx="24" cy="23" r="10" fill="#f6d2ae" ${S}/><path d="M14 21c1-6 5-9 10-9s9 3 10 9c-4-2-6-5-10-5s-6 3-10 5z" fill="#4a3326" ${S}/><path d="M28 12l5-3v6z" fill="#e5533c" ${S}/><circle cx="20" cy="23" r="1.4" fill="#3b2f2a"/><circle cx="28" cy="23" r="1.4" fill="#3b2f2a"/><circle cx="18" cy="27" r="1.8" fill="#f2a5a0"/><circle cx="30" cy="27" r="1.8" fill="#f2a5a0"/><path d="M21 28c2 1.4 4 1.4 6 0" stroke="#3b2f2a" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>`
};
const HEART = '<svg class="heart" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 17s-7-4.4-7-9.2A3.8 3.8 0 0 1 10 5.6a3.8 3.8 0 0 1 7 2.2C17 12.6 10 17 10 17z" fill="#e5533c" stroke="#3b2f2a" stroke-width="1.8" stroke-linejoin="round"/></svg>';
const BAG_ICON = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M10 15h20l-2 18H12z" fill="#d9a46b" stroke="#3b2f2a" stroke-width="2.5" stroke-linejoin="round"/><path d="M15 15c0-4 2-7 5-7s5 3 5 7" fill="none" stroke="#3b2f2a" stroke-width="2.5" stroke-linecap="round"/><path d="M20 20v8M16 24h8" stroke="#3b2f2a" stroke-width="2.5" stroke-linecap="round"/></svg>';

// "4 bó rau muống"
export const unitOf = id => T['unit_' + ITEMS[id].unit];
export const nounOf = id => {
  const it = ITEMS[id];
  if (it.kind === 'seed') return 'hạt ' + T['noun_' + it.crop];          // "gói hạt cà chua"
  return T['noun_' + id] || T['item_' + id].toLowerCase();
};

export class EconomyUI {
  // h: { onSell(id, qty), onBuy(id, qty), onBagUpgrade(), onDeliver(orderId), onSkipOrder(orderId), onBuyBox() }
  constructor(ui, store, h) {
    this.ui = ui; this.store = store; this.h = h;
    this.tab = 'sell';
  }

  init() {
    $('shopAvatar').innerHTML = AVATARS.bao;
    $('toolShop').addEventListener('click', () => this.openShop());
    document.querySelectorAll('#shopTabs .chip').forEach(c => c.addEventListener('click', () => {
      this.tab = c.dataset.tab;
      document.querySelectorAll('#shopTabs .chip').forEach(x => x.setAttribute('aria-pressed', String(x === c)));
      this.renderShop();
    }));
    $('shopList').addEventListener('click', e => {
      const b = e.target.closest('button[data-act]');
      if (!b || b.disabled) return;
      const { act, id } = b.dataset, qty = Number(b.dataset.qty);
      if (act === 'sell') this.h.onSell(id, qty);
      else if (act === 'buy') this.h.onBuy(id, qty);
      else if (act === 'bag') this.h.onBagUpgrade();
    });
    $('orderList').addEventListener('click', e => {
      const b = e.target.closest('button[data-act]');
      if (!b || b.disabled) return;
      const id = Number(b.dataset.id);
      if (b.dataset.act === 'deliver') this.h.onDeliver(id);
      else this.h.onSkipOrder(id);
    });
    $('buyBoxBtn').addEventListener('click', () => {
      if ($('buyBoxBtn').disabled) return;
      this.ui.closeWrap($('buyBoxWrap'));
      this.h.onBuyBox();
    });
  }

  get state() { return this.store.data; }

  // ----- F11 Tiệm -----
  openShop() {
    this.say(pick(T.shop_greet));
    this.renderShop();
    this.ui.openWrap($('shopWrap'));
  }

  say(text) { $('shopSay').textContent = text; }

  renderShop() {
    const s = this.state;
    let html = '';
    if (this.tab === 'sell') {
      const ids = shop.sellable(s).sort((a, b) => Object.keys(ITEMS).indexOf(a) - Object.keys(ITEMS).indexOf(b));
      if (!ids.length) html = `<li class="note">${T.shop_nothing_to_sell}</li>`;
      ids.forEach(id => {
        const n = inv.count(s.inventory, id), price = shop.sellPrice(id);
        html += `<li class="shop-row">
          <span class="ico">${itemIcon(id)}</span>
          <span class="meta"><b>${T['item_' + id]}</b><small>${fmt(T.shop_have, { n, price, unit: unitOf(id) })}</small></span>
          <span class="acts">
            <button class="btn small" type="button" data-act="sell" data-id="${id}" data-qty="1">${T.shop_sell_one}</button>
            <button class="btn small primary" type="button" data-act="sell" data-id="${id}" data-qty="${n}">${fmt(T.shop_sell_all, { coins: n * price })}</button>
          </span></li>`;
      });
    } else {
      // Nâng cấp túi đồ đứng đầu
      const up = shop.nextBagUpgrade(s);
      if (up) {
        const short = s.coins < up.price;
        html += `<li class="shop-row">
          <span class="ico">${BAG_ICON}</span>
          <span class="meta"><b>${fmt(T.shop_bag_upgrade, { n: up.slots })}</b><small>${fmt(T.shop_bag_upgrade_info, { slots: s.inventory.slots, price: up.price })}</small>${short ? `<small class="why">${fmt(T.shop_missing, { n: up.price - s.coins })}</small>` : ''}</span>
          <span class="acts one"><button class="btn small${short ? '' : ' primary'}" type="button" data-act="bag"${short ? ' disabled' : ''}>${fmt(T.shop_buy_bag, { price: up.price })}</button></span></li>`;
      } else {
        html += `<li class="shop-row"><span class="ico">${BAG_ICON}</span><span class="meta"><b>${fmt(T.shop_bag_upgrade_max, { slots: s.inventory.slots })}</b></span></li>`;
      }
      SHOP_BUY.forEach(id => {
        const price = shop.buyPrice(id);
        const one = shop.canBuy(s, id, 1), five = shop.canBuy(s, id, 5);
        const why = one.ok ? '' : one.reason === 'coins' ? fmt(T.shop_missing, { n: one.missing }) : T.shop_bag_full;
        html += `<li class="shop-row">
          <span class="ico">${itemIcon(id)}</span>
          <span class="meta"><b>${T['item_' + id]}</b><small>${fmt(T.shop_price, { price, unit: unitOf(id) })} · ${fmt(T.shop_have, { n: inv.count(s.inventory, id), price, unit: unitOf(id) }).split(' · ')[0]}</small>${why ? `<small class="why">${why}</small>` : ''}</span>
          <span class="acts">
            <button class="btn small${one.ok ? ' primary' : ''}" type="button" data-act="buy" data-id="${id}" data-qty="1"${one.ok ? '' : ' disabled'}>${T.shop_buy_one}</button>
            <button class="btn small" type="button" data-act="buy" data-id="${id}" data-qty="5"${five.ok ? '' : ' disabled'}>${T.shop_buy_five}</button>
          </span></li>`;
      });
    }
    $('shopList').innerHTML = html;
  }

  // ----- F12 Đơn hàng -----
  openOrders() { this.renderOrders(); this.ui.openWrap($('ordersWrap')); }

  renderOrders() {
    const s = this.state;
    $('friendsLine').innerHTML = `${T.friends_line}: ` + Object.keys(s.friends).map(n => `<span><b>${T['name_' + n]}</b> ${HEART} ${s.friends[n]}</span>`).join('');
    const list = s.orders.list;
    if (!list.length) { $('orderList').innerHTML = `<li class="note">${T.order_none}</li>`; return; }
    $('orderList').innerHTML = list.map(o => {
      const have = inv.count(s.inventory, o.item), ready = have >= o.qty;
      const flavors = T['order_flavor_' + o.from];
      return `<li class="order-card${ready ? ' ready' : ''}">
        <span class="avatar">${AVATARS[o.from]}</span>
        <span class="txt">
          <b>${fmt(T.order_need, { name: T['name_' + o.from], qty: o.qty, unit: unitOf(o.item), noun: nounOf(o.item) })}</b>
          <small>${flavors[o.id % flavors.length]}</small>
          <span class="row"><span class="ico">${itemIcon(o.item)}</span><span class="bar"><i style="width:${Math.min(100, Math.round(have / o.qty * 100))}%"></i></span><span>${fmt(T.order_progress, { have: Math.min(have, o.qty), qty: o.qty })}</span></span>
          <span class="row"><span class="reward">${fmt(T.order_reward, { coins: o.coins, hearts: o.hearts })} ${HEART}</span></span>
        </span>
        <span class="acts">
          <button class="btn small${ready ? ' primary' : ''}" type="button" data-act="deliver" data-id="${o.id}"${ready ? '' : ' disabled'}>${ready ? T.order_deliver : fmt(T.order_missing, { n: o.qty - have })}</button>
          <button class="btn small ghost" type="button" data-act="skip" data-id="${o.id}">${T.order_skip}</button>
        </span></li>`;
    }).join('');
  }

  // ----- F14 Xác nhận mua thùng -----
  openBuyBox() {
    const s = this.state, price = shop.nextBoxPrice(s);
    if (!price) return;
    const short = s.coins < price;
    $('buyBoxInfo').textContent = fmt(T.buybox_info, { n: s.boxes.length + 1, price });
    $('buyBoxHave').textContent = short ? fmt(T.buybox_missing, { n: price - s.coins }) : fmt(T.buybox_have, { coins: s.coins });
    const b = $('buyBoxBtn');
    b.textContent = fmt(T.buybox_buy, { price });
    b.disabled = short;
    this.ui.openWrap($('buyBoxWrap'), short ? '[data-close].btn' : '#buyBoxBtn');
  }

  refresh() {
    if (!$('shopWrap').hidden) this.renderShop();
    if (!$('ordersWrap').hidden) this.renderOrders();
  }
}
