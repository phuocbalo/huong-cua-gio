// Bảng dữ liệu của game. Muốn cân bằng lại game thì sửa số ở đây, không cần đụng vào code khác.
// Đơn vị thời gian là mili giây; dùng các hằng PHUT, GIO cho dễ đọc.

export const APP_VERSION = '0.9.0';

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
//   lit: tỉ lệ cửa sổ sáng đèn · shade: màu phủ lên cả sân (trắng = giữ nguyên)
//   cloud: độ rõ của mây · lamp: độ sáng đèn dây · stars: độ rõ của sao
export const PERIODS = {
  morning:   { skyTop: 0x9fd3f0, skyBot: 0xfde9c8, far: 0xc6d6e4, mid: 0xa6bdd1, near: 0x88a1ba, lit: 0,    shade: 0xffffff, cloud: 1,    lamp: 0, stars: 0 },
  afternoon: { skyTop: 0x74b9e6, skyBot: 0xd6eefc, far: 0xbcd0e1, mid: 0x9ab3ca, near: 0x7c97b0, lit: 0,    shade: 0xffffff, cloud: 1,    lamp: 0, stars: 0 },
  evening:   { skyTop: 0x4d4f88, skyBot: 0xf2a070, far: 0x8f80a4, mid: 0x6f6491, near: 0x534d79, lit: 0.45, shade: 0xffdcc8, cloud: 0.8,  lamp: 1, stars: 0.2 },
  night:     { skyTop: 0x121a38, skyBot: 0x34407a, far: 0x2b345f, mid: 0x222a50, near: 0x1a2045, lit: 0.85, shade: 0x9aa0c4, cloud: 0.35, lamp: 1, stars: 1 }
};

// Mốc chuyển màu trong ngày (giờ thập phân). Giữa hai mốc, màu trộn dần từ khung này sang khung kia,
// ví dụ 4:30 → 6:00 trời sáng dần từ "đêm" sang "sáng".
export const SKY_KEYS = [
  { h: 0,    p: 'night' },
  { h: 4.5,  p: 'night' },
  { h: 6,    p: 'morning' },
  { h: 10.5, p: 'morning' },
  { h: 12,   p: 'afternoon' },
  { h: 16.5, p: 'afternoon' },
  { h: 17.5, p: 'evening' },
  { h: 18.5, p: 'evening' },
  { h: 19.5, p: 'night' },
  { h: 24,   p: 'night' }
];
// Mặt trời mọc và lặn (giờ thập phân), mặt trăng đi phần còn lại
export const SUNRISE = 5.5, SUNSET = 18.5;

// ---------- Trồng trọt (đã chốt: cây lớn theo giờ thực, chưa tưới lớn bằng 50%) ----------
export const UNWATERED_SPEED = 0.5;
// Tác dụng của một lần tưới. Đã chốt 2 giờ để người chơi quay lại chăm cây vài lần mỗi ngày.
export const WATER_DURATION = 2 * GIO;

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
// unit: đơn vị đếm khi nói chuyện ("4 bó rau muống", "2 quả trứng gà"); chữ nằm trong text.vi.js
// Giá: hạt giống lấy seedPrice, nông sản lấy sellPrice trong CROPS; món khác ghi ngay ở đây.
export const ITEMS = {
  hat_rau_muong: { kind: 'seed', crop: 'rau_muong', unit: 'goi' },
  hat_cai:       { kind: 'seed', crop: 'cai', unit: 'goi' },
  hat_hung_que:  { kind: 'seed', crop: 'hung_que', unit: 'goi' },
  hat_dua_leo:   { kind: 'seed', crop: 'dua_leo', unit: 'goi' },
  hat_ot:        { kind: 'seed', crop: 'ot', unit: 'goi' },
  hat_ca_chua:   { kind: 'seed', crop: 'ca_chua', unit: 'goi' },
  rau_muong:     { kind: 'produce', unit: 'bo' },
  cai:           { kind: 'produce', unit: 'bo' },
  hung_que:      { kind: 'produce', unit: 'bo' },
  dua_leo:       { kind: 'produce', unit: 'trai' },
  ot:            { kind: 'produce', unit: 'trai' },
  ca_chua:       { kind: 'produce', unit: 'trai' },
  trung_ga:      { kind: 'animal', unit: 'qua', sellPrice: 8 },
  thuc_an_ga:    { kind: 'supply', unit: 'bao', price: 4 }
};

