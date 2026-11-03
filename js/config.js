// Bảng dữ liệu của game. Muốn cân bằng lại game thì sửa số ở đây, không cần đụng vào code khác.
// Đơn vị thời gian là mili giây; dùng các hằng PHUT, GIO cho dễ đọc.

export const APP_VERSION = '0.4.0';

const PHUT = 60 * 1000;
const GIO = 60 * PHUT;
export const NGAY = 24 * GIO;

// ---------- Khung cảnh ----------
export const W = 390, H = 760, ZOOM = 2;
export const INK = 0x3b2f2a;

// Khung giờ theo giờ máy: sáng 5–11, chiều 11–17, tối 17–19, đêm 19–5
export const PERIOD_HOURS = { morning: 5, afternoon: 11, evening: 17, night: 19 };
export const periodOf = h =>
  (h >= PERIOD_HOURS.morning && h < PERIOD_HOURS.afternoon) ? 'morning'
  : (h >= PERIOD_HOURS.afternoon && h < PERIOD_HOURS.evening) ? 'afternoon'
  : (h >= PERIOD_HOURS.evening && h < PERIOD_HOURS.night) ? 'evening'
  : 'night';

// Màu từng khung giờ (chữ hiển thị nằm trong text.vi.js)
export const PERIODS = {
  morning:   { skyTop: 0x9fd3f0, skyBot: 0xfde9c8, far: 0xc6d6e4, mid: 0xa6bdd1, near: 0x88a1ba, lit: 0,    shade: [0xffffff, 0],    cloud: 1 },
  afternoon: { skyTop: 0x74b9e6, skyBot: 0xd6eefc, far: 0xbcd0e1, mid: 0x9ab3ca, near: 0x7c97b0, lit: 0,    shade: [0xffffff, 0],    cloud: 1 },
  evening:   { skyTop: 0x4d4f88, skyBot: 0xf2a070, far: 0x8f80a4, mid: 0x6f6491, near: 0x534d79, lit: 0.45, shade: [0xff9466, 0.12], cloud: 0.8 },
  night:     { skyTop: 0x121a38, skyBot: 0x34407a, far: 0x2b345f, mid: 0x222a50, near: 0x1a2045, lit: 0.85, shade: [0x1d2a66, 0.34], cloud: 0.35 }
};

// ---------- Trồng trọt (đã chốt: cây lớn theo giờ thực, chưa tưới lớn bằng 50%) ----------
export const UNWATERED_SPEED = 0.5;
// Tác dụng của một lần tưới. Đề xuất, sẽ chốt khi làm F02 ở chặng 1.
export const WATER_DURATION = 6 * GIO;

// Ngưỡng tiến độ của 4 giai đoạn hình: hạt, mầm, lớn, chín
export const STAGES = [
  { key: 'seed',   from: 0 },
  { key: 'sprout', from: 0.25 },
  { key: 'grown',  from: 0.6 },
  { key: 'ripe',   from: 1 }
];

// 6 cây MVP. Các con số là đề xuất ban đầu để chơi thử, chỉnh lại sau khi có phản hồi.
// growTime: thời gian từ gieo tới chín khi luôn được tưới
// harvests: số lần thu (1 = thu xong thùng trống lại)
// regrowTime: thời gian chín lại sau mỗi lần thu, với cây thu nhiều lần
export const CROPS = {
  rau_muong: { growTime: 30 * PHUT, yield: 3, harvests: 1, regrowTime: 0,         seedPrice: 5,  sellPrice: 4 },
  cai:       { growTime: 45 * PHUT, yield: 2, harvests: 1, regrowTime: 0,         seedPrice: 6,  sellPrice: 6 },
  hung_que:  { growTime: 1 * GIO,   yield: 3, harvests: 3, regrowTime: 40 * PHUT, seedPrice: 10, sellPrice: 3 },
  dua_leo:   { growTime: 4 * GIO,   yield: 2, harvests: 3, regrowTime: 2 * GIO,   seedPrice: 18, sellPrice: 9 },
  ot:        { growTime: 6 * GIO,   yield: 4, harvests: 4, regrowTime: 3 * GIO,   seedPrice: 22, sellPrice: 5 },
  ca_chua:   { growTime: 8 * GIO,   yield: 3, harvests: 4, regrowTime: 4 * GIO,   seedPrice: 30, sellPrice: 10 }
};

// ---------- Vật phẩm trong kho ----------
// kind: seed (hạt giống), produce (nông sản), animal (sản phẩm vật nuôi), supply (vật tư)
export const ITEMS = {
  hat_rau_muong: { kind: 'seed', crop: 'rau_muong' },
  hat_cai:       { kind: 'seed', crop: 'cai' },
  hat_hung_que:  { kind: 'seed', crop: 'hung_que' },
  hat_dua_leo:   { kind: 'seed', crop: 'dua_leo' },
  hat_ot:        { kind: 'seed', crop: 'ot' },
  hat_ca_chua:   { kind: 'seed', crop: 'ca_chua' },
  rau_muong:     { kind: 'produce' },
  cai:           { kind: 'produce' },
  hung_que:      { kind: 'produce' },
  dua_leo:       { kind: 'produce' },
  ot:            { kind: 'produce' },
  ca_chua:       { kind: 'produce' },
  trung_ga:      { kind: 'animal', sellPrice: 8 },
  thuc_an_ga:    { kind: 'supply', price: 4 }
};

export const INVENTORY_SLOTS = 12;   // số ô kho lúc đầu
export const STACK_SIZE = 99;        // số lượng tối đa trong một ô

// ---------- Khởi đầu ----------
export const START_BOXES = 4;
export const START_COINS = 120;
export const START_INVENTORY = { hat_rau_muong: 3, hat_cai: 2 };
