// Bảng dữ liệu của game. Muốn cân bằng lại game thì sửa số ở đây, không cần đụng vào code khác.
// Đơn vị thời gian là mili giây; dùng các hằng PHUT, GIO cho dễ đọc.

export const APP_VERSION = '0.16.1';

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
  // F07: gà thân thiết đẻ trứng ngon, bán giá cao hơn; hàng xóm không đặt món này
  trung_ga_ngon: { kind: 'animal', unit: 'qua', sellPrice: 14, noOrder: true },
  thuc_an_ga:    { kind: 'supply', unit: 'bao', price: 4 },
  // F06 Vật nuôi khác (bản 0.14): thức ăn mua ở tiệm và sản phẩm, xem PENS bên dưới
  co_kho:        { kind: 'supply', unit: 'bo', price: 3 },
  hat_ke:        { kind: 'supply', unit: 'goi', price: 4 },
  cam_ca:        { kind: 'supply', unit: 'goi', price: 3 },
  long_tho:      { kind: 'animal', unit: 'tum', sellPrice: 15 },
  trung_bo_cau:  { kind: 'animal', unit: 'qua', sellPrice: 10 },
  ca_con:        { kind: 'animal', unit: 'con', sellPrice: 16 },
  // F04 Phân bón (bản 0.12): mỗi lứa cây bón một gói, xem FERTILIZERS bên dưới
  phan_lon_nhanh: { kind: 'supply', unit: 'goi', price: 5 },
  phan_sai_qua:   { kind: 'supply', unit: 'goi', price: 8 }
};

// ---------- Bếp nhỏ (F16, bản 0.16) ----------
// Mở ở level 6 (nút "Bếp" trên thanh công cụ). Một bếp nấu một món mỗi lần; nấu xong món nằm trên bếp chờ lấy.
// needs: nguyên liệu trong túi · time: thời gian nấu · sell: giá anh Bảo mua (luôn cao hơn tổng giá nguyên liệu)
// unit: đĩa hoặc tô. Món nào mở ở level nào ghi trong LEVELS (unlock.recipes).
export const RECIPES = {
  rau_muong_xao:        { needs: { rau_muong: 3 },              time: 3 * PHUT, sell: 18, unit: 'dia' },
  canh_cai:             { needs: { cai: 3 },                    time: 3 * PHUT, sell: 26, unit: 'to' },
  trung_chien_hung_que: { needs: { trung_ga: 2, hung_que: 1 },  time: 4 * PHUT, sell: 28, unit: 'dia' },
  dua_leo_tron:         { needs: { dua_leo: 2, ot: 1 },         time: 4 * PHUT, sell: 34, unit: 'dia' },
  canh_ca_chua_trung:   { needs: { ca_chua: 2, trung_ga: 2 },   time: 6 * PHUT, sell: 52, unit: 'to' },
  trung_bo_cau_hap:     { needs: { trung_bo_cau: 3, hung_que: 1 }, time: 6 * PHUT, sell: 48, unit: 'dia' }
};
// Mỗi món là một vật phẩm trong túi (loại 'dish'), bán ở tiệm.
// Bản 0.16.1: hàng xóm đặt cả món nấu (sau khi người chơi đã nấu món đó ít nhất một lần), mỗi đơn 1–2 phần,
// trên dây phơi có nhiều nhất DISH_ORDERS_MAX đơn món ăn cùng lúc để đơn nông sản vẫn là chính.
Object.entries(RECIPES).forEach(([id, r]) => { ITEMS[id] = { kind: 'dish', unit: r.unit, sellPrice: r.sell }; });
export const DISH_ORDERS_MAX = 1;
export const DISH_ORDER_QTY = [1, 2];

