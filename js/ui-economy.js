// Giao diện chặng 4: tiệm anh Bảo (F11), bảng đơn hàng hàng xóm (F12), xác nhận mua thùng (F14).
// Luật nằm trong shop.js và orders.js; file này chỉ vẽ và gọi hàm xử lý do main.js truyền vào.

import { ITEMS, SHOP_BUY, CROPS } from './config.js';
import { T, fmt } from './text.vi.js';
import { itemIcon } from './icons.js';
import * as shop from './shop.js';
import * as inv from './inventory.js';
import * as orders from './orders.js';
import { duration } from './util.js';
import * as level from './level.js';
import * as decor from './decor.js';
import { DECOR } from './config.js';

const $ = id => document.getElementById(id);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const S = 'stroke="#3b2f2a" stroke-width="2.4" stroke-linejoin="round"';
export const AVATARS = {
  // Anh Bảo: nón kết xanh, ria mép, áo ba lỗ
  bao: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#cfe3c4"/><path d="M10 46c1-9 6-13 14-13s13 4 14 13z" fill="#f3f0e6" ${S}/><circle cx="24" cy="21" r="10" fill="#e9b98d" ${S}/><path d="M13 18c0-6 5-9 11-9s11 3 11 9z" fill="#3f7fb3" ${S}/><path d="M33 17h7" stroke="#3b2f2a" stroke-width="2.4" stroke-linecap="round"/><path d="M19 26c3 1.5 7 1.5 10 0" stroke="#3b2f2a" stroke-width="2.4" stroke-linecap="round" fill="none"/><circle cx="20" cy="21" r="1.4" fill="#3b2f2a"/><circle cx="28" cy="21" r="1.4" fill="#3b2f2a"/></svg>`,
  // Bà Tư: tóc bạc búi, kính tròn, áo bà ba tím
  ba_tu: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#efe0f3"/><path d="M10 46c1-9 6-13 14-13s13 4 14 13z" fill="#a98ad8" ${S}/><circle cx="24" cy="8" r="5" fill="#d9d6d0" ${S}/><circle cx="24" cy="22" r="10" fill="#f0c9a2" ${S}/><path d="M14 20c1-6 5-9 10-9s9 3 10 9c-3-3-6-4-10-4s-7 1-10 4z" fill="#d9d6d0" ${S}/><circle cx="20" cy="22" r="3" fill="none" ${S}/><circle cx="28" cy="22" r="3" fill="none" ${S}/><path d="M23 22h2" stroke="#3b2f2a" stroke-width="2"/><path d="M20 28c2.5 1.5 5.5 1.5 8 0" stroke="#3b2f2a" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>`,
  // Bé Na: tóc thắt hai bím, nơ đỏ, má hồng
  // Cô Mai: tóc dài, áo xanh lá, kẹp tóc hình lá
  co_mai: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#d9ecd2"/><path d="M12 30c-1-12 4-20 12-20s13 8 12 20z" fill="#3b2a20" ${S}/><path d="M10 46c1-9 6-13 14-13s13 4 14 13z" fill="#6fa35b" ${S}/><circle cx="24" cy="22" r="9.5" fill="#f2cba5" ${S}/><path d="M15 20c1-5 4-8 9-8s8 3 9 8c-3-2-6-4-9-4s-6 2-9 4z" fill="#3b2a20"/><path d="M30 13l4-2-1 4z" fill="#8cc46a" ${S}/><circle cx="20" cy="22" r="1.4" fill="#3b2f2a"/><circle cx="28" cy="22" r="1.4" fill="#3b2f2a"/><path d="M21 27c2 1.4 4 1.4 6 0" stroke="#3b2f2a" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>`,
  // Anh Tuấn: kính vuông, tóc bù xù, quai balo
  anh_tuan: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#dde6f2"/><path d="M10 46c1-9 6-13 14-13s13 4 14 13z" fill="#7a8fb0" ${S}/><path d="M16 35v11M32 35v11" stroke="#3b2f2a" stroke-width="2.4"/><circle cx="24" cy="22" r="10" fill="#efc59c" ${S}/><path d="M14 19c0-7 5-10 10-10s11 3 10 10c-2-2-3-4-5-3-2-2-4-1-5 0-2-2-5-1-6 1-1-1-3 0-4 2z" fill="#2f241d" ${S}/><rect x="16.5" y="19.5" width="6" height="5" rx="1" fill="none" ${S}/><rect x="25.5" y="19.5" width="6" height="5" rx="1" fill="none" ${S}/><path d="M22.5 22h3" stroke="#3b2f2a" stroke-width="2"/><path d="M21 28c2 1.2 4 1.2 6 0" stroke="#3b2f2a" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>`,
  // Chú Sáu: mũ bảo hiểm cam, áo khoác xe ôm
  chu_sau: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#f6e3c8"/><path d="M10 46c1-9 6-13 14-13s13 4 14 13z" fill="#4f9a7a" ${S}/><circle cx="24" cy="23" r="10" fill="#d9a77c" ${S}/><path d="M13 21c0-8 5-12 11-12s11 4 11 12z" fill="#e57d3a" ${S}/><path d="M13 21h22" stroke="#3b2f2a" stroke-width="2.4"/><circle cx="20" cy="25" r="1.4" fill="#3b2f2a"/><circle cx="28" cy="25" r="1.4" fill="#3b2f2a"/><path d="M19 30c3 1.6 7 1.6 10 0" stroke="#3b2f2a" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>`,
  // Chị Hoa: nón lá, tạp dề bán bánh mì
  chi_hoa: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#fbe7d2"/><path d="M10 46c1-9 6-13 14-13s13 4 14 13z" fill="#e57d5a" ${S}/><path d="M18 36h12v10H18z" fill="#fff8ec" ${S}/><circle cx="24" cy="23" r="9.5" fill="#f2c9a2" ${S}/><path d="M8 18L24 6l16 12z" fill="#e8cf8f" ${S}/><path d="M16 14l8 4 8-4" stroke="#c9a85e" stroke-width="1.6" fill="none"/><circle cx="20" cy="23" r="1.4" fill="#3b2f2a"/><circle cx="28" cy="23" r="1.4" fill="#3b2f2a"/><path d="M20 28c2.5 1.8 5.5 1.8 8 0" stroke="#3b2f2a" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>`,
  // Ông Ba: đầu hói, râu bạc, áo sơ mi nâu
  ong_ba: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#e6e1d6"/><path d="M10 46c1-9 6-13 14-13s13 4 14 13z" fill="#a97c4f" ${S}/><circle cx="24" cy="21" r="10" fill="#e8bd94" ${S}/><path d="M14.5 21c0-3 1-5 2-6M33.5 21c0-3-1-5-2-6" stroke="#d9d6d0" stroke-width="3" stroke-linecap="round"/><path d="M17 27c1 6 4 8 7 8s6-2 7-8c-2 2-4 2-7 2s-5 0-7-2z" fill="#f3f0e6" ${S}/><circle cx="20" cy="21" r="1.4" fill="#3b2f2a"/><circle cx="28" cy="21" r="1.4" fill="#3b2f2a"/><path d="M18 17h4M26 17h4" stroke="#d9d6d0" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  be_na: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#fde2cf"/><path d="M12 46c1-8 5-12 12-12s11 4 12 12z" fill="#f2b544" ${S}/><circle cx="11" cy="24" r="4" fill="#4a3326" ${S}/><circle cx="37" cy="24" r="4" fill="#4a3326" ${S}/><circle cx="24" cy="23" r="10" fill="#f6d2ae" ${S}/><path d="M14 21c1-6 5-9 10-9s9 3 10 9c-4-2-6-5-10-5s-6 3-10 5z" fill="#4a3326" ${S}/><path d="M28 12l5-3v6z" fill="#e5533c" ${S}/><circle cx="20" cy="23" r="1.4" fill="#3b2f2a"/><circle cx="28" cy="23" r="1.4" fill="#3b2f2a"/><circle cx="18" cy="27" r="1.8" fill="#f2a5a0"/><circle cx="30" cy="27" r="1.8" fill="#f2a5a0"/><path d="M21 28c2 1.4 4 1.4 6 0" stroke="#3b2f2a" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>`
};
const HEART = '<svg class="heart" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 17s-7-4.4-7-9.2A3.8 3.8 0 0 1 10 5.6a3.8 3.8 0 0 1 7 2.2C17 12.6 10 17 10 17z" fill="#e5533c" stroke="#3b2f2a" stroke-width="1.8" stroke-linejoin="round"/></svg>';
// Biểu tượng món trang trí (bản 0.15)
const SI = 'stroke="#3b2f2a" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"';
export const DECOR_ICONS = {
  hoa_giay: `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M12 26h16l-2 9H14z" fill="#c8703f" ${SI}/><circle cx="14" cy="17" r="5" fill="#e0559a" ${SI}/><circle cx="25" cy="14" r="5" fill="#ef7ab4" ${SI}/><circle cx="20" cy="21" r="5" fill="#d9418a" ${SI}/></svg>`,
  ghe_da: `<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="5" y="15" width="30" height="8" rx="3" fill="#c9c3b6" ${SI}/><path d="M9 23v10h6V23M25 23v10h6V23" fill="#aaa294" ${SI}/></svg>`,
  den_long: `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3v6" ${SI}/><path d="M15 9h10" ${SI}/><ellipse cx="20" cy="21" rx="10" ry="11" fill="#e4473a" ${SI}/><path d="M20 10v22M13 13c-2 5-2 11 0 16M27 13c2 5 2 11 0 16" fill="none" stroke="#a82a20" stroke-width="1.6"/><path d="M15 32h10l-2 3h-6z" fill="#f2b544" ${SI}/><path d="M20 35v3" ${SI}/></svg>`,
  cay_canh: `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M10 28h20l-2 7H12z" fill="#4f7fa8" ${SI}/><path d="M20 28c0-6-3-8-1-14" fill="none" ${SI}/><ellipse cx="13" cy="15" rx="7" ry="4.5" fill="#4f9a3a" ${SI}/><ellipse cx="25" cy="11" rx="8" ry="5" fill="#5fa548" ${SI}/><ellipse cx="22" cy="20" rx="6" ry="3.6" fill="#3f8a4a" ${SI}/></svg>`,
  sen_da: `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M11 25h18l-2 10H13z" fill="#e8d9c0" ${SI}/><ellipse cx="14" cy="21" rx="5" ry="3.5" fill="#8cc6a0" ${SI}/><ellipse cx="26" cy="21" rx="5" ry="3.5" fill="#8cc6a0" ${SI}/><ellipse cx="20" cy="18" rx="6" ry="5" fill="#6fae88" ${SI}/><ellipse cx="20" cy="13" rx="4" ry="4" fill="#c7e8c9" ${SI}/></svg>`,
  don_gom: `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M11 12c-4 5-4 15 0 21h18c4-6 4-16 0-21z" fill="#eef3f6" ${SI}/><ellipse cx="20" cy="12" rx="9" ry="3" fill="#dfe8ee" ${SI}/><circle cx="20" cy="22" r="4" fill="none" stroke="#3f6fa8" stroke-width="1.8"/><path d="M10 17h20M10 29h20" stroke="#3f6fa8" stroke-width="1.6"/></svg>`,
  chum_nuoc: `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M11 12c-4 4-4 16 2 21h14c6-5 6-17 2-21z" fill="#8a5a3a" ${SI}/><ellipse cx="20" cy="12" rx="9" ry="3" fill="#5aa9cc" ${SI}/><path d="M24 12l9-6" ${SI}/><ellipse cx="34" cy="5.5" rx="3.4" ry="2.4" fill="#c89a5a" ${SI}/><path d="M13 21h14" stroke="#6b4329" stroke-width="1.6"/></svg>`
};

