// Giao diện HTML phủ trên cảnh: khung dọc, thanh trên, thông báo, thanh công cụ, bảng thông tin bản thử.

import { W, H, APP_VERSION, periodOf, CROPS, ITEMS } from './config.js';
import { itemIcon } from './icons.js';
import * as inv from './inventory.js';
import { T, fmt } from './text.vi.js';
import { applyText, hhmm, hhmmss, duration } from './util.js';

const $ = id => document.getElementById(id);

const ICONS = {
  morning:   '<circle cx="16" cy="16" r="7" fill="#f2b544" stroke="#3b2f2a" stroke-width="2.5"/><path d="M16 3v4M16 25v4M3 16h4M25 16h4M7 7l2.8 2.8M22.2 22.2L25 25M25 7l-2.8 2.8M9.8 22.2L7 25" stroke="#3b2f2a" stroke-width="2.5" stroke-linecap="round"/>',
  afternoon: '<circle cx="13" cy="13" r="7" fill="#f2b544" stroke="#3b2f2a" stroke-width="2.5"/><path d="M10 26h14a5 5 0 0 0 0-10 6 6 0 0 0-11 2 4 4 0 0 0-3 8z" fill="#fff8ec" stroke="#3b2f2a" stroke-width="2.5" stroke-linejoin="round"/>',
  evening:   '<path d="M4 22h24" stroke="#3b2f2a" stroke-width="2.5" stroke-linecap="round"/><path d="M8 22a8 8 0 0 1 16 0z" fill="#f29a6a" stroke="#3b2f2a" stroke-width="2.5" stroke-linejoin="round"/><path d="M16 6v4M6.5 12l2.5 2M25.5 12L23 14" stroke="#3b2f2a" stroke-width="2.5" stroke-linecap="round"/>',
  night:     '<path d="M21 5a11 11 0 1 0 6 18A9 9 0 0 1 21 5z" fill="#ffe3a3" stroke="#3b2f2a" stroke-width="2.5" stroke-linejoin="round"/>'
};

export class UI {
  constructor({ store, clock, pwa, onFrameResize, onPeriodChange, onWaterAll, onPlant, onSkip, onAddSeeds }) {
    this.onWaterAll = onWaterAll;
    this.onPlant = onPlant;
    this.onSkip = onSkip;
    this.onAddSeeds = onAddSeeds;
    this.seedBox = -1;
    this.bagKind = 'all';
    this.store = store;
    this.clock = clock;
    this.pwa = pwa;
    this.onFrameResize = onFrameResize;
    this.onPeriodChange = onPeriodChange;
    this.override = 'auto';
    this.shownPeriod = null;
    this.toastTimer = 0;
    this.resetArmed = 0;
  }