// ---------- Phân bón (F04, bản 0.12) ----------
// Chạm cây đang lớn để bón. Mỗi lứa chỉ bón một lần (một trong hai loại); thu hoạch xong lứa mới bón tiếp được.
//   grow:  cây lớn nhanh gấp `speed` lần cho tới khi chín (cả lúc đã tưới lẫn lúc khô đất)
//   yield: lần thu của lứa này thêm `bonus` phần sản lượng, làm tròn, ít nhất 1
// Giá đặt để phân lớn nhanh đáng dùng cho cây lâu, phân sai quả lời với cây quả đắt (cà chua, ớt).
export const FERTILIZERS = {
  phan_lon_nhanh: { effect: 'grow', speed: 1.5, color: 0x8cc63f },
  phan_sai_qua:   { effect: 'yield', bonus: 0.5, color: 0xf08a3c }
};

// ---------- Tiệm tạp hóa anh Bảo (F11) ----------
export const SHOP_BUY = ['hat_rau_muong', 'hat_cai', 'hat_hung_que', 'hat_dua_leo', 'hat_ot', 'hat_ca_chua', 'thuc_an_ga', 'phan_lon_nhanh', 'phan_sai_qua', 'co_kho', 'hat_ke', 'cam_ca'];
export const SHOP_SELL_KINDS = ['produce', 'animal', 'dish'];
// Mỗi lần nâng cấp túi đồ thêm 4 ô; giá tăng dần
export const BAG_UPGRADES = [{ slots: 4, price: 60 }, { slots: 4, price: 120 }, { slots: 4, price: 200 }];

