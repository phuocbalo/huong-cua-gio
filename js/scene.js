// Cảnh sân thượng vẽ bằng Phaser. Toàn bộ hình ở đây là hình tạm, mang đúng phong cách của game.
import { W, H, ZOOM, INK, PERIODS } from './config.js';
import { rng, reduceMotion } from './util.js';

let hooks = { onReady() {}, onTapBox() {}, onTapCoop() {} };

class Rooftop extends Phaser.Scene {
  constructor() { super('rooftop'); }

  create() {
    this.cameras.main.setZoom(ZOOM).centerOn(W / 2, H / 2);

    this.sky = this.add.graphics();
    this.clouds = this.makeClouds();
    this.cityFar = this.add.graphics();
    this.cityMid = this.add.graphics();
    this.cityNear = this.add.graphics();
    this.windows = this.add.graphics();
    this.buildCity();

    this.drawRooftop();
    this.drawTank(62, 318);
    this.drawCoop(318, 330);
    this.drawClothesline();
    this.boxes = [
      this.makeBox(138, 452, 1.0), this.makeBox(252, 452, 1.0),
      this.makeBox(128, 568, 1.08), this.makeBox(262, 568, 1.08)
    ];
    this.drawFrontWall();

    this.shade = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.glow = this.add.graphics(); // đèn dây sáng ban đêm, vẽ sau lớp tối
    this.drawLights();

    hooks.onReady(this);
  }

  // Phaser nghe cả lần nhả chuột trên nút HTML nằm đè lên cảnh (ví dụ nút "Gieo").
  // Chỉ nhận lần chạm thật sự bắt đầu và kết thúc trên khung cảnh.
  isCanvasTap(pointer) {
    const ev = pointer && pointer.event;
    if (ev && ev.target !== this.game.canvas) return false;
    if (document.querySelector('.wrap:not([hidden]), #sheetWrap:not([hidden])')) return false;
    return true;
  }

  // ----- Bầu trời -----
  paintSky(p) {
    const g = this.sky; g.clear();
    g.fillGradientStyle(p.skyTop, p.skyTop, p.skyBot, p.skyBot, 1);
    g.fillRect(0, 0, W, 340);
    if (p === PERIODS.night) {
      const r = rng(7); g.fillStyle(0xfff3c4, 1);
      for (let i = 0; i < 40; i++) g.fillCircle(r() * W, r() * 200, r() < 0.15 ? 1.4 : 0.8);
      g.fillStyle(0xffe9a8, 1); g.fillCircle(318, 70, 16);
      g.fillStyle(p.skyTop, 1); g.fillCircle(326, 64, 14);
    } else if (p === PERIODS.morning || p === PERIODS.afternoon) {
      const sy = p === PERIODS.morning ? 96 : 62;
      g.fillStyle(0xfff4c9, 0.55); g.fillCircle(84, sy, 30);
      g.fillStyle(0xffe08a, 1); g.fillCircle(84, sy, 19);
    } else {
      g.fillStyle(0xffc18a, 0.6); g.fillCircle(120, 300, 46);
      g.fillStyle(0xffa36b, 1); g.fillCircle(120, 300, 28);
    }
  }

