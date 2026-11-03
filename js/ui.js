// Giao diện HTML phủ trên cảnh: khung dọc, thanh trên, thông báo, thanh công cụ, bảng thông tin bản thử.

import { W, H, APP_VERSION, periodOf } from './config.js';
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
  constructor({ store, clock, pwa, onFrameResize, onPeriodChange }) {
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

    document.querySelectorAll('.tool').forEach(b => b.addEventListener('click', () => this.toast(T[b.dataset.soon])));

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