// ---------- Tiệm tạp hóa anh Bảo (F11) ----------
export const SHOP_BUY = ['hat_rau_muong', 'hat_cai', 'hat_hung_que', 'hat_dua_leo', 'hat_ot', 'hat_ca_chua', 'thuc_an_ga'];
export const SHOP_SELL_KINDS = ['produce', 'animal'];
// Mỗi lần nâng cấp túi đồ thêm 4 ô; giá tăng dần
export const BAG_UPGRADES = [{ slots: 4, price: 60 }, { slots: 4, price: 120 }, { slots: 4, price: 200 }];

// ---------- Đơn hàng hàng xóm (F12) ----------
export const ORDER_SLOTS = 3;          // luôn có 3 đơn trên dây phơi
export const ORDER_BONUS = 1.6;        // đơn hàng trả hơn bán ở tiệm 60%
export const ORDER_EXPIRE = 3 * NGAY;  // đơn để quá 3 ngày: người đặt đã mua ngoài chợ, đơn mới thay vào, không phạt
// Hàng xóm mở dần: unlock = tổng số đơn đã giao để người đó bắt đầu ghé hỏi mua.
// likes = món hay đặt (7 phần 10 số đơn chọn trong đây nếu người chơi đã có món đó); bulk = hệ số số lượng
export const NEIGHBORS = {
  ba_tu:    { unlock: 0,  likes: ['rau_muong', 'cai', 'ca_chua'] },
  be_na:    { unlock: 0,  likes: ['trung_ga', 'dua_leo', 'ca_chua'] },
  co_mai:   { unlock: 3,  likes: ['hung_que', 'cai'] },
  anh_tuan: { unlock: 6,  likes: ['rau_muong', 'trung_ga'], bulk: 0.8 },
  chu_sau:  { unlock: 10, likes: ['trung_ga'] },
  chi_hoa:  { unlock: 15, likes: ['dua_leo', 'hung_que', 'ot'], bulk: 1.5 },
  ong_ba:   { unlock: 20, likes: ['ca_chua', 'ot'] }
};
export const LIKE_CHANCE = 0.7;

// ---------- Mua thêm thùng xốp (F14) ----------
// Giá thùng thứ 5, 6, 7, 8. Tối đa 8 thùng cho vừa sân (vị trí trong scene.js)
export const BOX_PRICES = [40, 70, 110, 160];
export const MAX_BOXES = 8;

export const INVENTORY_SLOTS = 12;   // số ô kho lúc đầu
export const STACK_SIZE = 99;        // số lượng tối đa trong một ô

// ---------- Chăn nuôi (F05) ----------
// Mỗi ngày đổ thức ăn một lần; gà đã ăn thì đẻ sau LAY_DELAY, mỗi con một quả.
// Không cho ăn thì gà ngừng đẻ, không bệnh, không chết. Trứng chưa nhặt không mất.
export const START_CHICKENS = 2;
export const LAY_DELAY = 2 * GIO;     // đề xuất: đẻ 2 giờ sau khi ăn, cùng nhịp với tưới cây
export const EGGS_PER_CHICKEN = 1;
export const FEED_ITEM = 'thuc_an_ga';

// ---------- Quét bụi sân thượng (F23) ----------
// Cứ 3–4 ngày (thời gian game) sân lại bám vài vệt bụi; chạm từng vệt để quét, mỗi vệt được thưởng xu.
export const DUST_INTERVAL_MIN = 3 * NGAY;
export const DUST_INTERVAL_MAX = 4 * NGAY;
export const DUST_SPOTS_MIN = 3, DUST_SPOTS_MAX = 4;
export const DUST_SPOT_COUNT = 8;     // số chỗ có thể bám bụi trên sân (toạ độ nằm trong scene.js)
export const DUST_REWARD = 5;         // xu cho mỗi vệt bụi

// ---------- Khởi đầu ----------
export const START_BOXES = 4;
export const START_COINS = 120;
export const START_INVENTORY = { hat_rau_muong: 3, hat_cai: 2, thuc_an_ga: 5 };
export const START_FEED_FOR_OLD_SAVES = 5;   // tặng người chơi bản cũ khi chuồng gà mở
