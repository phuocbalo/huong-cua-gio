// F21 Cài đặt: âm lượng, xuất/nhập file lưu (N04), xem lại hướng dẫn, xóa dữ liệu, thống kê, chế độ kiểm thử.

import { APP_VERSION } from './config.js';
import { T, fmt } from './text.vi.js';
import { validateImport, exportText } from './save.js';
import { duration, hhmm } from './util.js';

const $ = id => document.getElementById(id);

export class SettingsUI {
  // h: { onMusic(v), onSfx(v), onReplayTutorial(), onReset(), onImported(), onTestMode(on), sound(name) }
  constructor(ui, store, h) { this.ui = ui; this.store = store; this.h = h; this.pending = null; this.resetArmed = 0; this.versionTaps = []; }

  get s() { return this.store.data; }

  init() {
    $('toolSettings').addEventListener('click', () => this.open());
    const bind = (id, out, key, fn) => {
      $(id).addEventListener('input', () => {
        const v = Number($(id).value) / 100;
        $(out).textContent = Math.round(v * 100) + '%';
        this.s.settings[key] = v;
        fn(v);
        this.store.markDirty();
      });
    };
    bind('musicVol', 'musicVal', 'music', v => this.h.onMusic(v));
    bind('sfxVol', 'sfxVal', 'sfx', v => { this.h.onSfx(v); this.h.sound('tap'); });
    $('exportSave').addEventListener('click', () => this.exportSave());
    $('importSave').addEventListener('click', () => { $('importFile').value = ''; $('importFile').click(); });
    $('importFile').addEventListener('change', () => this.readFile());
    $('importCancel').addEventListener('click', () => { this.pending = null; $('importConfirm').hidden = true; });
    $('importApply').addEventListener('click', () => this.applyImport());
    $('replayTut').addEventListener('click', () => { this.ui.closeWrap($('settingsWrap')); this.h.onReplayTutorial(); });
    $('resetData2').addEventListener('click', () => this.onReset());
    // Chạm 5 lần liền vào dòng phiên bản để bật/tắt chế độ kiểm thử
    $('versionLine').addEventListener('click', () => {
      const now = Date.now();
      this.versionTaps = this.versionTaps.filter(t => now - t < 4000).concat(now);
      if (this.versionTaps.length >= 5) {
        this.versionTaps = [];
        const on = !this.s.settings.testMode;
        this.s.settings.testMode = on;
        this.store.flush();
        this.h.onTestMode(on);
        this.ui.toast(on ? T.test_on : T.test_off);
      }
    });
  }

  open() {
    const st = this.s.settings, stats = this.s.stats || { days: [], sessions: 0, playMs: 0 };
    $('musicVol').value = Math.round(st.music * 100); $('musicVal').textContent = Math.round(st.music * 100) + '%';
    $('sfxVol').value = Math.round(st.sfx * 100); $('sfxVal').textContent = Math.round(st.sfx * 100) + '%';
    $('statsLine').textContent = fmt(T.settings_stats_line, { days: stats.days.length, sessions: stats.sessions, time: duration(stats.playMs) });
    $('versionLine').textContent = fmt(T.settings_version, { v: APP_VERSION });
    $('importConfirm').hidden = true;
    this.disarmReset();
    this.h.sound('open');
    this.ui.openWrap($('settingsWrap'));
  }

  // ----- Xuất file lưu -----
  async exportSave() {
    await this.store.flush();
    const d = new Date(), pad = n => String(n).padStart(2, '0');
    const name = `san-thuong-xanh-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
    const blob = new Blob([exportText(this.s)], { type: 'application/json' });
    // Trên điện thoại ưu tiên bảng chia sẻ (lưu vào Tệp, gửi qua Zalo…); máy tính thì tải về
    try {
      const file = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: name });
        this.ui.toast(T.exported);
        return;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    this.ui.toast(T.exported);
  }

  // ----- Nhập file lưu: đọc, kiểm tra, hỏi lại rồi mới thay -----
  readFile() {
    const f = $('importFile').files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const v = validateImport(String(r.result));
      if (!v.ok) { this.h.sound('deny'); this.ui.toast(T['import_' + v.reason]); return; }
      this.pending = v.data;
      const at = v.summary.savedAt ? new Date(v.summary.savedAt) : null;
      $('importInfo').textContent = fmt(T.import_info, { coins: v.summary.coins, boxes: v.summary.boxes, time: at ? at.toLocaleDateString('vi-VN') + ' ' + hhmm(at) : '–' });
      $('importConfirm').hidden = false;
      $('importApply').focus({ preventScroll: true });
    };
    r.onerror = () => this.ui.toast(T.import_not_json);
    r.readAsText(f);
  }

  async applyImport() {
    if (!this.pending) return;
    await this.store.replace(this.pending);
    this.pending = null;
    this.ui.toast(T.imported);
    this.h.onImported();
  }

  // ----- Xóa dữ liệu: bấm hai lần trong 4 giây -----
  onReset() {
    const b = $('resetData2');
    if (!this.resetArmed) {
      b.classList.add('armed'); b.textContent = T.settings_reset_confirm;
      this.resetArmed = setTimeout(() => this.disarmReset(), 4000);
      return;
    }
    this.disarmReset();
    this.h.onReset();
  }

  disarmReset() {
    clearTimeout(this.resetArmed); this.resetArmed = 0;
    const b = $('resetData2'); b.classList.remove('armed'); b.textContent = T.settings_reset;
  }
}