const BAG_ICON = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M10 15h20l-2 18H12z" fill="#d9a46b" stroke="#3b2f2a" stroke-width="2.5" stroke-linejoin="round"/><path d="M15 15c0-4 2-7 5-7s5 3 5 7" fill="none" stroke="#3b2f2a" stroke-width="2.5" stroke-linecap="round"/><path d="M20 20v8M16 24h8" stroke="#3b2f2a" stroke-width="2.5" stroke-linecap="round"/></svg>';

// Nhóm của một món trong mục Mua của tiệm
const FERT = ['phan_lon_nhanh', 'phan_sai_qua'];
export const shopCat = id => ITEMS[id] && ITEMS[id].kind === 'seed' ? 'seed' : FERT.includes(id) ? 'fert' : 'other';

// "4 bó rau muống"
export const unitOf = id => T['unit_' + ITEMS[id].unit];
export const nounOf = id => {
  const it = ITEMS[id];
  if (it.kind === 'seed') return 'hạt ' + T['noun_' + it.crop];          // "gói hạt cà chua"
  return T['noun_' + id] || T['item_' + id].toLowerCase();
};

// Loại hàng để chọn câu phụ dưới đơn (B-01): rau quả, trứng, sản phẩm vật nuôi khác, món nấu
export function flavorKind(id) {
  const it = ITEMS[id] || {};
  if (it.kind === 'dish') return 'dish';
  if (it.kind === 'produce') return 'veg';
  if (id === 'trung_ga' || id === 'trung_bo_cau' || id === 'trung_ga_ngon') return 'egg';
  return 'pet';
}