  makeClouds() {
    const list = [];
    const shapes = [[40, 70, 1], [230, 120, 0.8], [340, 46, 0.65]];
    shapes.forEach(([x, y, s]) => {
      const g = this.add.graphics({ x, y });
      g.fillStyle(0xffffff, 1);
      g.fillEllipse(0, 0, 70 * s, 22 * s);
      g.fillEllipse(-14 * s, -9 * s, 34 * s, 26 * s);
      g.fillEllipse(12 * s, -12 * s, 40 * s, 30 * s);
      list.push(g);
      if (!reduceMotion) {
        this.tweens.add({ targets: g, x: x + 26, duration: 14000 + s * 9000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    });
    return list;
  }

  // ----- Thành phố 3 lớp tĩnh -----
  buildCity() {
    this.layers = { far: [], mid: [], near: [] };
    const make = (key, seed, base, minH, maxH, minW, maxW) => {
      const r = rng(seed); let x = -10;
      while (x < W + 10) {
        const w = minW + r() * (maxW - minW), h = minH + r() * (maxH - minH);
        this.layers[key].push({ x, w, top: base - h, base, cap: r() < 0.3, ant: r() < 0.2, r: r() });
        x += w + (key === 'near' ? 4 + r() * 8 : 1 + r() * 3);
      }
    };
    make('far', 11, 300, 60, 150, 26, 46);
    make('mid', 23, 312, 50, 120, 32, 56);
    make('near', 37, 328, 30, 90, 40, 70);
  }

  paintCity(p) {
    const draw = (g, key, color) => {
      g.clear(); g.fillStyle(color, 1);
      this.layers[key].forEach(b => {
        g.fillRoundedRect(b.x, b.top, b.w, b.base - b.top + 40, { tl: 3, tr: 3, bl: 0, br: 0 });
        if (b.cap) g.fillRect(b.x + b.w * 0.25, b.top - 8, b.w * 0.5, 9);
        if (b.ant) g.fillRect(b.x + b.w * 0.6, b.top - 20, 2, 20);
      });
    };
    draw(this.cityFar, 'far', p.far);
    draw(this.cityMid, 'mid', p.mid);
    draw(this.cityNear, 'near', p.near);

    // Cửa sổ: ban ngày là ô hơi tối, ban đêm một phần sáng vàng
    const g = this.windows; g.clear();
    const r = rng(91);
    ['mid', 'near'].forEach(key => {
      this.layers[key].forEach(b => {
        const cols = Math.max(2, Math.floor(b.w / 13));
        const cw = 5, ch = 6, gx = (b.w - cols * cw) / (cols + 1);
        for (let y = b.top + 10; y < b.base - 6; y += 13) {
          for (let c = 0; c < cols; c++) {
            const on = r() < p.lit;
            g.fillStyle(on ? 0xffd98a : 0x000000, on ? 0.95 : 0.12);
            g.fillRect(b.x + gx + c * (cw + gx), y, cw, ch);
          }
        }
      });
    });
    this.clouds.forEach(c => c.setAlpha(p.cloud));
  }

  // ----- Sân thượng, nhìn nghiêng nhẹ từ trên xuống -----
  drawRooftop() {
    const g = this.add.graphics();
    // Tường lan can phía sau
    g.fillStyle(0xd9cdb8, 1); g.fillRect(0, 318, W, 26);
    g.fillStyle(0xc4b59c, 1); g.fillRect(0, 338, W, 6);
    g.lineStyle(3, INK, 1); g.lineBetween(0, 318, W, 318);
    // Sàn gạch đỏ (gạch tàu)
    g.fillStyle(0xd88a63, 1);
    g.fillPoints([{ x: 0, y: 344 }, { x: W, y: 344 }, { x: W, y: H }, { x: 0, y: H }], true);
    g.lineStyle(1.5, 0xb96f4c, 0.7);
    for (let y = 344, step = 22; y < H; y += step, step *= 1.06) g.lineBetween(0, y, W, y);
    for (let i = -8; i <= 16; i++) {
      const xt = W / 2 + (i - 4) * 34, xb = W / 2 + (i - 4) * 52;
      g.lineBetween(xt, 344, xb, H);
    }
    // Rêu và vết loang nhẹ cho đỡ phẳng
    g.fillStyle(0x9a6a4a, 0.18);
    g.fillEllipse(70, 660, 90, 26); g.fillEllipse(330, 420, 70, 18);
    g.lineStyle(3, INK, 1); g.lineBetween(0, 344, W, 344);
  }

  drawTank(x, y) {
    // Bồn nước inox đứng trên chân sắt
    const g = this.add.graphics({ x, y });
    g.fillStyle(0x000000, 0.18); g.fillEllipse(0, 44, 70, 14);
    g.lineStyle(3, INK, 1);
    g.fillStyle(0x6b5a52, 1);
    [[-24, 10], [20, 10]].forEach(([lx]) => { g.fillRect(lx, 10, 5, 34); g.strokeRect(lx, 10, 5, 34); });
    g.fillStyle(0xdfe5ea, 1);
    g.fillRoundedRect(-30, -64, 60, 78, 12); g.strokeRoundedRect(-30, -64, 60, 78, 12);
    g.fillStyle(0xffffff, 0.75); g.fillRoundedRect(-20, -56, 7, 60, 3);
    g.lineStyle(2, 0xa9b4bd, 1); g.lineBetween(-29, -36, 29, -36); g.lineBetween(-29, -8, 29, -8);
    g.lineStyle(3, INK, 1);
    g.fillStyle(0xc9d1d8, 1); g.fillEllipse(0, -66, 30, 9); g.strokeEllipse(0, -66, 30, 9);
  }

  drawCoop(x, y) {
    // Chuồng gà chưa mở: vẽ mờ, chạm vào có thông báo
    const c = this.add.container(x, y).setAlpha(0.55);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.2); g.fillEllipse(0, 40, 86, 14);
    g.lineStyle(3, INK, 1);
    g.fillStyle(0xc89a6a, 1); g.fillRect(-36, -14, 72, 52); g.strokeRect(-36, -14, 72, 52);
    g.fillStyle(0x9c6b45, 1); g.fillTriangle(-44, -12, 44, -12, 0, -46); g.strokeTriangle(-44, -12, 44, -12, 0, -46);
    g.fillStyle(0x5a4034, 1); g.fillRoundedRect(-12, 8, 24, 30, { tl: 12, tr: 12, bl: 0, br: 0 });
    g.lineStyle(2, 0x8a5f3e, 1); g.lineBetween(-36, 4, -16, 4); g.lineBetween(16, 4, 36, 4);
    c.add(g);
    c.setSize(90, 90).setInteractive({ useHandCursor: true });
    c.on('pointerup', pointer => { if (!this.isCanvasTap(pointer)) return; this.bounce(c); hooks.onTapCoop(); });
  }

  drawClothesline() {
    // Dây phơi đồ giữa bồn nước và chuồng gà
    const g = this.add.graphics();
    g.lineStyle(3, INK, 1);
    g.lineBetween(118, 268, 118, 352); g.lineBetween(262, 268, 262, 352);
    g.lineStyle(1.5, INK, 0.9);
    const pts = []; for (let t = 0; t <= 1.0001; t += 0.1) pts.push(new Phaser.Math.Vector2(118 + 144 * t, 272 + Math.sin(Math.PI * t) * 10));
    g.strokePoints(pts);
    const cloth = (cx, w, h, col) => {
      const yy = 272 + Math.sin(Math.PI * (cx - 118) / 144) * 10;
      g.fillStyle(col, 1); g.lineStyle(2, INK, 1);
      g.fillRect(cx - w / 2, yy, w, h); g.strokeRect(cx - w / 2, yy, w, h);
    };
    cloth(150, 22, 30, 0x8fc0d9); cloth(186, 18, 24, 0xf2b544); cloth(226, 26, 34, 0xe57d5a);
  }

  makeBox(x, y, s) {
    // Thùng xốp trồng rau: mặt trước trắng, mặt trên là đất
    const c = this.add.container(x, y).setScale(s);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.2); g.fillEllipse(0, 34, 104, 18);
    g.lineStyle(3, INK, 1);
    g.fillStyle(0xf6f3ec, 1); g.fillRoundedRect(-46, -6, 92, 40, 6); g.strokeRoundedRect(-46, -6, 92, 40, 6);
    g.fillStyle(0xe7e1d4, 1); g.fillRect(-43, 22, 86, 9);
    g.fillStyle(0xfbfaf6, 1); g.fillRoundedRect(-50, -26, 100, 26, 8); g.strokeRoundedRect(-50, -26, 100, 26, 8);
    c.add(g);

    // Đất: vẽ riêng để đổi màu khô / ướt
    c.soil = this.add.graphics();
    c.soilSeed = x * 7 + y;
    c.add(c.soil);
    this.paintSoil(c, false);

    // Cây: gốc đặt ở mặt đất để cây đung đưa quanh gốc
    c.plant = this.add.graphics({ x: 0, y: -14 });
    c.add(c.plant);

    // Bong bóng giọt nước nhắc tưới, và ánh lấp lánh khi cây chín
    c.bubble = this.makeBubble();
    c.bubble.setPosition(42, -46).setVisible(false);
    c.add(c.bubble);
    c.sparkle = this.makeSparkle();
    c.sparkle.setPosition(-40, -50).setVisible(false);
    c.add(c.sparkle);

    c.viewKey = '';

    // Vùng chạm phủ cả thùng và cây
    const zone = this.add.zone(x, y - 30 * s, 112 * s, 140 * s).setInteractive({ useHandCursor: true });
    zone.on('pointerup', pointer => { if (!this.isCanvasTap(pointer)) return; this.bounce(c); hooks.onTapBox(this.boxes.indexOf(c)); });
    return c;
  }

  paintSoil(c, wet) {
    const g = c.soil; g.clear();
    g.fillStyle(wet ? 0x5a3721 : 0x9b6f4c, 1); g.fillRoundedRect(-42, -21, 84, 16, 6);
    const r = rng(c.soilSeed);
    g.fillStyle(wet ? 0x3f2616 : 0x7a5236, 1);
    for (let i = 0; i < 14; i++) g.fillCircle(-38 + r() * 76, -18 + r() * 10, 1 + r() * 1.2);
    if (wet) { g.fillStyle(0xffffff, 0.18); g.fillEllipse(-14, -16, 18, 4); g.fillEllipse(18, -12, 12, 3); }
  }

  makeBubble() {
    const b = this.add.container(0, 0);
    const g = this.add.graphics();
    g.fillStyle(0xfff8ec, 1); g.lineStyle(2.5, INK, 1);
    g.fillCircle(0, 0, 12); g.strokeCircle(0, 0, 12);
    g.fillTriangle(-4, 9, 2, 10, -8, 18); g.lineBetween(-4, 10, -8, 18); g.lineBetween(2, 10, -8, 18);
    g.fillStyle(0x6fb4e0, 1); g.lineStyle(2, INK, 1);
    const drop = [{ x: 0, y: -7 }, { x: 5, y: 1 }, { x: 4, y: 5 }, { x: 0, y: 7 }, { x: -4, y: 5 }, { x: -5, y: 1 }];
    g.fillPoints(drop, true); g.strokePoints(drop, true);
    b.add(g);
    if (!reduceMotion) this.tweens.add({ targets: g, y: -4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return b;
  }

  makeSparkle() {
    const g = this.add.graphics();
    const star = (cx, cy, r) => {
      const pts = [];
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = k % 2 ? r * 0.32 : r; pts.push({ x: cx + Math.sin(a) * rr, y: cy - Math.cos(a) * rr }); }
      g.fillPoints(pts, true);
    };
    g.fillStyle(0xffe08a, 1); star(0, 0, 9);
    g.fillStyle(0xfff4c9, 1); star(12, 10, 5);
    if (!reduceMotion) this.tweens.add({ targets: g, alpha: 0.35, scale: 0.85, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return g;
  }

  // ----- Cây trong thùng -----
  // Lá: hình thoi cong theo trục, góc 0 = thẳng đứng, dương = nghiêng phải
  leaf(g, x, y, len, wid, ang, color, outline = true) {
    const dx = Math.sin(ang), dy = -Math.cos(ang), nx = -dy, ny = dx;
    const L = [], R = [];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8, w = Math.sin(Math.PI * Math.pow(t, 0.8)) * wid / 2;
      const px = x + dx * len * t, py = y + dy * len * t;
      L.push({ x: px + nx * w, y: py + ny * w }); R.unshift({ x: px - nx * w, y: py - ny * w });
    }
    const pts = L.concat(R);
    g.fillStyle(color, 1); g.fillPoints(pts, true);
    if (outline) { g.lineStyle(2, INK, 1); g.strokePoints(pts, true); }
  }

  stake(g, h) {
    g.lineStyle(2.5, INK, 1); g.fillStyle(0xc89a5a, 1);
    g.fillRect(-2.5, -h, 5, h); g.strokeRect(-2.5, -h, 5, h);
  }

  drawPlant(c, crop, stage) {
    const g = c.plant; g.clear();
    this.tweens.killTweensOf(g); g.setAngle(0);
    if (!crop) return;
    const D = deg => deg * Math.PI / 180;

    if (stage === 'seed') {
      g.fillStyle(0x4a2e1c, 1); g.fillEllipse(0, 0, 30, 8);
      g.fillStyle(0xf3e2c3, 1); g.lineStyle(1.5, INK, 1);
      [[-6, -1], [2, -2], [8, 0]].forEach(([sx, sy]) => { g.fillEllipse(sx, sy, 5, 3.5); g.strokeEllipse(sx, sy, 5, 3.5); });
      return;
    }
    if (stage === 'sprout') {
      g.lineStyle(3, INK, 1); g.lineBetween(0, 0, 0, -14);
      g.lineStyle(1.5, 0x6fae55, 1); g.lineBetween(0, 0, 0, -14);
      this.leaf(g, 0, -12, 12, 7, D(-60), 0x7cc062);
      this.leaf(g, 0, -12, 12, 7, D(60), 0x7cc062);
      return;
    }

    const ripe = stage === 'ripe';
    const k = ripe ? 1 : 0.82;
    switch (crop) {
      case 'rau_muong': {
        [-55, -35, -15, 0, 15, 35, 55].forEach((a, i) => this.leaf(g, (i - 3) * 3, 0, (36 + (i % 2) * 8) * k, 7, D(a), i % 2 ? 0x6bb252 : 0x5fa548));
        break;
      }
      case 'cai': {
        [-50, 50, -25, 25].forEach(a => this.leaf(g, 0, 0, 32 * k, 20 * k, D(a), 0x8cc46a));
        this.leaf(g, 0, 0, 34 * k, 18 * k, 0, 0xa9d68a);
        g.lineStyle(1.5, 0xe9f4d9, 1); g.lineBetween(0, -2, 0, -28 * k);
        break;
      }
      case 'hung_que': {
        g.lineStyle(2.5, INK, 1);
        [[-14, -26], [0, -34], [14, -26]].forEach(([sx, sy]) => g.lineBetween(0, 0, sx * k, sy * k));
        [[-14, -26], [0, -34], [14, -26], [-8, -14], [8, -14]].forEach(([sx, sy], i) => {
          this.leaf(g, sx * k, sy * k, 13, 9, D(-70), i % 2 ? 0x4c9a55 : 0x3f8a4a);
          this.leaf(g, sx * k, sy * k, 13, 9, D(70), i % 2 ? 0x3f8a4a : 0x4c9a55);
        });
        if (ripe) {
          g.fillStyle(0xa98ad8, 1); g.lineStyle(1.5, INK, 1);
          [[-14, -32], [0, -42], [14, -32]].forEach(([sx, sy]) => { for (let j = 0; j < 3; j++) { g.fillCircle(sx, sy - j * 4, 2.6); g.strokeCircle(sx, sy - j * 4, 2.6); } });
        }
        break;
      }
      case 'dua_leo':
      case 'ca_chua': {
        const h = (crop === 'dua_leo' ? 70 : 64) * k;
        this.stake(g, h);
        const leafCol = crop === 'dua_leo' ? 0x4f9a3a : 0x5c9e44;
        [[-1, -12, -60], [1, -24, 60], [-1, -36, -55], [1, -48, 55], [-1, -58, -40]].forEach(([side, ly, a]) => {
          if (-ly < h) this.leaf(g, 0, ly, crop === 'dua_leo' ? 20 : 17, crop === 'dua_leo' ? 15 : 10, D(a), leafCol);
        });
        if (crop === 'dua_leo') {
          const n = ripe ? 3 : 1, col = ripe ? 0x3f7f2e : 0x8cc46a, sz = ripe ? 1 : 0.55;
          [[10, -20], [-11, -34], [9, -46]].slice(0, n).forEach(([fx, fy]) => {
            g.fillStyle(col, 1); g.lineStyle(2, INK, 1);
            g.fillRoundedRect(fx - 4 * sz, fy, 8 * sz, 22 * sz, 4 * sz); g.strokeRoundedRect(fx - 4 * sz, fy, 8 * sz, 22 * sz, 4 * sz);
          });
        } else {
          const col = ripe ? 0xe5533c : 0x9acb6b, r = ripe ? 6.5 : 4;
          [[10, -18], [-11, -28], [10, -40], [-9, -50]].slice(0, ripe ? 4 : 3).forEach(([fx, fy]) => {
            g.fillStyle(col, 1); g.lineStyle(2, INK, 1); g.fillCircle(fx, fy, r); g.strokeCircle(fx, fy, r);
            g.fillStyle(0x4f9a3a, 1); g.fillTriangle(fx - 3, fy - r + 1, fx + 3, fy - r + 1, fx, fy - r - 3);
          });
        }
        break;
      }
      case 'ot': {
        g.lineStyle(2.5, INK, 1); g.lineBetween(0, 0, 0, -30 * k);
        [[-50, -8], [50, -10], [-40, -20], [40, -22], [-25, -30], [25, -31], [0, -32]].forEach(([a, ly], i) =>
          this.leaf(g, 0, ly * k, 17 * k, 9, D(a), i % 2 ? 0x5c9e44 : 0x4f9a3a));
        const col = ripe ? 0xe0452f : 0x8cc46a;
        [[-16, -16], [14, -18], [-9, -30], [10, -32], [0, -22]].slice(0, ripe ? 5 : 3).forEach(([fx, fy]) => {
          const p = [{ x: fx - 2.5, y: fy }, { x: fx + 2.5, y: fy }, { x: fx + 1.5, y: fy + 10 }, { x: fx - 1, y: fy + 13 }];
          g.fillStyle(col, 1); g.lineStyle(1.8, INK, 1); g.fillPoints(p, true); g.strokePoints(p, true);
        });
        break;
      }
    }
    if (!reduceMotion) this.tweens.add({ targets: g, angle: { from: -1.5, to: 1.5 }, duration: 2200 + c.soilSeed % 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // Vẽ lại một thùng theo trạng thái: { crop, stage, dry, ripe }. Chỉ vẽ khi có thay đổi.
  setBox(i, v) {
    const c = this.boxes[i];
    if (!c) return;
    const key = [v.crop, v.stage, v.dry, v.ripe].join('|');
    if (key === c.viewKey) return;
    const prev = c.viewKey.split('|');
    c.viewKey = key;
    this.paintSoil(c, !!v.crop && !v.dry);
    if (prev[0] !== String(v.crop) || prev[1] !== String(v.stage)) this.drawPlant(c, v.crop, v.stage);
    c.bubble.setVisible(!!v.crop && v.dry && !v.ripe);
    c.sparkle.setVisible(!!v.ripe);
  }

  // ----- Hiệu ứng -----
  boxWorld(i) { const c = this.boxes[i]; return { x: c.x, y: c.y - 14 * c.scaleY, s: c.scaleX }; }

  plantFx(i) {
    if (reduceMotion) return;
    const p = this.boxWorld(i);
    for (let k = 0; k < 6; k++) {
      const d = this.add.circle(p.x, p.y - 4, 2.4, 0x7a5236);
      this.tweens.add({ targets: d, x: p.x + (k - 2.5) * 7, y: p.y - 14 - (k % 2) * 6, alpha: 0, duration: 420, ease: 'Quad.easeOut', onComplete: () => d.destroy() });
    }
  }

  waterFx(i) {
    if (reduceMotion) return;
    const p = this.boxWorld(i);
    for (let k = 0; k < 8; k++) {
      const d = this.add.ellipse(p.x - 28 + k * 8, p.y - 70 - (k % 3) * 8, 4, 7, 0x6fb4e0).setStrokeStyle(1.2, INK);
      this.tweens.add({ targets: d, y: p.y - 6, alpha: 0.2, delay: k * 40, duration: 380, ease: 'Quad.easeIn', onComplete: () => d.destroy() });
    }
  }

  // Nông sản bay về nút túi đồ (tx, ty là toạ độ trong cảnh)
  harvestFx(i, color, qty, tx, ty) {
    const p = this.boxWorld(i);
    const col = Phaser.Display.Color.HexStringToColor(color).color;
    const label = this.add.text(p.x, p.y - 50, '+' + qty, { fontFamily: '"Baloo 2", system-ui, sans-serif', fontSize: '22px', fontStyle: '700', color: '#fff8ec', stroke: '#3b2f2a', strokeThickness: 5 }).setOrigin(0.5);
    this.tweens.add({ targets: label, y: p.y - 84, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => label.destroy() });
    if (reduceMotion) return;
    for (let k = 0; k < qty; k++) {
      const d = this.add.circle(p.x + (k - (qty - 1) / 2) * 12, p.y - 30, 6, col).setStrokeStyle(2, INK);
      this.tweens.add({
        targets: d, x: tx, y: ty, scale: 0.5, delay: 120 + k * 90, duration: 600, ease: 'Cubic.easeIn',
        onComplete: () => d.destroy()
      });
    }
  }

  drawFrontWall() {
    // Lan can phía trước, thấp và gần mắt người chơi
    const g = this.add.graphics();
    g.fillStyle(0xe3d7c2, 1); g.fillRect(0, 690, W, 70);
    g.fillStyle(0xcfc0a5, 1); g.fillRect(0, 690, W, 10);
    g.lineStyle(3, INK, 1); g.lineBetween(0, 690, W, 690);
    g.lineStyle(1.5, 0xbfae90, 1);
    for (let x = 30; x < W; x += 60) g.lineBetween(x, 702, x, 760);
    // Chậu cây nhỏ trên lan can cho có sức sống
    const pot = (px) => {
      g.fillStyle(0x5f9a4c, 1); g.lineStyle(2.5, INK, 1);
      g.fillEllipse(px - 7, 672, 14, 20); g.strokeEllipse(px - 7, 672, 14, 20);
      g.fillEllipse(px + 7, 670, 14, 22); g.strokeEllipse(px + 7, 670, 14, 22);
      g.fillStyle(0xc9734e, 1); g.lineStyle(3, INK, 1);
      g.fillPoints([{ x: px - 14, y: 676 }, { x: px + 14, y: 676 }, { x: px + 10, y: 694 }, { x: px - 10, y: 694 }], true);
      g.strokePoints([{ x: px - 14, y: 676 }, { x: px + 14, y: 676 }, { x: px + 10, y: 694 }, { x: px - 10, y: 694 }], true);
    };
    pot(36); pot(354);
  }

  drawLights() {
    // Bóng đèn dây giăng phía trên sân; ban đêm phát sáng
    const g = this.glow;
    this.bulbs = [];
    for (let i = 0; i < 9; i++) {
      const t = i / 8, bx = 20 + t * 350, by = 360 + Math.sin(Math.PI * t) * 14;
      this.bulbs.push({ x: bx, y: by });
    }
    this.wire = this.add.graphics();
    this.wire.setDepth(this.glow.depth - 1);
    const pts = this.bulbs.map(b => new Phaser.Math.Vector2(b.x, b.y - 4));
    this.wire.lineStyle(1.5, INK, 0.85); this.wire.strokePoints(pts);
    this.children.bringToTop(this.wire); this.children.bringToTop(this.glow);
  }

  paintLights(p) {
    const g = this.glow; g.clear();
    const on = p === PERIODS.night || p === PERIODS.evening;
    this.bulbs.forEach(b => {
      if (on) { g.fillStyle(0xffd98a, 0.28); g.fillCircle(b.x, b.y + 2, 9); }
      g.fillStyle(on ? 0xffe6a6 : 0xf3ead7, 1); g.lineStyle(1.5, INK, 1);
      g.fillCircle(b.x, b.y + 2, 3.6); g.strokeCircle(b.x, b.y + 2, 3.6);
    });
  }

  bounce(target) {
    if (reduceMotion) return;
    const sx = target.scaleX, sy = target.scaleY;
    this.tweens.killTweensOf(target);
    target.setScale(sx, sy);
    this.tweens.add({ targets: target, scaleX: sx * 1.06, scaleY: sy * 0.94, duration: 90, yoyo: true, ease: 'Quad.easeOut', onComplete: () => target.setScale(sx, sy) });
  }

  applyPeriod(key) {
    const p = PERIODS[key];
    this.paintSky(p);
    this.paintCity(p);
    // Lớp phủ nhân màu: trắng = giữ nguyên, càng gần màu bóng thì cảnh càng tối/ấm
    const t = Math.min(1, p.shade[1] * 2);
    const mix = (a, b) => Math.round(a + (b - a) * t);
    const sc = p.shade[0];
    const col = (mix(255, (sc >> 16) & 255) << 16) | (mix(255, (sc >> 8) & 255) << 8) | mix(255, sc & 255);
    this.shade.setFillStyle(col, 1).setAlpha(t > 0 ? 1 : 0);
    this.paintLights(p);
  }
}

// Tạo game Phaser trong phần tử #game. `h` gồm các hàm gọi lại khi cảnh sẵn sàng và khi chạm vào đồ vật.
export function createGame(h) {
  hooks = { ...hooks, ...h };
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W * ZOOM,
    height: H * ZOOM,
    backgroundColor: '#9fd3f0',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, roundPixels: false },
    banner: false,
    scene: Rooftop
  });
}
