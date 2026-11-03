// Âm thanh của game, tạo hoàn toàn bằng Web Audio (không cần file nhạc), nên game vẫn nhẹ và chạy offline.
//
// - Nhạc nền lo-fi: bản ngày (sáng hơn, có trống nhẹ) và bản đêm (chậm, không trống). Đổi bản thì chuyển dần.
// - Âm thanh phố: chim hót buổi sáng, xe máy xa xa ban ngày, dế kêu ban đêm, tiếng đĩa than lạo xạo.
// - Hiệu ứng ngắn, êm cho gieo, tưới, thu hoạch, bán, cho gà ăn, nhặt trứng, quét bụi, mua.
// Theo PRD: âm lượng vừa phải, không có tiếng to hay giật mình (có bộ nén âm ở cuối để chặn đỉnh).
//
// Trình duyệt chỉ cho phát tiếng sau khi người chơi chạm vào trang, nên âm thanh bật ở lần chạm đầu (unlock).
// Nhạc và tiếng phố đi theo thanh "Nhạc nền"; hiệu ứng đi theo thanh "Hiệu ứng".

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

// Hợp âm (số MIDI) cho từng nhịp 4 phách
const SONGS = {
  day:   { bpm: 78, swing: 0.12, drums: true,  chords: [[48, 55, 59, 64], [45, 52, 55, 60], [50, 57, 60, 65], [43, 50, 53, 59]],  // Cmaj7 Am7 Dm7 G7
           scale: [72, 74, 76, 79, 81, 84] },
  night: { bpm: 64, swing: 0.08, drums: false, chords: [[45, 52, 55, 59], [41, 48, 52, 57], [50, 57, 60, 64], [52, 59, 62, 67]],  // Am9 Fmaj7 Dm9 Em7
           scale: [69, 72, 74, 76, 79, 81] }
};

export class AudioEngine {
  constructor({ music = 0.6, sfx = 0.8 } = {}) {
    this.levels = { music, sfx };
    this.ctx = null;
    this.mode = 'day';
    this.hour = 12;
    this.timer = 0;
  }

  get ready() { return !!this.ctx; }