// ---------- Đơn hàng hàng xóm (F12) ----------
export const ORDER_SLOTS = 3;          // luôn có 3 đơn trên dây phơi
export const ORDER_BONUS = 1.6;        // đơn hàng trả hơn bán ở tiệm 60%
export const ORDER_EXPIRE = 3 * NGAY;  // đơn để quá 3 ngày: người đặt đã mua ngoài chợ, đơn mới thay vào, không phạt
// Hàng xóm mở dần theo level (bản 0.10): level = level người chơi cần đạt để người đó bắt đầu ghé hỏi mua.
// likes = món hay đặt (7 phần 10 số đơn chọn trong đây nếu người chơi đã có món đó); bulk = hệ số số lượng
export const NEIGHBORS = {
  // Món nấu (bản 0.16.1) đứng cuối danh sách likes: mỗi người thích một món
  ba_tu:    { level: 1,  likes: ['rau_muong', 'cai', 'ca_chua', 'canh_ca_chua_trung'] },
  be_na:    { level: 1,  likes: ['trung_ga', 'dua_leo', 'ca_chua', 'ca_con', 'trung_chien_hung_que'] },
  co_mai:   { level: 4,  likes: ['hung_que', 'cai', 'long_tho', 'dua_leo_tron'] },
  anh_tuan: { level: 6,  likes: ['rau_muong', 'trung_ga', 'rau_muong_xao'], bulk: 0.8 },
  chu_sau:  { level: 8,  likes: ['trung_ga', 'canh_cai'] },
  chi_hoa:  { level: 9,  likes: ['dua_leo', 'hung_que', 'ot', 'dua_leo_tron'], bulk: 1.5 },
  ong_ba:   { level: 10, likes: ['ca_chua', 'ot', 'trung_bo_cau', 'trung_bo_cau_hap'] }
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

// ---------- Thân thiết với gà (F07, bản 0.13) ----------
// Cả đàn gà có chung một mức thân thiết 0 → 100 điểm, hiện thành 0–5 tim (mỗi tim 20 điểm).
// Mỗi ngày (ngày ảo của chuồng gà) chăm gà bằng ba việc, mỗi việc tính một lần trong ngày:
//   cho ăn (máng) · đổ nước (bình nước) · vuốt ve từng con gà
// Ngày nào không chăm gì thì giảm nhẹ LOVE_DECAY điểm; không bao giờ phạt nặng, gà không bỏ đi.
// Tim càng cao, càng nhiều trứng là trứng ngon (LOVE_GOOD_SHARE[số tim] = tỉ lệ trứng ngon).
export const LOVE_MAX = 100;
export const LOVE_PER_HEART = 20;
export const LOVE_GAIN = { feed: 4, water: 4, pet: 3 };   // pet: mỗi con gà
export const LOVE_DECAY = 3;                              // mỗi ngày bỏ không chăm
export const LOVE_GOOD_SHARE = [0, 0.15, 0.3, 0.45, 0.6, 0.75];

// ---------- Vật nuôi khác (F06, bản 0.14) ----------
// Dùng chung khung của gà: mỗi ngày (ngày ảo) cho ăn một lần, sau `delay` thì có `yield` sản phẩm chờ nhặt.
// Không cho ăn thì không có sản phẩm, không bệnh, không chết; sản phẩm chưa nhặt không mất.
// Chạm chuồng: có sản phẩm thì nhặt, chưa ăn thì cho ăn. Mở theo level (LEVELS: unlock.pen).
export const PENS = {
  tho:    { feed: 'co_kho', product: 'long_tho',     yield: 2, delay: 3 * GIO },
  bo_cau: { feed: 'hat_ke', product: 'trung_bo_cau', yield: 3, delay: 2 * GIO },
  ca:     { feed: 'cam_ca', product: 'ca_con',       yield: 2, delay: 4 * GIO }
};

// ---------- Quét bụi sân thượng (F23) ----------
// Cứ 3–4 ngày (thời gian game) sân lại bám vài vệt bụi; chạm từng vệt để quét, mỗi vệt được thưởng xu.
export const DUST_INTERVAL_MIN = 3 * NGAY;
export const DUST_INTERVAL_MAX = 4 * NGAY;
export const DUST_SPOTS_MIN = 3, DUST_SPOTS_MAX = 4;
export const DUST_SPOT_COUNT = 8;     // số chỗ có thể bám bụi trên sân (toạ độ nằm trong scene.js)
export const DUST_REWARD = 5;         // xu cho mỗi vệt bụi

// ---------- Thời tiết (F09, bản 0.11) ----------
// Mỗi ngày chia 4 khối 6 giờ (theo thời gian game); mỗi khối bốc thăm một kiểu trời theo tỉ lệ dưới đây.
// Khối "mưa" có 2–3 trận mưa rào ngắn, giữa các trận trời nhiều mây. Mưa tưới mọi cây như bình tưới,
// tạnh rồi đất còn ẩm thêm RAIN_WET_AFTER. Gió và mây chỉ để ngắm, không đổi luật chơi.
// Thời tiết bắt đầu sau khi xong hướng dẫn của bà Tư.
export const WEATHER_BLOCK = 6 * GIO;
export const WEATHER_CHANCE = { sun: 0.35, cloud: 0.2, wind: 0.2, rain: 0.25 };
export const RAIN_SHOWERS = [2, 3];                 // số trận mưa trong một khối mưa (ít nhất, nhiều nhất)
export const RAIN_LEN = [15 * PHUT, 40 * PHUT];     // mỗi trận mưa dài bao lâu
export const RAIN_WET_AFTER = WATER_DURATION;       // mưa tạnh rồi đất còn ẩm thêm bao lâu
export const FORECAST_AHEAD = 3 * GIO;              // chạm đồng hồ: báo trước mưa trong khoảng này

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
  dust: 1,                          // mỗi vệt bụi quét
  pet: 1,                           // vuốt ve một con gà (F07)
  penFeed: 3,                       // cho thỏ, bồ câu, cá ăn (F06)
  penCollect: 3,                    // nhặt sản phẩm của thỏ, bồ câu, cá (F06)
  cook: 5,                          // lấy một món vừa nấu xong (F16)
  water: 2                          // đổ nước cho gà (F07)
};