export class EconomyUI {
  // h: { onSell(id, qty), onBuy(id, qty), onBagUpgrade(), onDeliver(orderId), onSkipOrder(orderId), onBuyBox() }
  constructor(ui, store, h, now) {
    this.ui = ui; this.store = store; this.h = h; this.now = now;
    this.tab = 'sell';
    this.cat = 'seed';   // nhóm trong mục Mua: seed (hạt giống) | fert (phân bón) | other (thức ăn vật nuôi, nâng cấp túi)
  }

  init() {
    $('shopAvatar').innerHTML = AVATARS.bao;
    $('toolShop').addEventListener('click', () => this.openShop());
    document.querySelectorAll('#shopCats .chip').forEach(c => c.addEventListener('click', () => {
      this.setCat(c.dataset.cat);
      this.renderShop();
      document.querySelector('#shopWrap .sheet').scrollTop = 0;
    }));
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
      else if (act === 'decor') this.h.onBuyDecor(id);
      else if (act === 'arrange') this.h.onArrange();
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

  setCat(cat) {
    this.cat = cat;
    document.querySelectorAll('#shopCats .chip').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.cat === cat)));
  }

  setTab(tab) {
    if (tab === 'buy' || tab === 'sell') this.setCat('seed');
    this.tab = tab;
    document.querySelectorAll('#shopTabs .chip').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.tab === tab)));
  }

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
    $('shopCats').hidden = this.tab !== 'buy';
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
    } else if (this.cat === 'decor') {
      html += this.decorRows(s);
    } else {
      // Nhóm "Thức ăn & túi đồ": nâng cấp túi đồ đứng đầu
      const up = this.cat === 'other' ? shop.nextBagUpgrade(s) : null;
      if (this.cat === 'other' && !up) html += `<li class="shop-row"><span class="ico">${BAG_ICON}</span><span class="meta"><b>${fmt(T.shop_bag_upgrade_max, { slots: s.inventory.slots })}</b></span></li>`;
      const bagLock = !level.isUnlocked(s, 'bag') ? level.unlockLevel('bag') : 0;
      if (up && bagLock) {
        html += `<li class="shop-row locked">
          <span class="ico">${BAG_ICON}</span>
          <span class="meta"><b>${fmt(T.shop_bag_upgrade, { n: up.slots })}</b><small class="why">${fmt(T.shop_locked, { n: bagLock })}</small></span>
          <span class="acts one"><button class="btn small" type="button" disabled>${fmt(T.shop_locked_btn, { n: bagLock })}</button></span></li>`;
      } else if (up) {
        const short = s.coins < up.price;
        html += `<li class="shop-row">
          <span class="ico">${BAG_ICON}</span>
          <span class="meta"><b>${fmt(T.shop_bag_upgrade, { n: up.slots })}</b><small>${fmt(T.shop_bag_upgrade_info, { slots: s.inventory.slots, price: up.price })}</small>${short ? `<small class="why">${fmt(T.shop_missing, { n: up.price - s.coins })}</small>` : ''}</span>
          <span class="acts one"><button class="btn small${short ? '' : ' primary'}" type="button" data-act="bag"${short ? ' disabled' : ''}>${fmt(T.shop_buy_bag, { price: up.price })}</button></span></li>`;
      }
      SHOP_BUY.filter(id => shopCat(id) === this.cat).forEach(id => {
        const price = shop.buyPrice(id);
        const one = shop.canBuy(s, id, 1), five = shop.canBuy(s, id, 5);
        const locked = one.reason === 'locked';
        const why = one.ok ? '' : locked ? fmt(T.shop_locked, { n: one.level }) : one.reason === 'coins' ? fmt(T.shop_missing, { n: one.missing }) : T.shop_bag_full;
        const tier = ITEMS[id].kind === 'seed' ? CROPS[ITEMS[id].crop].tier : 0;
        if (locked) {
          html += `<li class="shop-row locked${tier ? ' tier-' + tier : ''}">
            <span class="ico">${itemIcon(id)}</span>
            <span class="meta"><b>${T['item_' + id]}${tier ? ` <i class="tier-tag">${T['tier_' + tier]}</i>` : ''}</b><small class="why">${why}</small></span>
            <span class="acts one"><button class="btn small" type="button" disabled>${fmt(T.shop_locked_btn, { n: one.level })}</button></span></li>`;
          return;
        }
        html += `<li class="shop-row${tier ? ' tier-' + tier : ''}">
          <span class="ico">${itemIcon(id)}</span>
          <span class="meta"><b>${T['item_' + id]}${tier ? ` <i class="tier-tag">${T['tier_' + tier]}</i>` : ''}</b><small>${T['shop_desc_' + id] ? T['shop_desc_' + id] + ' · ' : ''}${fmt(T.shop_price, { price, unit: unitOf(id) })} · ${fmt(T.shop_have, { n: inv.count(s.inventory, id), price, unit: unitOf(id) }).split(' · ')[0]}</small>${why ? `<small class="why">${why}</small>` : ''}</span>
          <span class="acts">
            <button class="btn small${one.ok ? ' primary' : ''}" type="button" data-act="buy" data-id="${id}" data-qty="1"${one.ok ? '' : ' disabled'}>${T.shop_buy_one}</button>
            <button class="btn small" type="button" data-act="buy" data-id="${id}" data-qty="5"${five.ok ? '' : ' disabled'}>${T.shop_buy_five}</button>
          </span></li>`;
      });
    }
    $('shopList').innerHTML = html;
  }

  // Nhóm "Trang trí" (bản 0.15): điểm sân đẹp ở đầu, rồi từng món
  decorRows(s) {
    const pt = decor.points(s), next = decor.nextPerk(s);
    let html = `<li class="note beauty-line">${fmt(T.beauty_now, { n: pt, max: decor.maxPoints() })}${next ? ' · ' + fmt(T.beauty_next, { n: next.points - pt, perk: T['perk_' + next.perk] }) : ' · ' + T.beauty_all}</li>`;
    // F17: nút mở bảng Bày biện sân khi đã có món
    if ((s.decor || []).length) html += `<li class="arrange-row"><button class="btn primary" type="button" data-act="arrange">${T.arrange_open}</button></li>`;
    decor.DECOR_IDS.forEach(id => {
      const d = DECOR[id], have = decor.owned(s, id), c = decor.canBuy(s, id);
      const pts = fmt(T.decor_points, { n: d.points });
      let btn, why = '';
      if (have) btn = `<button class="btn small" type="button" disabled>${T.decor_owned}</button>`;
      else if (!d.price) { btn = `<button class="btn small" type="button" disabled>${fmt(T.shop_locked_btn, { n: level.unlockLevel('decor', id) })}</button>`; why = T.decor_gift; }
      else if (c.reason === 'locked') { btn = `<button class="btn small" type="button" disabled>${fmt(T.shop_locked_btn, { n: c.level })}</button>`; why = fmt(T.shop_locked, { n: c.level }); }
      else { btn = `<button class="btn small${c.ok ? ' primary' : ''}" type="button" data-act="decor" data-id="${id}"${c.ok ? '' : ' disabled'}>${fmt(T.shop_buy_bag, { price: d.price })}</button>`; if (c.reason === 'coins') why = fmt(T.shop_missing, { n: c.missing }); }
      html += `<li class="shop-row${have ? ' owned' : ''}${c.reason === 'locked' ? ' locked' : ''}">
        <span class="ico">${DECOR_ICONS[id]}</span>
        <span class="meta"><b>${T['decor_' + id]}</b><small>${T['decor_desc_' + id]} · ${pts}</small>${why ? `<small class="why">${why}</small>` : ''}</span>
        <span class="acts one">${btn}</span></li>`;
    });
    return html;
  }

  // ----- F12 Đơn hàng -----
  openOrders() { this.renderOrders(); this.ui.openWrap($('ordersWrap')); }

  renderOrders() {
    const s = this.state;
    const known = orders.unlocked(s), next = orders.nextNeighbor(s);
    $('friendsLine').innerHTML = `${T.friends_line}: ` + known.map(n => `<span><b>${T['name_' + n]}</b> ${HEART} ${s.friends[n] || 0}</span>`).join('')
      + (next ? `<span>${fmt(T.friends_next, { name: T['name_' + next.id], n: next.level })}</span>` : '');
    const list = s.orders.list;
    if (!list.length) { $('orderList').innerHTML = `<li class="note">${T.order_none}</li>`; return; }
    $('orderList').innerHTML = list.map(o => {
      const have = inv.count(s.inventory, o.item), ready = have >= o.qty;
      const flavors = T['order_flavor_' + o.from + '_' + flavorKind(o.item)];
      return `<li class="order-card${ready ? ' ready' : ''}">
        <span class="avatar">${AVATARS[o.from]}</span>
        <span class="txt">
          <b>${fmt(T.order_need, { name: T['name_' + o.from], qty: o.qty, unit: unitOf(o.item), noun: nounOf(o.item) })}</b>
          <small>${flavors[o.id % flavors.length]} · ${fmt(T.order_wait, { time: duration(orders.timeLeft(o, this.now())) })}</small>
          <span class="row"><span class="ico">${itemIcon(o.item)}</span><span class="bar"><i style="width:${Math.min(100, Math.round(have / o.qty * 100))}%"></i></span><span>${fmt(T.order_progress, { have: Math.min(have, o.qty), qty: o.qty })}</span></span>
          <span class="row"><span class="reward">${fmt(T.order_reward, decor.orderReward(s, o))} ${HEART}</span></span>
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