  init() {
    applyText(document, T);
    $('infoBtn').textContent = fmt(T.info_button, { v: APP_VERSION.split('.').slice(0, 2).join('.') });
    $('boot').textContent = T.booting;

    this.fitFrame();
    window.addEventListener('resize', () => this.fitFrame());
    window.addEventListener('orientationchange', () => setTimeout(() => this.fitFrame(), 200));

    document.querySelectorAll('.tool[data-soon]').forEach(b => b.addEventListener('click', () => this.toast(T[b.dataset.soon])));
    $('toolBag').addEventListener('click', () => this.openBag());
    $('toolWater').addEventListener('click', () => this.onWaterAll());

    // Các bảng dùng chung cách đóng: nền tối, nút Đóng, phím Esc
    document.querySelectorAll('.wrap [data-close]').forEach(el => el.addEventListener('click', () => this.closeWrap(el.closest('.wrap'))));
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const open = document.querySelector('.wrap:not([hidden])');
      if (open) this.closeWrap(open);
    });
    $('seedList').addEventListener('click', e => {
      const b = e.target.closest('button[data-seed]');
      if (!b || b.disabled) return;
      const box = this.seedBox;
      this.closeWrap($('seedWrap'));
      this.onPlant(box, b.dataset.seed);
    });
    document.querySelectorAll('#bagTabs .chip').forEach(c => c.addEventListener('click', () => {
      this.bagKind = c.dataset.kind;
      document.querySelectorAll('#bagTabs .chip').forEach(x => x.setAttribute('aria-pressed', String(x === c)));
      this.renderBag();
    }));

    $('skip10m').addEventListener('click', () => this.onSkip(10 * 60 * 1000));
    $('skip1h').addEventListener('click', () => this.onSkip(60 * 60 * 1000));
    $('addSeeds').addEventListener('click', () => this.onAddSeeds());

    $('infoBtn').addEventListener('click', () => this.openSheet());
    $('sheetClose').addEventListener('click', () => this.closeSheet());
    $('sheetBackdrop').addEventListener('click', () => this.closeSheet());
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('sheetWrap').hidden) this.closeSheet(); });
    document.querySelectorAll('#periodChips .chip').forEach(c => c.addEventListener('click', () => {
      this.override = c.dataset.p;
      document.querySelectorAll('#periodChips .chip').forEach(x => x.setAttribute('aria-pressed', String(x === c)));
      this.refreshClock();
    }));

    $('addCoins').addEventListener('click', () => {
      this.store.data.coins += 10;
      this.store.flush();
      this.refreshCoins();
      this.toast(T.test_coins_added);
    });
    $('resetData').addEventListener('click', () => this.onResetClick());

    this.store.onChange(ev => {
      if (ev === 'failed') this.toast(T.save_failed);
      this.refreshInfo();
    });
    this.clock.on(type => { if (type === 'tick') this.refreshClock(); });
    setInterval(() => this.refreshInfo(), 1000);

    this.refreshCoins();
    this.refreshClock();
  }

  // ----- Khung dọc: luôn giữ tỉ lệ W:H và nằm giữa -----
  fitFrame() {
    const stage = $('stage'), frame = $('frame');
    const cs = getComputedStyle(stage);
    const aw = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const ah = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const scale = Math.min(aw / W, ah / H);
    frame.style.width = Math.floor(W * scale) + 'px';
    frame.style.height = Math.floor(H * scale) + 'px';
    if (this.onFrameResize) this.onFrameResize();
    this.refreshInfo();
  }

  hideBoot() { $('boot').hidden = true; }

  toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  currentPeriod() { return this.override === 'auto' ? periodOf(new Date().getHours()) : this.override; }

  refreshClock() {
    const p = this.currentPeriod();
    $('clock').textContent = hhmm(new Date());
    $('period').textContent = T['period_' + p];
    if (p !== this.shownPeriod) {
      $('periodIcon').innerHTML = ICONS[p];
      this.shownPeriod = p;
      if (this.onPeriodChange) this.onPeriodChange(p);
    }
  }

  // Cảnh vừa sẵn sàng: vẽ lại khung giờ hiện tại
  forcePeriod() { this.shownPeriod = null; this.refreshClock(); }

  refreshCoins() { $('coins').textContent = this.store.data.coins; }

  // ----- Bảng chung -----
  openWrap(el, focusSel) {
    this.lastFocus = document.activeElement;
    el.hidden = false;
    el.querySelector('.sheet').scrollTop = 0;
    const f = el.querySelector(focusSel || '[data-close].close');
    if (f) f.focus({ preventScroll: true });
  }
  closeWrap(el) {
    el.hidden = true;
    if (this.lastFocus && this.lastFocus.focus) this.lastFocus.focus({ preventScroll: true });
  }

  // ----- F01 Bảng chọn hạt -----
  openSeedPicker(boxIndex) {
    this.seedBox = boxIndex;
    const items = this.store.data.inventory;
    const rows = Object.keys(ITEMS).filter(id => ITEMS[id].kind === 'seed').map(id => {
      const crop = ITEMS[id].crop, c = CROPS[crop], n = inv.count(items, id);
      const info = c.harvests > 1 ? fmt(T.seed_row_info, { time: duration(c.growTime), n: c.harvests }) : fmt(T.seed_row_info_once, { time: duration(c.growTime) });
      return `<li class="seed-row${n ? '' : ' empty'}">
        <span class="ico">${itemIcon(id)}</span>
        <span class="meta"><b>${T['item_' + id]}</b><small>${info}</small></span>
        <span class="qty" aria-label="${n}">×${n}</span>
        <button class="btn small${n ? ' primary' : ''}" type="button" data-seed="${id}"${n ? '' : ' disabled'}>${n ? T.seed_plant : T.seed_none_left}</button>
      </li>`;
    });
    $('seedList').innerHTML = rows.join('');
    this.openWrap($('seedWrap'), 'button[data-seed]:not([disabled])');
  }

  // ----- F10 Túi đồ -----
  openBag() { this.renderBag(); this.openWrap($('bagWrap')); }

  renderBag() {
    const items = this.store.data.inventory;
    $('bagSlots').textContent = fmt(T.bag_slots, { used: inv.usedSlots(items), total: items.slots });
    const list = inv.slotList(items, this.bagKind);
    const cells = list.map(s => `<div class="slot" role="img" aria-label="${T['item_' + s.id]}: ${s.qty}">${itemIcon(s.id)}<span class="q">${s.qty}</span><span class="nm">${T['item_' + s.id]}</span></div>`);
    // Tab "Tất cả" hiện cả ô trống để thấy kho còn bao nhiêu chỗ
    if (this.bagKind === 'all') for (let k = list.length; k < items.slots; k++) cells.push('<div class="slot blank" aria-hidden="true"></div>');
    $('bagGrid').innerHTML = cells.length ? cells.join('') : `<p class="note">${T.bag_empty}</p>`;
  }

  refreshOpenSheets() {
    if (!$('bagWrap').hidden) this.renderBag();
  }

  // Toạ độ nút túi đồ trong cảnh, để nông sản bay về đó
  bagTarget() {
    const f = $('frame').getBoundingClientRect(), b = $('toolBag').getBoundingClientRect();
    return { x: (b.left + b.width / 2 - f.left) / f.width * W, y: (b.top + b.height / 2 - f.top) / f.height * H };
  }

  // ----- Bảng thông tin bản thử -----
  openSheet() {
    $('sheetWrap').hidden = false;
    this.refreshInfo();
    document.querySelector('.sheet').scrollTop = 0;
    $('sheetClose').focus({ preventScroll: true });
  }
  closeSheet() { $('sheetWrap').hidden = true; this.disarmReset(); $('infoBtn').focus(); }

  refreshInfo() {
    if ($('sheetWrap').hidden) return;
    const d = this.store.data, c = d.clock, now = new Date();
    const set = (id, v) => { $(id).textContent = v; };
    set('iStorage', this.store.storage === 'idb' ? T.info_storage_idb : T.info_storage_memory);
    set('iSavedAt', d.savedAt ? hhmmss(new Date(d.savedAt)) : T.info_saved_never);
    set('iCoins', String(d.coins));
    set('iStarted', new Date(d.createdAt).toLocaleDateString('vi-VN') + ' ' + hhmm(new Date(d.createdAt)));
    set('iGameTime', duration(c.gameTime));
    set('iAway', c.lastAway ? duration(c.lastAway) : '–');
    set('iRewound', c.rewinds ? fmt(T.info_rewound_count, { n: c.rewinds, time: duration(c.lastRewind) }) : T.info_rewound_none);
    set('iTime', hhmmss(now));

    set('iVer', this.pwa.version || APP_VERSION);
    set('iMode', this.pwa.isStandalone() ? T.info_mode_app : T.info_mode_browser);
    set('iOffline', T['info_offline_' + this.pwa.state]);
    set('iNet', navigator.onLine ? T.info_net_on : T.info_net_off);
    set('iSize', $('frame').clientWidth + ' × ' + $('frame').clientHeight + ' px');
    set('iScreen', window.innerWidth + ' × ' + window.innerHeight + ' px');
    set('iDpr', (window.devicePixelRatio || 1).toFixed(2) + '×');
    set('iOrient', window.innerHeight >= window.innerWidth ? T.info_orient_portrait : T.info_orient_landscape);
  }

  // Xóa dữ liệu cần bấm hai lần trong 4 giây, tránh bấm nhầm
  async onResetClick() {
    const btn = $('resetData');
    if (!this.resetArmed) {
      btn.classList.add('armed');
      btn.textContent = T.info_reset_confirm;
      this.resetArmed = setTimeout(() => this.disarmReset(), 4000);
      return;
    }
    this.disarmReset();
    await this.store.reset();
    this.refreshCoins();
    this.refreshInfo();
    this.toast(T.data_reset);
  }

  disarmReset() {
    clearTimeout(this.resetArmed);
    this.resetArmed = 0;
    const btn = $('resetData');
    btn.classList.remove('armed');
    btn.textContent = T.info_reset;
  }
}
