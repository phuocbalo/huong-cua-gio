// Cảnh sân thượng vẽ bằng Phaser. Toàn bộ hình ở đây là hình tạm, mang đúng phong cách của game.
import { W, H, ZOOM, INK } from './config.js';
import { skyAt, mixColor, withWeather } from './daylight.js';
import { rng, reduceMotion } from './util.js';

let hooks = { onReady() {}, onTapBox() {}, onTapCoop() {}, onTapTrough() {}, onTapDust() {}, onTapOrders() {}, onTapBuyBox() {} };

// Thùng xốp nhỏ để sân chứa được nhiều thùng. Lưới có chỗ cho tối đa 8 thùng (mua thêm ở F14):
// hàng 1 hai thùng bên trái (bên phải là sân gà), hàng 2 và 3 mỗi hàng ba thùng. 4 thùng đầu là khối 2×2 bên trái.
export const BOX_SLOTS = [[86, 456], [202, 456], [86, 550], [202, 550], [318, 550], [86, 640], [202, 640], [318, 640]];
const BOX_SCALE = 0.68;
// Chuồng gà vẽ to hơn 18%, phóng quanh góc trước bên phải của sân gà
const COOP_SCALE = 1.18;
const COOP_ANCHOR = { x: 386, y: 436 };
// Các chỗ trên sân có thể bám bụi (F23): khe giữa các thùng và mép sân, không nằm dưới thùng hay chuồng gà
export const DUST_POS = [[36, 398], [146, 402], [248, 410], [30, 508], [144, 506], [260, 506], [144, 598], [260, 598]];
// Cây vẽ to so với thùng (1,5 × 0,68 ≈ cỡ gốc) cho dễ nhìn trên điện thoại
const PLANT_SCALE = 1.5;

class Rooftop extends Phaser.Scene {
  constructor() { super('rooftop'); }

  create() {
    this.cameras.main.setZoom(ZOOM).centerOn(W / 2, H / 2);

    this.sky = this.add.graphics();
    this.clouds = this.makeClouds();
    this.darkClouds = this.makeDarkClouds();   // F09: mây xám khi trời âm u, mưa
    this.cityFar = this.add.graphics();
    this.cityMid = this.add.graphics();
    this.cityNear = this.add.graphics();
    this.windows = this.add.graphics();
    this.buildCity();

    this.drawRooftop();
    this.drawTank(62, 318);
    this.drawClothesline();
    this.drawCoop();
    const n = Math.min(BOX_SLOTS.length, hooks.boxCount ? hooks.boxCount() : 4);
    this.boxes = BOX_SLOTS.slice(0, n).map(([bx, by]) => this.makeBox(bx, by, BOX_SCALE));
    this.drawFrontWall();
    this.dustLayer = this.add.container(0, 0);
    this.dustSpots = DUST_POS.map(([dx, dy], i) => this.makeDust(dx, dy, i));
    this.broom = this.makeBroomBubble().setVisible(false);

    this.shade = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.glow = this.add.graphics(); // đèn dây sáng ban đêm, vẽ sau lớp tối
    this.drawLights();
    this.makeWeather();   // F09: mưa rơi và lá bay, nằm trên cùng

    // Chạm và rê chuột trên sân: thùng xốp (và sau này vệt bụi) được chọn bằng hàm boxAt/dustAt
    this.input.on('pointerup', pointer => {
      if (!this.isCanvasTap(pointer)) return;
      const d = this.dustAt ? this.dustAt(pointer.worldX, pointer.worldY) : -1;
      if (d >= 0) { hooks.onTapDust(d); return; }
      if (this.buySlotAt(pointer.worldX, pointer.worldY)) { hooks.onTapBuyBox(); return; }
      const i = this.boxAt(pointer.worldX, pointer.worldY);
      if (i >= 0) { this.bounce(this.boxes[i]); hooks.onTapBox(i); }
    });
    this.input.on('pointermove', pointer => {
      if (pointer.event && pointer.event.target !== this.game.canvas) return;
      const over = this.boxAt(pointer.worldX, pointer.worldY) >= 0 || this.buySlotAt(pointer.worldX, pointer.worldY) || (this.dustAt && this.dustAt(pointer.worldX, pointer.worldY) >= 0);
      if (over) this.game.canvas.style.cursor = 'pointer';
      else if (this.game.canvas.style.cursor === 'pointer' && !this.input.manager.isOver) this.game.canvas.style.cursor = '';
    });

    hooks.onReady(this);
  }