// 10 level đầu. xp: tổng điểm KN cần để đạt level đó (lên nhanh lúc đầu, chậm dần).
// unlock: mở khóa · reward: quà khi lên level (xu và vật phẩm; túi đầy thì đổi vật phẩm ra xu)
//   seeds: hạt bán ở tiệm · neighbor: hàng xóm bắt đầu đặt đơn · boxes: mua thêm thùng xốp
//   bag: nâng cấp túi đồ · chickens: thêm gà · decor: món trang trí sân · items: món khác bán ở tiệm (phân bón, thức ăn)
//   pen: chuồng vật nuôi mới (F06) · kitchen: bếp nhỏ · recipes: món nấu được (F16)
export const LEVELS = [
  { xp: 0,   unlock: { seeds: ['hat_rau_muong', 'hat_cai'], neighbors: ['ba_tu', 'be_na'] } },
  { xp: 20,  unlock: { seeds: ['hat_hung_que'], boxes: true },              reward: { coins: 20, items: { hat_hung_que: 2 } } },
  { xp: 50,  unlock: { seeds: ['hat_dua_leo'], items: ['phan_lon_nhanh'] }, reward: { coins: 25, items: { hat_dua_leo: 2, phan_lon_nhanh: 2 } } },
  { xp: 90,  unlock: { neighbors: ['co_mai'], items: ['phan_sai_qua'] },    reward: { coins: 30, items: { phan_sai_qua: 2 } } },
  { xp: 140, unlock: { seeds: ['hat_ot'], bag: true },                      reward: { coins: 35, items: { hat_ot: 2 } } },
  { xp: 200, unlock: { neighbors: ['anh_tuan'], kitchen: true, recipes: ['rau_muong_xao', 'canh_cai', 'trung_chien_hung_que', 'dua_leo_tron'] }, reward: { coins: 40, items: { thuc_an_ga: 5 } } },
  { xp: 270, unlock: { seeds: ['hat_ca_chua'], recipes: ['canh_ca_chua_trung'] }, reward: { coins: 45, items: { hat_ca_chua: 2 } } },
  { xp: 350, unlock: { neighbors: ['chu_sau'], chickens: 1 },               reward: { coins: 50 } },
  { xp: 440, unlock: { neighbors: ['chi_hoa'] },                            reward: { coins: 55 } },
  { xp: 540, unlock: { neighbors: ['ong_ba'], decor: 'hoa_giay' },          reward: { coins: 60 } },
  // Bản 0.14: thêm level 11–13 cho vật nuôi mới (F06)
  { xp: 650, unlock: { pen: 'tho', items: ['co_kho'] },                     reward: { coins: 65, items: { co_kho: 5 } } },
  { xp: 770, unlock: { pen: 'bo_cau', items: ['hat_ke'], recipes: ['trung_bo_cau_hap'] }, reward: { coins: 70, items: { hat_ke: 5 } } },
  { xp: 900, unlock: { pen: 'ca', items: ['cam_ca'] },                      reward: { coins: 80, items: { cam_ca: 5 } } }
];
export const MAX_LEVEL = LEVELS.length;

// ---------- Trang trí sân (bản 0.15) ----------
// Mỗi món mua một lần, đặt cố định vào chỗ riêng trên sân (DECOR_SLOTS trong scene.js) và cộng "điểm sân đẹp".
// price 0 = không bán, là quà level (chậu hoa giấy ở level 10). Nhóm "Trang trí" ở tiệm mở từ DECOR_LEVEL.
export const DECOR_LEVEL = 10;
export const DECOR = {
  hoa_giay:  { points: 2, price: 0 },
  ghe_da:    { points: 3, price: 80 },
  den_long:  { points: 4, price: 120 },
  cay_canh:  { points: 4, price: 150 },
  chum_nuoc: { points: 5, price: 200 }
};
// Mốc điểm sân đẹp và phần thưởng (giữ mãi khi đã đạt):
//   heart: mỗi đơn hàng thêm 1 tim thân thiết · coins: đơn hàng trả thêm 10% xu · slot: thêm 1 ô đơn hàng (4 thay vì 3)
export const BEAUTY_PERKS = [
  { points: 5,  perk: 'heart' },
  { points: 10, perk: 'coins', bonus: 0.1 },
  { points: 18, perk: 'slot' }
];