  // Gọi trong lần chạm đầu tiên của người chơi
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.build(this.ctx, this.ctx.destination);
    this.startLoops();
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      // Rời game thì tạm dừng để đỡ tốn pin; quay lại thì phát tiếp
      if (document.hidden) this.ctx.suspend(); else this.ctx.resume();
    });
  }

  // Dựng chuỗi âm thanh: các nhánh → bộ nén → loa. Tách riêng để kiểm thử được bằng OfflineAudioContext.
  build(ctx, out) {
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.005; comp.release.value = 0.25;
    this.master = ctx.createGain(); this.master.gain.value = 0.8;
    this.master.connect(comp); comp.connect(out);
    this.musicBus = ctx.createGain();
    this.ambBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    [this.musicBus, this.ambBus, this.sfxBus].forEach(b => b.connect(this.master));
    // Bản ngày và bản đêm có nhánh riêng để chuyển dần giữa hai bản
    this.dayGain = ctx.createGain(); this.nightGain = ctx.createGain();
    this.dayGain.connect(this.musicBus); this.nightGain.connect(this.musicBus);
    this.dayGain.gain.value = this.mode === 'day' ? 1 : 0;
    this.nightGain.gain.value = this.mode === 'night' ? 1 : 0;
    // Lọc ấm cho cả nhạc như phát qua đài cũ
    this.noise = this.makeNoise(ctx, 2);
    this.applyLevels();
  }

  makeNoise(ctx, seconds) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  applyLevels() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, m = this.levels.music, s = this.levels.sfx;
    this.musicBus.gain.setTargetAtTime(m * 0.55, t, 0.08);
    this.ambBus.gain.setTargetAtTime(m * 0.45, t, 0.08);
    this.sfxBus.gain.setTargetAtTime(s * 0.7, t, 0.05);
  }

  setMusic(v) { this.levels.music = v; this.applyLevels(); }
  setSfx(v) { this.levels.sfx = v; this.applyLevels(); }

  // Giờ trong ngày (giờ thập phân): chọn bản nhạc và tiếng phố hợp giờ
  setTime(hour) {
    this.hour = hour;
    const mode = (hour >= 18.5 || hour < 5) ? 'night' : 'day';
    if (mode === this.mode) return;
    this.mode = mode;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.dayGain.gain.setTargetAtTime(mode === 'day' ? 1 : 0, t, 2.5);
    this.nightGain.gain.setTargetAtTime(mode === 'night' ? 1 : 0, t, 2.5);
  }

  // ----- Vòng lặp nhạc và tiếng phố -----
  startLoops() {
    const ctx = this.ctx;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.1;
    this.nextBird = ctx.currentTime + 2;
    this.nextBike = ctx.currentTime + 12;
    this.crackle();
    this.cricketsLoop();
    // Lên lịch trước 0,3 giây, kiểm tra mỗi 60 ms
    this.timer = setInterval(() => this.schedule(), 60);
  }

  schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const ahead = ctx.currentTime + 0.3;
    while (this.nextTime < ahead) {
      this.playStep(this.step, this.nextTime);
      const song = SONGS.day, eighth = 30 / song.bpm;   // nhịp chung theo bản ngày; bản đêm chơi thưa hơn
      this.nextTime += eighth;
      this.step++;
    }
    // Chim hót buổi sáng (5–10 giờ), xe máy xa ban ngày
    if (ctx.currentTime > this.nextBird) {
      if (this.hour >= 5 && this.hour < 10.5) this.bird(ctx.currentTime + 0.05);
      this.nextBird = ctx.currentTime + 2.5 + Math.random() * 5;
    }
    if (ctx.currentTime > this.nextBike) {
      if (this.hour >= 6 && this.hour < 21) this.motorbike(ctx.currentTime + 0.05);
      this.nextBike = ctx.currentTime + 25 + Math.random() * 30;
    }
  }

  // Mỗi bước là một nốt móc đơn; 8 bước = một ô nhịp 4 phách; mỗi ô một hợp âm
  playStep(step, t) {
    const bar = Math.floor(step / 8), beat = step % 8;
    for (const name of ['day', 'night']) {
      const song = SONGS[name], bus = name === 'day' ? this.dayGain : this.nightGain;
      if (bus.gain.value < 0.01 && this.mode !== name) continue;
      const chord = song.chords[bar % song.chords.length];
      const swing = beat % 2 ? song.swing * (30 / SONGS.day.bpm) : 0;
      if (name === 'day') {
        if (beat === 0) chord.forEach((n, i) => this.keys(bus, mtof(n), t + i * 0.012, 3.2, 0.05));
        if (beat === 4) chord.slice(1).forEach((n, i) => this.keys(bus, mtof(n), t + swing + i * 0.012, 1.4, 0.03));
        if (beat === 0 || beat === 5) this.bass(bus, mtof(chord[0] - 12), t + (beat ? swing : 0), 0.9);
        if (song.drums) {
          if (beat === 0 || beat === 4) this.kick(bus, t);
          if (beat === 2 || beat === 6) this.snare(bus, t);
          this.hat(bus, t + swing, beat % 2 ? 0.012 : 0.02);
        }
        if (beat === 3 && Math.random() < 0.6) this.keys(bus, mtof(song.scale[Math.floor(Math.random() * song.scale.length)]), t + swing, 0.9, 0.035);
      } else {
        // Bản đêm: hợp âm ngân dài mỗi hai ô nhịp, vài nốt rải thưa
        const nbar = Math.floor(bar / 2);
        const nchord = song.chords[nbar % song.chords.length];
        if (beat === 0 && bar % 2 === 0) nchord.forEach((n, i) => this.keys(bus, mtof(n), t + i * 0.03, 6.5, 0.045));
        if (beat === 0 && bar % 2 === 0) this.bass(bus, mtof(nchord[0] - 12), t, 3);
        if ((beat === 3 || beat === 6) && Math.random() < 0.45) this.keys(bus, mtof(song.scale[Math.floor(Math.random() * song.scale.length)]), t + swing, 1.6, 0.03);
      }
    }
  }

  // Tiếng phím điện ấm (Rhodes nhẹ): sin + tam giác lệch nhẹ, qua lọc thấp, rung nhẹ
  keys(bus, f, t, dur, vol) {
    const ctx = this.ctx;
    const g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1700; lp.Q.value = 0.4;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(vol * 0.4, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(lp); lp.connect(bus);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = 'sine'; o1.frequency.value = f;
    o2.type = 'triangle'; o2.frequency.value = f * 1.003;
    const g2 = ctx.createGain(); g2.gain.value = 0.35;
    o1.connect(g); o2.connect(g2); g2.connect(g);
    [o1, o2].forEach(o => { o.start(t); o.stop(t + dur + 0.05); });
  }

  bass(bus, f, t, dur) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.11, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
  }

  kick(bus, t) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
    g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.3);
  }

  noiseHit(bus, t, { dur, vol, type = 'highpass', freq = 6000, q = 0.7 }) {
    const ctx = this.ctx, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.02);
    return { src, f, g };
  }

  snare(bus, t) { this.noiseHit(bus, t, { dur: 0.16, vol: 0.05, type: 'bandpass', freq: 1800, q: 0.8 }); }
  hat(bus, t, vol) { this.noiseHit(bus, t, { dur: 0.05, vol, type: 'highpass', freq: 7000 }); }

  // Tiếng đĩa than lạo xạo rất nhỏ, lặp mãi
  crackle() {
    const ctx = this.ctx, len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() < 0.0009 ? (Math.random() * 2 - 1) * 0.9 : 0) + (Math.random() * 2 - 1) * 0.012;
    const src = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf; src.loop = true; lp.type = 'lowpass'; lp.frequency.value = 3500; g.gain.value = 0.18;
    src.connect(lp); lp.connect(g); g.connect(this.musicBus); src.start();
  }

  // Chim sẻ: 2–4 tiếng huýt ngắn, cao, lướt lên xuống
  bird(t) {
    const ctx = this.ctx, n = 2 + Math.floor(Math.random() * 3), base = 2600 + Math.random() * 1400, pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const out = ctx.createGain(); out.gain.value = 0.5;
    if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; out.connect(pan); pan.connect(this.ambBus); } else out.connect(this.ambBus);
    for (let k = 0; k < n; k++) {
      const s = t + k * (0.11 + Math.random() * 0.06), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(base, s); o.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.3), s + 0.05); o.frequency.exponentialRampToValueAtTime(base * 0.9, s + 0.09);
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.06, s + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.1);
      o.connect(g); g.connect(out); o.start(s); o.stop(s + 0.12);
    }
  }

  // Xe máy chạy ngang dưới phố, rất xa: tiếng máy trầm qua lọc thấp, to dần rồi nhỏ dần
  motorbike(t) {
    const ctx = this.ctx, dur = 3.5 + Math.random() * 2;
    const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(95, t + dur * 0.5); o.frequency.linearRampToValueAtTime(80, t + dur);
    lp.type = 'lowpass'; lp.frequency.value = 380;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.035, t + dur * 0.45); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(lp); lp.connect(g);
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.setValueAtTime(-0.7, t); p.pan.linearRampToValueAtTime(0.7, t + dur); g.connect(p); p.connect(this.ambBus); }
    else g.connect(this.ambBus);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // Dế kêu ban đêm: tiếng rỉ rả theo cụm, chỉ nghe khi trời tối
  cricketsLoop() {
    const ctx = this.ctx;
    const tick = () => {
      if (!this.ctx) return;
      if (ctx.state === 'running' && this.mode === 'night') {
        const t = ctx.currentTime + 0.05, f = 4300 + Math.random() * 500;
        for (let k = 0; k < 3; k++) {
          const s = t + k * 0.07, o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = f;
          g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.018, s + 0.012); g.gain.linearRampToValueAtTime(0, s + 0.05);
          o.connect(g); g.connect(this.ambBus); o.start(s); o.stop(s + 0.06);
        }
      }
      this.cricketTimer = setTimeout(tick, 600 + Math.random() * 900);
    };
    tick();
  }

  // ----- Hiệu ứng -----
  play(name) {
    const ctx = this.ctx;
    // OfflineAudioContext chỉ dùng khi kiểm thử âm lượng
    const offline = typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext;
    if (!ctx || (ctx.state !== 'running' && !offline) || this.levels.sfx <= 0) return;
    const t = ctx.currentTime + 0.01, bus = this.sfxBus;
    const tone = (f, s, dur, vol, type = 'sine', f2) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, s); if (f2) o.frequency.exponentialRampToValueAtTime(f2, s + dur);
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(vol, s + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
      o.connect(g); g.connect(bus); o.start(s); o.stop(s + dur + 0.02);
    };
    switch (name) {
      case 'tap': tone(880, t, 0.06, 0.05); break;
      case 'plant':                       // đất lụp bụp
        tone(140, t, 0.16, 0.22, 'sine', 60);
        this.noiseHit(bus, t, { dur: 0.12, vol: 0.12, type: 'lowpass', freq: 900 }); break;
      case 'water': {                     // nước rót róc rách
        const h = this.noiseHit(bus, t, { dur: 0.55, vol: 0.12, type: 'bandpass', freq: 900, q: 1.2 });
        h.f.frequency.linearRampToValueAtTime(2200, t + 0.5);
        [0.08, 0.2, 0.33].forEach(d => tone(1400 + Math.random() * 600, t + d, 0.06, 0.05, 'sine', 2400)); break;
      }
      case 'harvest':                     // ba nốt gảy vui tai
        [72, 76, 79].forEach((m, i) => tone(mtof(m), t + i * 0.07, 0.35, 0.12, 'triangle')); break;
      case 'coin':                        // tiếng xu leng keng
        tone(1318, t, 0.25, 0.1); tone(1760, t + 0.07, 0.4, 0.1); break;
      case 'feed':                        // thóc rơi lách tách
        for (let k = 0; k < 6; k++) this.noiseHit(bus, t + k * 0.045 + Math.random() * 0.02, { dur: 0.03, vol: 0.08, type: 'highpass', freq: 4000 }); break;
      case 'egg': tone(600, t, 0.12, 0.14, 'sine', 950); tone(950, t + 0.09, 0.15, 0.08); break;
      case 'sweep':                       // chổi quét soạt soạt
        [0, 0.17].forEach(d => { const h = this.noiseHit(bus, t + d, { dur: 0.16, vol: 0.1, type: 'bandpass', freq: 2500, q: 0.6 }); h.f.frequency.linearRampToValueAtTime(1200, t + d + 0.15); }); break;
      case 'buy':                         // gõ gỗ rồi chuông nhỏ
        tone(220, t, 0.1, 0.16, 'triangle', 180); tone(mtof(84), t + 0.08, 0.5, 0.07); break;
      case 'chime':                       // hàng xóm mới, đơn giao xong
        [74, 79, 83].forEach((m, i) => tone(mtof(m), t + i * 0.1, 0.6, 0.08)); break;
      case 'deny': tone(330, t, 0.12, 0.07, 'triangle'); tone(262, t + 0.1, 0.16, 0.07, 'triangle'); break;
      case 'open': tone(660, t, 0.08, 0.05); tone(990, t + 0.05, 0.1, 0.04); break;
    }
  }
}