  // ----- F19 Chỉ chỗ cần chạm trong hướng dẫn -----
  // spot: { kind: 'box', index, arrow } | { kind: 'trough', arrow } | null để ẩn.
  // Không vẽ vòng quanh; thay vào đó làm sáng chính vật (lớp sáng cộng màu, nhấp nháy nhẹ) và
  // mũi tên vàng to, viền nâu, có quầng trắng, nhún lên xuống phía trên.
  setSpotlight(spot) {
    if (!this.spot) {
      this.spot = this.add.container(0, 0).setVisible(false);
      this.spotGlow = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
      this.spotArrow = this.add.container(0, 0);
      const halo = this.add.graphics();
      const shape = (k = 1) => [{ x: -8 * k, y: -44 * k }, { x: 8 * k, y: -44 * k }, { x: 8 * k, y: -22 * k }, { x: 19 * k, y: -22 * k }, { x: 0, y: 0 }, { x: -19 * k, y: -22 * k }, { x: -8 * k, y: -22 * k }];
      halo.fillStyle(0xfff6c9, 0.55); halo.fillPoints(shape(1.22).map(p => ({ x: p.x, y: p.y + 4 })), true);
      const ar = this.add.graphics();
      ar.fillStyle(0xffd84a, 1); ar.fillPoints(shape(), true);
      ar.lineStyle(3, INK, 1); ar.strokePoints(shape(), true);
      ar.lineStyle(2.4, 0xfff6c9, 1); ar.lineBetween(-3, -40, -3, -24);
      this.spotArrow.add([halo, ar]);
      this.spot.add([this.spotGlow, this.spotArrow]);
      if (!reduceMotion) {
        this.tweens.add({ targets: this.spotGlow, alpha: 0.35, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.spotBob = this.tweens.add({ targets: this.spotArrow, y: '-=9', duration: 480, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
    const g = this.spotGlow; g.clear();
    // Quầng vàng phía sau thùng: ban ngày thùng màu trắng, lớp sáng phía trên khó thấy nên cần thêm quầng
    if (!this.spotHalo) {
      this.spotHalo = this.add.graphics();
      if (!reduceMotion) this.tweens.add({ targets: this.spotHalo, alpha: 0.55, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    const hg = this.spotHalo; hg.clear(); hg.setVisible(false);
    let at = null;
    if (spot && spot.kind === 'box' && this.boxes[spot.index]) {
      const c = this.boxes[spot.index];
      // Làm sáng thân thùng và lớp đất (toạ độ theo hình thùng trong makeBox, đã thu nhỏ BOX_SCALE)
      const s = BOX_SCALE;
      [[18, 0.18], [12, 0.3], [7, 0.5], [3, 0.85]].forEach(([pad, a]) => {
        hg.fillStyle(0xffd23f, a); hg.fillRoundedRect(c.x - 50 * s - pad, c.y - 26 * s - pad, 100 * s + pad * 2, 60 * s + pad * 2, 8 + pad);
      });
      hg.setVisible(true);
      this.children.moveBelow(hg, c);
      g.fillStyle(0xfff0b8, 0.32); g.fillRoundedRect(c.x - 50 * s, c.y - 26 * s, 100 * s, 60 * s, 8);
      at = { x: c.x, y: c.y - 52 };
    } else if (spot && spot.kind === 'trough' && this.trough) {
      const p = this.coopPoint(this.trough.x, this.trough.y);
      g.fillStyle(0xffe08a, 0.32); g.fillRoundedRect(p.x - 40, p.y - 16, 80, 32, 10);
      g.fillStyle(0xfff0b8, 0.6); g.fillRoundedRect(p.x - 34, p.y - 11, 68, 20, 7);
      // tránh bong bóng "đói" phía trên máng
      at = { x: p.x, y: p.y - 64 };
    } else if (spot && spot.kind === 'notes') {
      // Giấy đặt hàng trên dây phơi (x 204–248, treo dưới dây)
      const y0 = this.lineY(226);
      g.fillStyle(0xffe08a, 0.32); g.fillRoundedRect(190, y0 - 2, 72, 34, 9);
      g.fillStyle(0xfff0b8, 0.55); g.fillRoundedRect(195, y0 + 1, 62, 27, 7);
      at = { x: 207, y: this.lineY(207) - 6 };
    }
    this.spot.setVisible(!!at);
    if (!at) return;
    this.spotArrow.setVisible(!!spot.arrow);
    if (this.spotBob) { this.spotBob.stop(); }
    this.spotArrow.setPosition(at.x, at.y);
    if (!reduceMotion) this.spotBob = this.tweens.add({ targets: this.spotArrow, y: at.y - 9, duration: 480, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.children.bringToTop(this.spot);
    // Thùng hàng dưới có thể nằm sau tường trước; mũi tên và lớp sáng luôn nằm trên cùng cho dễ thấy
  }

  // ----- F14 Ô trống mua thêm thùng -----
  // index: vị trí trong BOX_SLOTS (bằng số thùng đang có), -1 để ẩn; price: giá hiện trên ô
  setBuySlot(index, price) {
    if (!this.buyG) {
      this.buyG = this.add.graphics();
      this.buyText = this.add.text(0, 0, '', { fontFamily: '"Baloo 2", system-ui, sans-serif', fontSize: '13px', fontStyle: '700', color: '#fff8ec', stroke: '#3b2f2a', strokeThickness: 4 }).setOrigin(0.5);
      this.children.moveBelow(this.buyG, this.frontWall); this.children.moveBelow(this.buyText, this.frontWall);
    }
    const key = index + '|' + price;
    if (key === this.buyView) return;
    this.buyView = key;
    const g = this.buyG; g.clear();
    this.buySlot = index >= 0 && index < BOX_SLOTS.length ? index : -1;
    this.buyText.setVisible(this.buySlot >= 0);
    if (this.buySlot < 0) return;
    const [x, y] = BOX_SLOTS[this.buySlot], s = BOX_SCALE, w = 100 * s, h = 60 * s, top = y - 26 * s;
    g.fillStyle(0xfff8ec, 0.28); g.fillRoundedRect(x - w / 2, top, w, h, 8);
    // viền nét đứt
    g.lineStyle(2, 0xfff8ec, 0.9);
    const dash = (x0, y0, x1, y1) => { const len = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(len / 8); for (let k = 0; k < n; k += 2) { const a = k / n, b = Math.min(1, (k + 1) / n); g.lineBetween(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a, x0 + (x1 - x0) * b, y0 + (y1 - y0) * b); } };
    dash(x - w / 2, top, x + w / 2, top); dash(x + w / 2, top, x + w / 2, top + h); dash(x + w / 2, top + h, x - w / 2, top + h); dash(x - w / 2, top + h, x - w / 2, top);
    g.fillStyle(0x5f9a4c, 1); g.lineStyle(2.4, INK, 1); g.fillCircle(x, top + h / 2 - 6, 11); g.strokeCircle(x, top + h / 2 - 6, 11);
    g.lineStyle(3, 0xfff8ec, 1); g.lineBetween(x - 5, top + h / 2 - 6, x + 5, top + h / 2 - 6); g.lineBetween(x, top + h / 2 - 11, x, top + h / 2 - 1);
    this.buyText.setText(price + ' xu').setPosition(x, top + h / 2 + 12);
  }

  buySlotAt(x, y) {
    if (this.buySlot == null || this.buySlot < 0) return false;
    const [bx, by] = BOX_SLOTS[this.buySlot], s = BOX_SCALE;
    return Math.abs(x - bx) <= 52 * s && y >= by - 28 * s && y <= by + 36 * s;
  }

  // Thùng mới xuất hiện ở ô kế tiếp, nảy lên nhẹ
  addBox(index) {
    const [x, y] = BOX_SLOTS[index];
    const c = this.makeBox(x, y, BOX_SCALE);
    this.children.moveBelow(c, this.frontWall);
    this.boxes[index] = c;
    if (!reduceMotion) {
      c.setScale(BOX_SCALE * 0.4);
      this.tweens.add({ targets: c, scale: BOX_SCALE, duration: 420, ease: 'Back.easeOut' });
      this.plantFx(index);
    }
    return c;
  }

  // ----- F23 Bụi trên sân -----
  makeDust(x, y, i) {
    const g = this.add.graphics({ x, y }).setVisible(false);
    const r = rng(300 + i * 17);
    g.fillStyle(0x7d6e60, 0.42); g.fillEllipse(0, 0, 46, 17);
    g.fillStyle(0x6b5d50, 0.5); g.fillEllipse(-6 + r() * 4, -1, 26, 10); g.fillEllipse(9, 2, 18, 7);
    g.fillStyle(0x4f443a, 0.75);
    for (let k = 0; k < 9; k++) g.fillCircle(-16 + r() * 32, -5 + r() * 10, 0.8 + r() * 0.9);
    // một chiếc lá khô và mẩu giấy vụn cho có chuyện để quét
    g.fillStyle(0xc9963f, 1); g.lineStyle(1.2, INK, 0.8);
    const lx = -10 + r() * 20, ly = -2 + r() * 4;
    g.fillEllipse(lx, ly, 7, 3.5); g.strokeEllipse(lx, ly, 7, 3.5);
    g.fillStyle(0xf3ead7, 0.9); g.fillRect(6 + r() * 4, -4, 4, 3);
    this.dustLayer.add(g);
    return g;
  }

  // Bong bóng cái chổi đót nhắc người chơi quét bụi
  makeBroomBubble() {
    const b = this.add.container(0, 0);
    const g = this.add.graphics();
    g.fillStyle(0xfff8ec, 1); g.lineStyle(2.5, INK, 1);
    g.fillCircle(0, 0, 13); g.strokeCircle(0, 0, 13);
    g.fillTriangle(-4, 10, 2, 11, -2, 19); g.lineBetween(-4, 11, -2, 19); g.lineBetween(2, 11, -2, 19);
    this.broomIcon(g, 0, 0, 0.8);
    b.add(g);
    if (!reduceMotion) this.tweens.add({ targets: g, y: -4, angle: { from: -6, to: 6 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return b;
  }

  // Chổi đót: cán tre, bông chổi vàng buộc dây đỏ (vẽ quanh tâm (cx, cy), cỡ k)
  broomIcon(g, cx, cy, k) {
    const P = (x, y) => ({ x: cx + x * k, y: cy + y * k });
    g.lineStyle(2.4 * k, INK, 1); g.fillStyle(0xc89a5a, 1);
    const handle = [P(-1.5, -12), P(1.5, -12), P(1.5, 1), P(-1.5, 1)];
    g.fillPoints(handle, true); g.strokePoints(handle, true);
    const head = [P(-3, 0), P(3, 0), P(8, 11), P(-8, 11)];
    g.fillStyle(0xe2b65a, 1); g.fillPoints(head, true); g.strokePoints(head, true);
    g.lineStyle(1.1 * k, 0xa9813a, 1);
    [-4, 0, 4].forEach(x => g.lineBetween(cx + x * 0.4 * k, cy + 2 * k, cx + x * k, cy + 10 * k));
    g.lineStyle(2 * k, 0xd8352a, 1); g.lineBetween(cx - 3.4 * k, cy + 2 * k, cx + 3.4 * k, cy + 2 * k);
  }

  // Hiện các vệt bụi đang có; bong bóng chổi nằm trên vệt đầu tiên
  setDust(spots) {
    const key = spots.join(',');
    if (key === this.dustView) return;
    this.dustView = key;
    this.dustSpots.forEach((g, i) => { if (!g.sweeping) g.setVisible(spots.includes(i)).setAlpha(1); });
    if (spots.length) {
      const [bx, by] = DUST_POS[spots[0]];
      this.broom.setPosition(bx + 4, by - 26).setVisible(true);
    } else this.broom.setVisible(false);
  }

  dustAt(x, y) {
    for (let i = 0; i < this.dustSpots.length; i++) {
      const g = this.dustSpots[i];
      if (g.visible && !g.sweeping && Math.abs(x - g.x) <= 24 && Math.abs(y - g.y) <= 14) return i;
    }
    return -1;
  }

  // Chổi quét qua lại, bụi bay, vệt mờ dần; xu bay về ô xu (tx, ty)
  sweepFx(i, reward, tx, ty) {
    const g = this.dustSpots[i];
    g.sweeping = true;
    const done = () => { g.sweeping = false; g.setVisible(false).setAlpha(1); };
    const label = this.add.text(g.x, g.y - 16, '+' + reward + ' xu', { fontFamily: '"Baloo 2", system-ui, sans-serif', fontSize: '18px', fontStyle: '700', color: '#ffe08a', stroke: '#3b2f2a', strokeThickness: 5 }).setOrigin(0.5);
    this.tweens.add({ targets: label, y: g.y - 50, alpha: 0, duration: 1000, ease: 'Quad.easeOut', onComplete: () => label.destroy() });
    if (reduceMotion) { done(); return; }
    const bg = this.add.graphics({ x: g.x - 14, y: g.y - 6 });
    this.broomIcon(bg, 0, 0, 1.2);
    bg.setAngle(-25);
    this.tweens.add({ targets: bg, x: g.x + 14, angle: 20, duration: 160, yoyo: true, repeat: 1, ease: 'Sine.easeInOut', onComplete: () => bg.destroy() });
    for (let k = 0; k < 7; k++) {
      const p = this.add.circle(g.x + (k - 3) * 4, g.y, 2 + (k % 3), 0x9a8a7a, 0.6);
      this.tweens.add({ targets: p, x: p.x + (k - 3) * 6, y: g.y - 14 - (k % 3) * 6, alpha: 0, delay: 120, duration: 520, ease: 'Quad.easeOut', onComplete: () => p.destroy() });
    }
    this.tweens.add({ targets: g, alpha: 0, delay: 260, duration: 380, onComplete: done });
    const coin = this.add.circle(g.x, g.y - 10, 7, 0xf2b544).setStrokeStyle(2, INK);
    this.tweens.add({ targets: coin, x: tx, y: ty, scale: 0.6, delay: 300, duration: 650, ease: 'Cubic.easeIn', onComplete: () => coin.destroy() });
  }

  // Thùng nào nằm dưới điểm chạm. Thân thùng luôn được ưu tiên, để chạm đáy thùng trên không bị tính
  // cho cây của thùng dưới; chỉ khi không trúng thân thùng nào mới xét phần cây mọc phía trên mỗi thùng.
  boxAt(x, y) {
    for (let i = 0; i < this.boxes.length; i++) {
      const c = this.boxes[i], s = c.scaleX;
      if (Math.abs(x - c.x) <= 52 * s && y >= c.y - 28 * s && y <= c.y + 36 * s) return i;
    }
    for (let i = 0; i < this.boxes.length; i++) {
      const c = this.boxes[i], s = c.scaleX, top = c.y - 28 * s;
      if (Math.abs(x - c.x) <= 40 * s && y < top && y >= top - 75) return i;
    }
    return -1;
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
  // p: màu đã trộn cho giờ hiện tại (daylight.js)
  paintSky(p) {
    const g = this.sky; g.clear();
    g.fillGradientStyle(p.skyTop, p.skyTop, p.skyBot, p.skyBot, 1);
    g.fillRect(0, 0, W, 340);
    if (p.stars > 0.02) {
      const r = rng(7);
      for (let i = 0; i < 40; i++) {
        const x = r() * W, y = r() * 200, big = r() < 0.15;
        g.fillStyle(0xfff3c4, p.stars * (big ? 1 : 0.75)); g.fillCircle(x, y, big ? 1.4 : 0.8);
      }
    }
    if (p.moon.alpha > 0.02) {
      g.fillStyle(0xffe9a8, p.moon.alpha); g.fillCircle(p.moon.x, p.moon.y, 16);
      g.fillStyle(p.skyTop, p.moon.alpha); g.fillCircle(p.moon.x + 8, p.moon.y - 6, 14);
    }
    if (p.sun.alpha > 0.02) {
      // Gần chân trời mặt trời to và đỏ cam hơn
      const core = mixColor(0xffe08a, 0xff9a5c, p.sun.low), halo = mixColor(0xfff4c9, 0xffc18a, p.sun.low);
      const r = 19 + p.sun.low * 8;
      g.fillStyle(halo, 0.55 * p.sun.alpha); g.fillCircle(p.sun.x, p.sun.y, r * 1.6);
      g.fillStyle(core, p.sun.alpha); g.fillCircle(p.sun.x, p.sun.y, r);
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

    // Cửa sổ: mỗi ô có một ngưỡng cố định; trời càng tối càng nhiều ô vượt ngưỡng và sáng đèn
    this.winList = [];
    const r = rng(91);
    ['mid', 'near'].forEach(key => {
      this.layers[key].forEach(b => {
        const cols = Math.max(2, Math.floor(b.w / 13));
        const cw = 5, ch = 6, gx = (b.w - cols * cw) / (cols + 1);
        for (let y = b.top + 10; y < b.base - 6; y += 13) {
          for (let c = 0; c < cols; c++) this.winList.push({ x: b.x + gx + c * (cw + gx), y, w: cw, h: ch, th: r() });
        }
      });
    });
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

    const g = this.windows; g.clear();
    this.winList.forEach(w => {
      const on = w.th < p.lit;
      g.fillStyle(on ? 0xffd98a : 0x000000, on ? 0.95 : 0.12);
      g.fillRect(w.x, w.y, w.w, w.h);
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

  // ----- Chuồng gà (F05): chuồng sàn chân cao, sân quây lưới B40, máng tre, bình nước -----
  drawCoop() {
    const firstChild = this.children.list.length;
    const WOOD = 0xc89a6a, WOOD_D = 0x9c6b45, POST = 0x7a5236;
    const RUN = { x0: 284, x1: 386, back: 352, front: 436 };
    this.run = RUN;

    // Lưới phía sau sân
    const back = this.add.graphics();
    this.mesh(back, RUN.x0, RUN.x1, RUN.back - 20, RUN.back);
    back.lineStyle(3, INK, 1); back.fillStyle(POST, 1);
    [RUN.x0, RUN.x1].forEach(px => { back.fillRect(px - 2, RUN.back - 22, 4, 24); back.strokeRect(px - 2, RUN.back - 22, 4, 24); });

    // Rơm lót sân
    const floor = this.add.graphics();
    floor.fillStyle(0xe6c27e, 0.55); floor.fillEllipse(335, 400, 104, 40);
    floor.lineStyle(1.2, 0xc99a4e, 0.8);
    const r = rng(5);
    for (let k = 0; k < 26; k++) { const fx = 292 + r() * 88, fy = 386 + r() * 30; floor.lineBetween(fx, fy, fx + 5 - r() * 10, fy + 2 - r() * 4); }

    // Chuồng sàn
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.18); g.fillEllipse(342, 364, 70, 10);
    g.lineStyle(2.5, INK, 1);
    g.fillStyle(POST, 1);
    [[318, 330], [363, 330]].forEach(([lx, ly]) => { g.fillRect(lx, ly, 4, 34); g.strokeRect(lx, ly, 4, 34); });
    g.fillStyle(WOOD_D, 1); g.fillRect(310, 326, 64, 8); g.strokeRect(310, 326, 64, 8);
    g.fillStyle(WOOD, 1); g.fillRect(313, 297, 58, 30); g.strokeRect(313, 297, 58, 30);
    g.lineStyle(1.4, 0xa97c4f, 1); for (let px = 323; px < 371; px += 10) g.lineBetween(px, 299, px, 325);
    // Cửa tròn và thanh đậu
    g.lineStyle(2.5, INK, 1); g.fillStyle(0x3b2a20, 1); g.fillCircle(342, 313, 7.5); g.strokeCircle(342, 313, 7.5);
    // Mái tôn lượn sóng
    const roof = [{ x: 304, y: 302 }, { x: 342, y: 274 }, { x: 380, y: 302 }];
    g.fillStyle(0x8fa6b2, 1); g.fillPoints(roof, true);
    g.lineStyle(1.3, 0x6d8593, 1);
    for (let k = 1; k < 8; k++) { const t = k / 8; g.lineBetween(342, 275, 304 + 76 * t, 301); }
    g.lineStyle(2.5, INK, 1); g.strokePoints(roof, true);
    g.fillStyle(0x6d8593, 1); g.fillRect(338, 271, 8, 5);
    // Cầu thang gỗ có nan cho gà lên chuồng
    const ramp = [{ x: 336, y: 331 }, { x: 348, y: 331 }, { x: 353, y: 376 }, { x: 331, y: 376 }];
    g.fillStyle(0xb98856, 1); g.fillPoints(ramp, true); g.strokePoints(ramp, true);
    g.lineStyle(2, 0x7a5236, 1); for (let ry = 338; ry < 376; ry += 7) g.lineBetween(336 - (ry - 331) * 0.11, ry, 348 + (ry - 331) * 0.11, ry);
    // Ổ đẻ gắn bên hông chuồng, mặt trước để hở thấy rơm và trứng
    g.lineStyle(2.5, INK, 1);
    g.fillStyle(0xa97c4f, 1); g.fillRect(289, 306, 25, 22); g.strokeRect(289, 306, 25, 22);
    g.fillStyle(0x4a3326, 1); g.fillRect(292, 311, 19, 14);
    g.fillStyle(0xe6c27e, 1); g.fillEllipse(301.5, 324, 20, 6);
    g.fillStyle(WOOD_D, 1); g.fillPoints([{ x: 286, y: 307 }, { x: 316, y: 307 }, { x: 314, y: 301 }, { x: 288, y: 301 }], true);
    g.strokePoints([{ x: 286, y: 307 }, { x: 316, y: 307 }, { x: 314, y: 301 }, { x: 288, y: 301 }], true);

    this.eggG = this.add.graphics();
    this.eggCount = this.add.text(277, 316, '', { fontFamily: '"Baloo 2", system-ui, sans-serif', fontSize: '14px', fontStyle: '700', color: '#fff8ec', stroke: '#3b2f2a', strokeThickness: 4 }).setOrigin(1, 0.5);
    this.eggBubble = this.makeEggBubble();
    this.eggBubble.setPosition(300, 284).setVisible(false);
    this.coopPos = { x: 301, y: 320 };
    this.coopC = this.add.container(0, 0, [g, this.eggG]);   // để chạm thì cả chuồng nảy nhẹ
    const zone = this.add.zone(330, 314, 104, 80).setInteractive({ useHandCursor: true });
    zone.on('pointerup', pointer => { if (!this.isCanvasTap(pointer)) return; this.bounceAt(g, this.eggG); hooks.onTapCoop(); });

    // Máng ăn bằng ống tre bổ đôi, gác trên hai cọc chữ Y
    const tx = 320, ty = 404;
    this.trough = this.add.container(tx, ty);
    const tg = this.add.graphics();
    tg.fillStyle(0x000000, 0.16); tg.fillEllipse(0, 9, 60, 8);
    tg.lineStyle(2, INK, 1); tg.fillStyle(POST, 1);
    [-20, 20].forEach(sx => { tg.fillRect(sx - 1.5, -2, 3, 10); tg.lineBetween(sx - 4, -4, sx, 0); tg.lineBetween(sx + 4, -4, sx, 0); });
    tg.lineStyle(2.4, INK, 1); tg.fillStyle(0x9cc25a, 1);
    tg.fillRoundedRect(-27, -7, 54, 10, 5); tg.strokeRoundedRect(-27, -7, 54, 10, 5);
    tg.fillStyle(0x5f8a33, 1); tg.fillRoundedRect(-24, -6, 48, 4, 2);
    tg.lineStyle(1.6, 0xd7e8a6, 1); tg.lineBetween(-9, -6, -9, 2); tg.lineBetween(11, -6, 11, 2);
    this.trough.add(tg);
    this.grain = this.add.graphics();
    this.trough.add(this.grain);
    this.feedBubble = this.makeFeedBubble();
    this.feedBubble.setPosition(0, -36).setVisible(false);
    this.trough.add(this.feedBubble);
    const tz = this.add.zone(tx, ty - 8, 66, 44).setInteractive({ useHandCursor: true });
    tz.on('pointerup', pointer => { if (!this.isCanvasTap(pointer)) return; this.bounce(this.trough); hooks.onTapTrough(); });

    // Bình nước gà: đế đỏ, bình trong
    const wg = this.add.graphics();
    wg.fillStyle(0x000000, 0.16); wg.fillEllipse(368, 412, 24, 6);
    wg.lineStyle(2.2, INK, 1);
    wg.fillStyle(0xd8352a, 1); wg.fillEllipse(368, 408, 24, 8); wg.strokeEllipse(368, 408, 24, 8);
    wg.fillStyle(0x6fb4e0, 0.9); wg.fillEllipse(368, 406, 18, 4);
    wg.fillStyle(0xdff0f6, 0.92); wg.fillRoundedRect(361, 386, 14, 20, { tl: 7, tr: 7, bl: 2, br: 2 }); wg.strokeRoundedRect(361, 386, 14, 20, { tl: 7, tr: 7, bl: 2, br: 2 });
    wg.fillStyle(0x8cc6e6, 0.9); wg.fillRect(362.5, 396, 11, 9);
    wg.fillStyle(0xd8352a, 1); wg.fillRoundedRect(363, 382, 10, 5, 2); wg.strokeRoundedRect(363, 382, 10, 5, 2);

    // Gà trống và gà mái đi lại trong sân
    this.chickens = [this.makeChicken(304, 396, 1, 'rooster'), this.makeChicken(356, 424, -1, 'hen')];
    this.chickenSpots = [[330, 418, 1], [296, 426, -1], [372, 400, -1]];   // chỗ cho gà mái thêm (level 8)

    // Lưới phía trước, vẽ sau gà để gà nằm trong sân
    const front = this.add.graphics();
    this.coopFront = front;
    this.mesh(front, RUN.x0, RUN.x1, RUN.front - 26, RUN.front);
    front.lineStyle(3, INK, 1); front.fillStyle(POST, 1);
    [RUN.x0, 335, RUN.x1].forEach(px => { front.fillRect(px - 2, RUN.front - 30, 4, 32); front.strokeRect(px - 2, RUN.front - 30, 4, 32); });
    front.lineStyle(2.5, POST, 1);
    front.lineBetween(RUN.x0, RUN.back - 22, RUN.x0, RUN.front - 30); front.lineBetween(RUN.x1, RUN.back - 22, RUN.x1, RUN.front - 30);
    this.coopView = '';

    // Phóng cả cụm chuồng quanh góc trước bên phải của sân gà (COOP_ANCHOR): nở lên trên và sang trái,
    // không đè lên thùng xốp. Mọi thứ bên trong vẫn vẽ theo toạ độ gốc; vùng chạm đổi theo coopPoint().
    const made = this.children.list.slice(firstChild);
    const zones = made.filter(o => o.type === 'Zone');
    this.coopLayer = this.add.container(COOP_ANCHOR.x * (1 - COOP_SCALE), COOP_ANCHOR.y * (1 - COOP_SCALE)).setScale(COOP_SCALE);
    this.coopLayer.add(made.filter(o => o.type !== 'Zone'));
    zones.forEach(z => {
      const p = this.coopPoint(z.x, z.y);
      z.setPosition(p.x, p.y).setSize(z.width * COOP_SCALE, z.height * COOP_SCALE);
    });
  }

  // Số gà trong sân theo bản lưu: thêm gà mái khi lên level (gà đi trong sân, sau lưới phía trước)
  setChickens(n) {
    while (this.chickens.length < n && this.chickens.length - 2 < this.chickenSpots.length) {
      const [x, y, dir] = this.chickenSpots[this.chickens.length - 2];
      const c = this.makeChicken(x, y, dir, 'hen');
      this.coopLayer.addAt(c, this.coopLayer.getIndex(this.coopFront));
      this.chickens.push(c);
      if (!reduceMotion) { c.setAlpha(0); this.tweens.add({ targets: c, alpha: 1, duration: 500 }); }
    }
  }

  // ----- Trang trí sân (level 10: chậu hoa giấy) -----
  setDecor(list) {
    if (list.includes('hoa_giay') && !this.hoaGiay) this.hoaGiay = this.makeHoaGiay(368, 492);
  }

  makeHoaGiay(x, y) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.18); g.fillEllipse(0, 2, 34, 8);
    // chậu đất nung
    g.lineStyle(2.4, INK, 1); g.fillStyle(0xc8703f, 1);
    g.fillPoints([{ x: -13, y: -16 }, { x: 13, y: -16 }, { x: 10, y: 1 }, { x: -10, y: 1 }], true);
    g.strokePoints([{ x: -13, y: -16 }, { x: 13, y: -16 }, { x: 10, y: 1 }, { x: -10, y: 1 }], true);
    g.fillStyle(0xa9592f, 1); g.fillRect(-15, -20, 30, 5); g.strokeRect(-15, -20, 30, 5);
    // cành và lá
    g.lineStyle(2, 0x6b4a2e, 1); g.lineBetween(0, -20, -8, -44); g.lineBetween(0, -20, 9, -46); g.lineBetween(0, -20, 1, -54);
    g.fillStyle(0x5f9a4c, 1); g.lineStyle(1.6, INK, 1);
    [[-12, -36], [12, -38], [-4, -48], [6, -30], [-9, -27]].forEach(([lx, ly]) => { g.fillEllipse(lx, ly, 8, 5); g.strokeEllipse(lx, ly, 8, 5); });
    // chùm hoa giấy hồng tím
    const cols = [0xe0559a, 0xef7ab4, 0xd9418a];
    [[-10, -48], [-15, -40], [10, -50], [15, -42], [2, -58], [-3, -52], [6, -44], [-6, -42]].forEach(([fx, fy], k) => {
      g.fillStyle(cols[k % 3], 1); g.lineStyle(1.5, INK, 1);
      g.fillCircle(fx, fy, 5); g.strokeCircle(fx, fy, 5);
      g.fillStyle(0xfff4c9, 1); g.fillCircle(fx, fy, 1.2);
    });
    c.add(g);
    this.children.moveBelow(c, this.frontWall);
    if (!reduceMotion) { c.setScale(0.3); this.tweens.add({ targets: c, scale: 1, duration: 500, ease: 'Back.easeOut' }); }
    return c;
  }

  // Đổi toạ độ vẽ gốc của chuồng sang toạ độ trên cảnh sau khi phóng to
  coopPoint(x, y) {
    return { x: COOP_ANCHOR.x + (x - COOP_ANCHOR.x) * COOP_SCALE, y: COOP_ANCHOR.y + (y - COOP_ANCHOR.y) * COOP_SCALE };
  }

  // Lưới thép mắt cáo (B40) giữa hai cọc: các đường chéo đan nhau, có thanh trên và dưới
  mesh(g, x0, x1, y0, y1) {
    g.lineStyle(1, 0x5b6770, 0.55);
    const h = y1 - y0, step = 7;
    for (let x = x0 - h; x < x1; x += step) {
      g.lineBetween(Math.max(x0, x), y1 - Math.max(0, x0 - x), Math.min(x1, x + h), y0 + Math.max(0, x + h - x1));
      g.lineBetween(Math.max(x0, x), y0 + Math.max(0, x0 - x), Math.min(x1, x + h), y1 - Math.max(0, x + h - x1));
    }
    g.lineStyle(2, 0x5b6770, 0.9); g.lineBetween(x0, y0, x1, y0); g.lineBetween(x0, y1, x1, y1);
  }

  bounceAt(...targets) {
    if (reduceMotion) return;
    targets.forEach(t => { this.tweens.killTweensOf(t); t.y = 0; this.tweens.add({ targets: t, y: -2, duration: 90, yoyo: true, ease: 'Quad.easeOut' }); });
  }

  makeEggBubble() {
    const b = this.add.container(0, 0);
    const g = this.add.graphics();
    g.fillStyle(0xfff8ec, 1); g.lineStyle(2.5, INK, 1);
    g.fillCircle(0, 0, 12); g.strokeCircle(0, 0, 12);
    g.fillTriangle(-4, 9, 2, 10, 0, 18); g.lineBetween(-4, 10, 0, 18); g.lineBetween(2, 10, 0, 18);
    g.fillStyle(0xf7e7cf, 1); g.lineStyle(2, INK, 1); g.fillEllipse(0, 0, 10, 13); g.strokeEllipse(0, 0, 10, 13);
    b.add(g);
    if (!reduceMotion) this.tweens.add({ targets: g, y: -4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return b;
  }

  makeFeedBubble() {
    const b = this.add.container(0, 0);
    const g = this.add.graphics();
    g.fillStyle(0xfff8ec, 1); g.lineStyle(2.5, INK, 1);
    g.fillCircle(0, 0, 12); g.strokeCircle(0, 0, 12);
    g.fillTriangle(-4, 9, 2, 10, -2, 18); g.lineBetween(-4, 10, -2, 18); g.lineBetween(2, 10, -2, 18);
    g.fillStyle(0xe8b84a, 1); g.lineStyle(1.5, INK, 1);
    [[-4, 2], [3, 3], [0, -3], [5, -3], [-5, -4]].forEach(([gx, gy]) => { g.fillEllipse(gx, gy, 4.5, 3.2); g.strokeEllipse(gx, gy, 4.5, 3.2); });
    b.add(g);
    if (!reduceMotion) this.tweens.add({ targets: g, y: -4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return b;
  }

  // ----- Gà ta: trống lông đỏ cam đuôi xanh đen, mái nâu có đốm. Chân chạm đất ở (0, 0), quay mặt sang phải -----
  bez(p0, p1, p2, p3, n = 10) {
    return new Phaser.Curves.CubicBezier(new Phaser.Math.Vector2(p0[0], p0[1]), new Phaser.Math.Vector2(p1[0], p1[1]), new Phaser.Math.Vector2(p2[0], p2[1]), new Phaser.Math.Vector2(p3[0], p3[1])).getPoints(n);
  }

  shape(g, curves, fill, outline = 2.2) {
    const pts = [].concat(...curves);
    g.fillStyle(fill, 1); g.fillPoints(pts, true);
    if (outline) { g.lineStyle(outline, INK, 1); g.strokePoints(pts, true); }
  }

  makeChicken(x, y, dir, kind) {
    const rooster = kind === 'rooster';
    const BODY = rooster ? 0xc4502a : 0xb47644;
    const WING = rooster ? 0x8e3420 : 0x7f4e2a;
    const NECK = rooster ? 0xeaa040 : 0xc98d55;
    const c = this.add.container(x, y).setScale(dir, 1);
    const g = this.add.graphics();

    // Bóng và chân có ngón
    g.fillStyle(0x000000, 0.16); g.fillEllipse(-1, 1, 30, 6);
    g.lineStyle(2.2, 0xd9a032, 1);
    [[-4, -7], [3, -7]].forEach(([lx, ly]) => {
      g.lineBetween(lx, ly, lx, 0);
      g.lineBetween(lx, 0, lx + 4, 0.5); g.lineBetween(lx, 0, lx + 2.5, 2); g.lineBetween(lx, 0, lx - 2.5, 0.8);
    });

    // Đuôi
    if (rooster) {
      [[0x22423a, -28, -40, -30, -12], [0x2f5d4c, -24, -44, -22, -16], [0x1b332d, -20, -36, -16, -14]].forEach(([col, tx, ty, ex, ey]) => {
        this.shape(g, [this.bez([-9, -18], [tx + 2, ty - 6], [tx - 8, ty + 10], [ex, ey]), this.bez([ex, ey], [tx + 2, ty + 14], [tx + 10, ty], [-7, -13])], col, 2);
      });
    } else {
      this.shape(g, [this.bez([-9, -18], [-20, -30], [-24, -22], [-20, -12]), this.bez([-20, -12], [-16, -10], [-12, -11], [-8, -12])], 0x6e4123, 2);
    }

    // Thân
    this.shape(g, [
      this.bez([8, -24], [14, -18], [14, -8], [6, -5]),
      this.bez([6, -5], [0, -2], [-10, -3], [-13, -10]),
      this.bez([-13, -10], [-15, -17], [-8, -21], [-2, -21]),
      this.bez([-2, -21], [2, -21], [4, -26], [8, -24])
    ], BODY);
    // Lông cổ
    this.shape(g, [this.bez([2, -25], [0, -20], [3, -14], [10, -13]), this.bez([10, -13], [14, -16], [14, -24], [9, -27])], NECK, 1.8);
    if (!rooster) {
      g.fillStyle(0x7a4a28, 1);
      [[-6, -15], [-2, -10], [3, -14], [-9, -9], [5, -9], [0, -17]].forEach(([sx, sy]) => g.fillEllipse(sx, sy, 2.4, 1.6));
    }
    // Cánh với ba đường lông
    this.shape(g, [this.bez([-9, -15], [-4, -19], [5, -17], [6, -11]), this.bez([6, -11], [3, -7], [-6, -7], [-9, -15])], WING, 1.8);
    g.lineStyle(1.2, INK, 0.7);
    [[-5, -10, 1, -12], [-6, -12, 2, -14], [-3, -8, 3, -10]].forEach(([x0, y0, x1, y1]) => g.lineBetween(x0, y0, x1, y1));
    c.add(g);

    // Đầu: mào, mỏ, yếm, mắt (tách riêng để mổ thóc)
    const head = this.add.container(10, -27);
    const hg = this.add.graphics();
    const comb = rooster
      ? [this.bez([-4, -4], [-6, -10], [-2, -12], [-1, -7]), this.bez([-1, -7], [0, -13], [4, -13], [3, -7]), this.bez([3, -7], [6, -12], [9, -9], [6, -4])]
      : [this.bez([-1, -5], [-1, -9], [3, -9], [3, -6]), this.bez([3, -6], [5, -8], [7, -6], [5, -4])];
    this.shape(hg, comb.concat([[new Phaser.Math.Vector2(-3, -3)]]), 0xd8352a, 1.8);
    hg.lineStyle(2.2, INK, 1); hg.fillStyle(rooster ? NECK : BODY, 1); hg.fillCircle(1, -1, 5.5); hg.strokeCircle(1, -1, 5.5);
    hg.fillStyle(0xe0574a, 1); hg.fillEllipse(3.5, -1, 5, 4.5);           // mặt đỏ
    this.shape(hg, [this.bez([5, -3], [8, -3], [10, -2], [11, -1]), this.bez([11, -1], [9, 0], [7, 1], [5, 1])], 0xf2b544, 1.6);   // mỏ
    this.shape(hg, [this.bez([5, 1], [7, 3], [7, rooster ? 8 : 5], [5, rooster ? 8 : 5]), this.bez([5, rooster ? 8 : 5], [3, rooster ? 7 : 4], [3, 3], [4, 1])], 0xd8352a, 1.5);  // yếm
    hg.fillStyle(INK, 1); hg.fillCircle(3, -2.5, 1.3);
    hg.fillStyle(0xffffff, 1); hg.fillCircle(3.4, -2.9, 0.45);
    head.add(hg);
    c.add(head);
    c.head = head;
    c.homeY = -27;
    if (!reduceMotion) this.time.delayedCall(600 + Math.random() * 1500, () => this.chickenAct(c));
    return c;
  }

  // Gà lúc mổ thóc, lúc đi vài bước trong sân
  chickenAct(c) {
    const R = this.run;
    const next = () => this.time.delayedCall(900 + Math.random() * 2600, () => this.chickenAct(c));
    if (Math.random() < 0.55) {
      this.tweens.add({ targets: c.head, y: c.homeY + 9, x: 13, angle: 30, duration: 150, yoyo: true, repeat: 1 + Math.floor(Math.random() * 3), ease: 'Quad.easeOut', onComplete: next });
    } else {
      const nx = Phaser.Math.Clamp(c.x + (Math.random() * 60 - 30), R.x0 + 14, R.x1 - 12);
      const ny = Phaser.Math.Clamp(c.y + (Math.random() * 20 - 10), 386, 428);
      c.setScale(nx >= c.x ? 1 : -1, 1);
      this.tweens.add({ targets: c, x: nx, y: ny, duration: 600 + Math.abs(nx - c.x) * 18, ease: 'Sine.easeInOut', onComplete: next });
      this.tweens.add({ targets: c.head, y: c.homeY - 1.5, duration: 160, yoyo: true, repeat: 3 });
    }
  }

  // Vẽ lại chuồng theo trạng thái: { eggs, fed, hungry }
  setCoop(v) {
    const key = [v.eggs, v.fed, v.hungry].join('|');
    if (key === this.coopView) return;
    this.coopView = key;
    const g = this.eggG; g.clear();
    const spots = [[296, 320], [307, 320], [301.5, 316]];
    for (let k = 0; k < Math.min(v.eggs, spots.length); k++) {
      const [ex, ey] = spots[k];
      g.fillStyle(0xfbf3e4, 1); g.lineStyle(1.8, INK, 1);
      g.fillEllipse(ex, ey, 8, 10); g.strokeEllipse(ex, ey, 8, 10);
    }
    this.eggCount.setText(v.eggs > 3 ? '×' + v.eggs : '');
    this.eggBubble.setVisible(v.eggs > 0);
    const gr = this.grain; gr.clear();
    if (v.fed) {
      gr.fillStyle(0xe8b84a, 1);
      for (let k = 0; k < 11; k++) gr.fillEllipse(-21 + k * 4.2, -4.5 + (k % 2) * 0.8, 3.6, 2.6);
    }
    this.feedBubble.setVisible(!!v.hungry);
  }

  feedFx() {
    if (reduceMotion) return;
    const tx = this.trough.x, ty = this.trough.y;
    for (let k = 0; k < 10; k++) {
      const d = this.add.ellipse(tx - 18 + k * 4, ty - 44 - (k % 3) * 6, 4, 3, 0xe8b84a).setStrokeStyle(1, INK);
      this.coopLayer.add(d);
      this.tweens.add({ targets: d, y: ty - 5, delay: k * 35, duration: 360, ease: 'Quad.easeIn', onComplete: () => d.destroy() });
    }
    // Gà chạy lại máng ăn
    this.chickens.forEach((c, i) => {
      const nx = tx + (i ? 16 : -16);
      c.setScale(i ? -1 : 1, 1);
      this.tweens.add({ targets: c, x: nx, y: ty + 14, duration: 500, ease: 'Quad.easeOut' });
    });
  }

  eggsFx(qty, tx, ty) {
    const p = this.coopPoint(this.coopPos.x, this.coopPos.y);
    this.flyToBag(p.x, p.y, 0xfbf3e4, qty, tx, ty);
  }

  // Chữ nổi nhỏ trên thùng: một nhãn giấy nhỏ hiện lên, nổi nhẹ rồi mờ dần (không che giao diện)
  floatAtBox(i, msg) {
    const c = this.boxes[i];
    if (!c) return;
    // Thùng này đang có nhãn cũ thì bỏ nhãn cũ, tránh chồng chữ khi chạm liên tục
    if (c.floatLabel) { c.floatLabel.destroy(); c.floatLabel = null; }
    const t = this.add.text(0, 0, msg, { fontFamily: '"Be Vietnam Pro", system-ui, sans-serif', fontSize: '10px', fontStyle: '600', color: '#3b2f2a' }).setOrigin(0.5).setResolution(3);
    const w = t.width + 12, h = t.height + 5;
    const g = this.add.graphics();
    g.fillStyle(0xfff8ec, 0.96); g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.lineStyle(1.6, INK, 1); g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    const y = c.y - 46;
    const lbl = this.add.container(c.x, y, [g, t]).setAlpha(0);
    c.floatLabel = lbl;
    this.tweens.add({ targets: lbl, alpha: 1, y: y - 6, duration: 180, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: lbl, alpha: 0, y: y - 18, delay: 1500, duration: 450, ease: 'Quad.easeIn', onComplete: () => { lbl.destroy(); if (c.floatLabel === lbl) c.floatLabel = null; } });
  }

  // Vật phẩm bay về nút túi đồ, kèm chữ "+n"
  flyToBag(x, y, col, qty, tx, ty) {
    const label = this.add.text(x, y - 20, '+' + qty, { fontFamily: '"Baloo 2", system-ui, sans-serif', fontSize: '22px', fontStyle: '700', color: '#fff8ec', stroke: '#3b2f2a', strokeThickness: 5 }).setOrigin(0.5);
    this.tweens.add({ targets: label, y: y - 54, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => label.destroy() });
    if (reduceMotion) return;
    for (let k = 0; k < Math.min(qty, 8); k++) {
      const d = this.add.circle(x + (k - (Math.min(qty, 8) - 1) / 2) * 12, y, 6, col).setStrokeStyle(2, INK);
      this.tweens.add({ targets: d, x: tx, y: ty, scale: 0.5, delay: 120 + k * 90, duration: 600, ease: 'Cubic.easeIn', onComplete: () => d.destroy() });
    }
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
    cloth(140, 22, 30, 0x8fc0d9); cloth(170, 18, 24, 0xf2b544);

    // F12: giấy đặt hàng của hàng xóm ghim trên dây phơi (vẽ lại theo số đơn trong setOrderNotes)
    this.notesG = this.add.graphics();
    this.notesBubble = this.makeCheckBubble().setPosition(240, 252).setVisible(false);
    const z = this.add.zone(226, 296, 76, 62).setInteractive({ useHandCursor: true });
    z.on('pointerup', pointer => { if (!this.isCanvasTap(pointer)) return; this.bounceAt(this.notesG); hooks.onTapOrders(); });
    this.notesView = '';
  }

  lineY(x) { return 272 + Math.sin(Math.PI * (x - 118) / 144) * 10; }

  makeCheckBubble() {
    const b = this.add.container(0, 0);
    const g = this.add.graphics();
    g.fillStyle(0xfff8ec, 1); g.lineStyle(2.5, INK, 1);
    g.fillCircle(0, 0, 12); g.strokeCircle(0, 0, 12);
    g.fillTriangle(-4, 9, 2, 10, -6, 18); g.lineBetween(-4, 10, -6, 18); g.lineBetween(2, 10, -6, 18);
    g.lineStyle(3.2, 0x5f9a4c, 1); g.beginPath(); g.moveTo(-5, 0); g.lineTo(-1, 4); g.lineTo(6, -4); g.strokePath();
    b.add(g);
    if (!reduceMotion) this.tweens.add({ targets: g, y: -4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return b;
  }

  // n tờ giấy đặt hàng; ready = có đơn giao được ngay (hiện bong bóng dấu tích)
  setOrderNotes(n, ready) {
    const key = n + '|' + ready;
    if (key === this.notesView) return;
    this.notesView = key;
    const g = this.notesG; g.clear();
    [204, 226, 248].slice(0, n).forEach((x, k) => {
      const y = this.lineY(x), ang = [-0.06, 0.05, -0.03][k];
      const w = 17, h = 21, cx = x, cy = y + 2 + h / 2;
      const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([px, py]) => ({ x: cx + px * Math.cos(ang) - py * Math.sin(ang), y: cy + px * Math.sin(ang) + py * Math.cos(ang) }));
      g.fillStyle(0xfffaf0, 1); g.fillPoints(pts, true); g.lineStyle(1.8, INK, 1); g.strokePoints(pts, true);
      g.lineStyle(1.2, 0x9a8a7a, 1);
      for (let r = 0; r < 3; r++) g.lineBetween(cx - 5, cy - 4 + r * 4, cx + 5 - (r === 2 ? 3 : 0), cy - 4 + r * 4);
      g.fillStyle(0xc89a5a, 1); g.lineStyle(1.4, INK, 1); g.fillRect(cx - 1.6, y - 3, 3.2, 7); g.strokeRect(cx - 1.6, y - 3, 3.2, 7);   // kẹp phơi
    });
    this.notesBubble.setVisible(!!ready && n > 0);
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
    c.plant = this.add.graphics({ x: 0, y: -14 }).setScale(PLANT_SCALE);
    c.add(c.plant);

    // Bong bóng giọt nước nhắc tưới, và ánh lấp lánh khi cây chín
    c.bubble = this.makeBubble();
    c.bubble.setPosition(44, -48).setScale(1.35).setVisible(false);
    c.add(c.bubble);
    c.sparkle = this.makeSparkle();
    c.sparkle.setPosition(-42, -52).setScale(1.35).setVisible(false);
    c.add(c.sparkle);

    // Thanh tiến độ lớn lên, nằm trên mặt trước thùng (không đè lên cây, bong bóng tưới hay mũi tên)
    c.bar = this.add.graphics().setVisible(false);
    c.add(c.bar);
    c.barKey = '';

    // F04: dấu bao phân nhỏ ở góc thùng khi lứa này đã bón
    c.fertG = this.add.graphics().setVisible(false);
    c.add(c.fertG);
    c.fertKey = '';

    c.viewKey = '';

    return c;
  }

  // Vẽ thanh tiến độ: xanh lá khi đã tưới (lớn đủ tốc độ), cam nhạt khi đất khô (lớn chậm một nửa).
  // Cây chín thì ẩn thanh, vì đã có ánh lấp lánh.
  drawBar(c, v) {
    const show = !!v.crop && !v.ripe;
    const f = Math.max(0, Math.min(1, v.grow || 0));
    const key = show ? Math.round(f * 100) + '|' + v.dry + '|' + !!v.fert : 'off';
    if (key === c.barKey) return;
    c.barKey = key;
    c.bar.setVisible(show);
    if (!show) return;
    // Lứa đã bón phân: thanh ngắn lại một chút để chừa chỗ cho dấu bao phân bên trái (F04)
    const g = c.bar, x = v.fert ? -24 : -36, y = 7, w = v.fert ? 60 : 72, h = 13, r = 6.5;
    g.clear();
    g.fillStyle(0xe7dccb, 1); g.fillRoundedRect(x, y, w, h, r);
    const fw = Math.max(h, w * f);
    if (f > 0) {
      g.fillStyle(v.dry ? 0xf0a85a : 0x6fb84f, 1); g.fillRoundedRect(x, y, fw, h, r);
      g.fillStyle(0xffffff, 0.35); g.fillRoundedRect(x + 3, y + 2, Math.max(0, fw - 6), 3.5, 1.75);
    }
    g.lineStyle(2.6, INK, 1); g.strokeRoundedRect(x, y, w, h, r);
  }

  // F04: bao phân nhỏ ở góc trước bên trái thùng; màu theo loại phân (config FERTILIZERS)
  drawFert(c, fert) {
    const key = fert || '';
    if (key === c.fertKey) return;
    c.fertKey = key;
    const g = c.fertG; g.clear(); g.setVisible(!!fert);
    if (!fert) return;
    const col = fert === 'phan_sai_qua' ? 0xf08a3c : 0x8cc63f;
    const x = -45, y = 1;
    g.fillStyle(0xfff8ec, 1); g.lineStyle(2.4, INK, 1);
    g.fillRoundedRect(x - 2, y - 2, 22, 26, 5); g.strokeRoundedRect(x - 2, y - 2, 22, 26, 5);
    g.fillStyle(col, 1); g.fillRoundedRect(x + 2, y + 6, 14, 15, 3); g.strokeRoundedRect(x + 2, y + 6, 14, 15, 3);
    g.fillTriangle(x + 4, y + 6, x + 14, y + 6, x + 9, y + 1); g.lineBetween(x + 4, y + 6, x + 9, y + 1); g.lineBetween(x + 14, y + 6, x + 9, y + 1);
    g.lineStyle(2, INK, 1);
    if (fert === 'phan_sai_qua') { g.lineBetween(x + 9, y + 10, x + 9, y + 18); g.lineBetween(x + 5, y + 14, x + 13, y + 14); }
    else { g.lineBetween(x + 9, y + 18, x + 9, y + 10); g.lineBetween(x + 6, y + 13, x + 9, y + 10); g.lineBetween(x + 12, y + 13, x + 9, y + 10); }
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
    this.drawBar(c, v);
    this.drawFert(c, v.fert);
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

  // F04: hạt phân rắc xuống đất rồi lấp lánh nhẹ
  fertFx(i, color) {
    if (reduceMotion) return;
    const p = this.boxWorld(i);
    for (let k = 0; k < 12; k++) {
      const d = this.add.circle(p.x - 26 + k * 4.7, p.y - 58 - (k % 3) * 7, 2.6, color).setStrokeStyle(1, INK);
      this.tweens.add({ targets: d, y: p.y - 4 + (k % 2) * 3, delay: k * 30, duration: 380, ease: 'Quad.easeIn', onComplete: () => {
        this.tweens.add({ targets: d, alpha: 0, scale: 0.4, duration: 260, onComplete: () => d.destroy() });
      } });
    }
    const sp = this.makeSparkle().setPosition(p.x + 22, p.y - 40).setScale(0.9);
    this.time.delayedCall(1100, () => sp.destroy());
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
    this.flyToBag(p.x, p.y - 30, Phaser.Display.Color.HexStringToColor(color).color, qty, tx, ty);
  }


  drawFrontWall() {
    // Lan can phía trước, thấp và gần mắt người chơi
    const g = this.add.graphics();
    this.frontWall = g;
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
    const on = p.lamp;
    this.bulbs.forEach(b => {
      if (on > 0.02) { g.fillStyle(0xffd98a, 0.28 * on); g.fillCircle(b.x, b.y + 2, 9); }
      g.fillStyle(mixColor(0xf3ead7, 0xffe6a6, on), 1); g.lineStyle(1.5, INK, 1);
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

  // ----- F09 Thời tiết -----
  makeDarkClouds() {
    const list = [];
    const shapes = [[20, 40, 1.3], [120, 70, 1.1], [215, 36, 1.4], [320, 80, 1.15], [70, 120, 0.9], [270, 130, 1]];
    shapes.forEach(([x, y, s], i) => {
      const g = this.add.graphics({ x, y }).setAlpha(0);
      const col = i % 2 ? 0x8d96a8 : 0x9aa3b4;
      g.fillStyle(col, 1);
      g.fillEllipse(0, 0, 96 * s, 28 * s);
      g.fillEllipse(-20 * s, -11 * s, 46 * s, 34 * s);
      g.fillEllipse(16 * s, -15 * s, 54 * s, 40 * s);
      g.fillStyle(0x7d8697, 0.7); g.fillEllipse(4 * s, 8 * s, 84 * s, 12 * s);
      list.push(g);
      if (!reduceMotion) this.tweens.add({ targets: g, x: x + 18, duration: 11000 + i * 2300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    return list;
  }

  makeWeather() {
    this.wx = { gloom: 0, rain: 0, wind: 0 };
    this.weatherKind = 'sun';
    this.rainG = this.add.graphics();
    const r = rng(53);
    this.drops = Array.from({ length: 120 }, () => ({ x: r() * (W + 80) - 40, y: r() * H, len: 9 + r() * 8, v: 420 + r() * 160, end: 300 + r() * (H - 300) }));
    this.splashes = [];
    // Lá khô bay ngang khi trời gió
    this.leaves = Array.from({ length: 7 }, (_, i) => {
      const g = this.add.graphics();
      g.fillStyle(i % 3 ? 0x9cbf5a : 0xd9a35a, 1); g.lineStyle(1.4, INK, 1);
      g.fillEllipse(0, 0, 9, 4.5); g.strokeEllipse(0, 0, 9, 4.5);
      g.lineBetween(-4, 0, 4, 0);
      g.setVisible(false);
      return { g, x: r() * W, y: 120 + r() * 560, v: 70 + r() * 70, ph: r() * 6.28, spin: 2 + r() * 3 };
    });
  }

  // kind: 'sun' | 'cloud' | 'wind' | 'rain'. Chuyển dần trong vài giây; instant để vẽ ngay khi mở game
  setWeather(kind, instant) {
    const T = { sun: { gloom: 0, rain: 0, wind: 0 }, cloud: { gloom: 0.45, rain: 0, wind: 0.15 }, wind: { gloom: 0.15, rain: 0, wind: 1 }, rain: { gloom: 0.85, rain: 1, wind: 0.35 } }[kind] || { gloom: 0, rain: 0, wind: 0 };
    this.weatherKind = kind;
    if (this.wxTween) this.wxTween.stop();
    const done = () => { if (this.hour != null) this.applyTime(this.hour); };
    if (instant || reduceMotion) { Object.assign(this.wx, T); done(); this.drawStaticRain(); return; }
    this.wxTween = this.tweens.add({ targets: this.wx, ...T, duration: 3500, ease: 'Sine.easeInOut', onUpdate: done, onComplete: done });
  }

  // Người chọn giảm chuyển động: vẽ vệt mưa đứng yên, không có lá bay
  drawStaticRain() {
    if (!reduceMotion) return;
    const g = this.rainG; g.clear();
    if (this.wx.rain < 0.05) return;
    g.lineStyle(1.3, 0xdbe8fb, 0.45 * this.wx.rain);
    this.drops.forEach(d => g.lineBetween(d.x, d.y, d.x - 3, d.y + d.len));
  }

  update(time, delta) {
    if (reduceMotion || !this.wx) return;
    const dt = Math.min(0.1, delta / 1000), wx = this.wx, g = this.rainG;
    if (wx.rain > 0.01 || this.splashes.length) {
      g.clear();
      const slant = 50 + wx.wind * 110, col = mixColor(0xe6f1ff, 0x93a2c8, this.nightness || 0);
      if (wx.rain > 0.01) {
        g.lineStyle(1.3, col, 0.6 * wx.rain);
        const n = Math.round(this.drops.length * Math.min(1, wx.rain * 1.2));
        for (let i = 0; i < n; i++) {
          const d = this.drops[i];
          d.y += d.v * dt; d.x -= slant * dt;
          const k = d.len / d.v;
          g.lineBetween(d.x, d.y, d.x + slant * k, d.y - d.len);
          if (d.y > d.end) {
            if (d.end > 380 && this.splashes.length < 40) this.splashes.push({ x: d.x, y: d.end, t: 0 });
            d.y = -10 - Math.random() * 80; d.x = Math.random() * (W + 120) - 20; d.end = 300 + Math.random() * (H - 300);
          }
        }
      }
      g.lineStyle(1, col, 1);
      this.splashes = this.splashes.filter(sp => {
        sp.t += dt;
        const a = 1 - sp.t / 0.35;
        if (a <= 0) return false;
        g.lineStyle(1, col, 0.55 * a * Math.max(0.3, wx.rain));
        g.strokeEllipse(sp.x, sp.y, 2 + sp.t * 26, 1 + sp.t * 9);
        return true;
      });
    } else if (this.rainDrawn) { g.clear(); }
    this.rainDrawn = wx.rain > 0.01 || this.splashes.length > 0;

    const showLeaves = wx.wind > 0.05;
    this.leaves.forEach(l => {
      l.g.setVisible(showLeaves);
      if (!showLeaves) return;
      l.x += (l.v + wx.wind * 90) * dt; l.ph += dt * l.spin;
      if (l.x > W + 20) { l.x = -20; l.y = 120 + Math.random() * 560; }
      l.g.setPosition(l.x, l.y + Math.sin(l.ph) * 10).setRotation(Math.sin(l.ph * 0.7) * 1.4).setAlpha(Math.min(1, wx.wind * 1.4));
    });
  }

  // Vẽ lại trời, phố, đèn và lớp phủ màu cho một giờ trong ngày (giờ thập phân, ví dụ 18.75)
  applyTime(hour) {
    this.hour = hour;
    const base = skyAt(hour);
    this.nightness = base.stars;
    const p = withWeather(base, this.wx.gloom, this.wx.rain);
    this.darkClouds.forEach(c => c.setAlpha(this.wx.gloom));
    this.paintSky(p);
    this.paintCity(p);
    // Lớp phủ nhân màu: trắng = giữ nguyên, càng xa trắng thì cả sân càng tối hoặc ấm
    this.shade.setFillStyle(p.shade, 1).setAlpha(p.shade === 0xffffff ? 0 : 1);
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
    // 30 khung hình/giây là đủ cho game nhịp chậm, đỡ tốn pin và nóng máy (N06)
    fps: { target: 30, limit: 30 },
    scene: Rooftop
  });
}
