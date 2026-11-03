// Bảng dữ liệu của game. Muốn cân bằng lại game thì sửa số ở đây, không cần đụng vào code khác.
// Đơn vị thời gian là mili giây; dùng các hằng PHUT, GIO cho dễ đọc.

export const APP_VERSION = '0.10.1';

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
// Tác dụng của một lần tưới. Bản 0.9.3: 10 phút, cho khớp với cây lớn nhanh hơn:
// cây cơ bản tưới 1 lần là chín, dưa leo/ớt cần tưới lại 1 lần, cà chua 2 lần → có việc để làm trong lúc chờ.
export const WATER_DURATION = 10 * PHUT;

// Ngưỡng tiến độ của 4 giai đoạn hình: hạt, mầm, lớn, chín
export const STAGES = [
  { key: 'seed',   from: 0 },
  { key: 'sprout', from: 0.25 },
  { key: 'grown',  from: 0.6 },
  { key: 'ripe',   from: 1 }
];

// 6 cây MVP, chia 3 nhóm theo thời gian chín. Bản 0.9.3 rút ngắn thêm để một vòng gieo – tưới – thu – bán
// diễn ra ngay trong lúc chơi, người chơi không phải ngồi chờ:
//   Cơ bản (2–6 phút): rau muống, cải, húng quế
//   Hơi khó (12–18 phút): dưa leo, ớt
//   Lâu (30 phút): cà chua
// tier: nhóm cây 1 cơ bản, 2 hơi khó, 3 lâu — hạt giống hiện trong khung màu theo nhóm (xanh lá, xanh dương, tím)
// growTime: thời gian từ gieo tới chín khi luôn được tưới
// harvests: số lần thu (1 = thu xong thùng trống lại)
// regrowTime: thời gian chín lại sau mỗi lần thu, với cây thu nhiều lần
export const CROPS = {
  rau_muong: { tier: 1, growTime: 2 * PHUT,  yield: 3, harvests: 1, regrowTime: 0,         seedPrice: 5,  sellPrice: 4 },
  cai:       { tier: 1, growTime: 4 * PHUT,  yield: 2, harvests: 1, regrowTime: 0,         seedPrice: 6,  sellPrice: 6 },
  hung_que:  { tier: 1, growTime: 6 * PHUT,  yield: 3, harvests: 3, regrowTime: 4 * PHUT,  seedPrice: 10, sellPrice: 3 },
  dua_leo:   { tier: 2, growTime: 12 * PHUT, yield: 2, harvests: 3, regrowTime: 8 * PHUT,  seedPrice: 18, sellPrice: 9 },
  ot:        { tier: 2, growTime: 18 * PHUT, yield: 4, harvests: 4, regrowTime: 10 * PHUT, seedPrice: 22, sellPrice: 5 },
  ca_chua:   { tier: 3, growTime: 30 * PHUT, yield: 3, harvests: 4, regrowTime: 15 * PHUT, seedPrice: 30, sellPrice: 10 }
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
// Hàng xóm mở dần theo level (bản 0.10): level = level người chơi cần đạt để người đó bắt đầu ghé hỏi mua.
// likes = món hay đặt (7 phần 10 số đơn chọn trong đây nếu người chơi đã có món đó); bulk = hệ số số lượng
export const NEIGHBORS = {
  ba_tu:    { level: 1,  likes: ['rau_muong', 'cai', 'ca_chua'] },
  be_na:    { level: 1,  likes: ['trung_ga', 'dua_leo', 'ca_chua'] },
  co_mai:   { level: 4,  likes: ['hung_que', 'cai'] },
  anh_tuan: { level: 6,  likes: ['rau_muong', 'trung_ga'], bulk: 0.8 },
  chu_sau:  { level: 8,  likes: ['trung_ga'] },
  chi_hoa:  { level: 9,  likes: ['dua_leo', 'hung_que', 'ot'], bulk: 1.5 },
  ong_ba:   { level: 10, likes: ['ca_chua', 'ot'] }
};
export const LIKE_CHANCE = 0.7;

// ---------- Mua thêm thùng xốp (F14) ----------
// Giá thùng thứ 3, 4, 5, 6, 7, 8 (bản 0.10.1 bắt đầu với 2 thùng). Giá tính theo số thùng đang có,
// nên người chơi cũ đang có 4 thùng mua thùng thứ 5 vẫn đúng giá cũ (40 xu). Tối đa 8 thùng (vị trí trong scene.js)
export const BOX_PRICES = [25, 30, 40, 70, 110, 160];
export const BOX_PRICE_FROM = 2;   // BOX_PRICES[0] là giá khi đang có 2 thùng
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
export const START_BOXES = 2;   // bản 0.10.1: bắt đầu với 2 thùng, mua thêm từ level 2
export const START_COINS = 120;
export const START_INVENTORY = { hat_rau_muong: 3, hat_cai: 2, thuc_an_ga: 5 };
export const START_FEED_FOR_OLD_SAVES = 5;   // tặng người chơi bản cũ khi chuồng gà mở

// ---------- Level (bản 0.10) ----------
// Điểm kinh nghiệm (KN) có được từ việc chăm sân. Không bao giờ mất điểm, không phạt.
//   Thu hoạch: theo nhóm cây (tier) · giao đơn hàng xóm nhiều nhất · việc vặt hằng ngày ít
export const XP = {
  harvest: { 1: 4, 2: 7, 3: 12 },   // mỗi lần thu, theo tier của cây
  deliver: 15,                      // mỗi đơn hàng xóm
  feed: 3,                          // cho gà ăn
  eggs: 2,                          // mỗi lần nhặt trứng
  dust: 1                           // mỗi vệt bụi quét
};

// 10 level đầu. xp: tổng điểm KN cần để đạt level đó (lên nhanh lúc đầu, chậm dần).
// unlock: mở khóa · reward: quà khi lên level (xu và vật phẩm; túi đầy thì đổi vật phẩm ra xu)
//   seeds: hạt bán ở tiệm · neighbor: hàng xóm bắt đầu đặt đơn · boxes: mua thêm thùng xốp
//   bag: nâng cấp túi đồ · chickens: thêm gà · decor: món trang trí sân
export const LEVELS = [
  { xp: 0,   unlock: { seeds: ['hat_rau_muong', 'hat_cai'], neighbors: ['ba_tu', 'be_na'] } },
  { xp: 20,  unlock: { seeds: ['hat_hung_que'], boxes: true },              reward: { coins: 20, items: { hat_hung_que: 2 } } },
  { xp: 50,  unlock: { seeds: ['hat_dua_leo'] },                            reward: { coins: 25, items: { hat_dua_leo: 2 } } },
  { xp: 90,  unlock: { neighbors: ['co_mai'] },                             reward: { coins: 30 } },
  { xp: 140, unlock: { seeds: ['hat_ot'], bag: true },                      reward: { coins: 35, items: { hat_ot: 2 } } },
  { xp: 200, unlock: { neighbors: ['anh_tuan'] },                           reward: { coins: 40, items: { thuc_an_ga: 5 } } },
  { xp: 270, unlock: { seeds: ['hat_ca_chua'] },                            reward: { coins: 45, items: { hat_ca_chua: 2 } } },
  { xp: 350, unlock: { neighbors: ['chu_sau'], chickens: 1 },               reward: { coins: 50 } },
  { xp: 440, unlock: { neighbors: ['chi_hoa'] },                            reward: { coins: 55 } },
  { xp: 540, unlock: { neighbors: ['ong_ba'], decor: 'hoa_giay' },          reward: { coins: 60 } }
];
export const MAX_LEVEL = LEVELS.length;
