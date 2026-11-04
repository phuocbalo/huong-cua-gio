# huong-cua-gio

Game nông trại thư giãn trên sân thượng giữa phố (tên tạm: **Sân Thượng Xanh**). Chơi trên trình duyệt, cài được lên màn hình chính, chạy offline.

Bản chơi thử: https://phuocbalo.github.io/huong-cua-gio/

## Cấu trúc

| File | Vai trò |
| --- | --- |
| `index.html` | Khung trang: thanh trên, thanh công cụ, bảng thông tin bản thử |
| `css/style.css` | Giao diện |
| `js/main.js` | Khởi động: đọc bản lưu → chạy đồng hồ → dựng giao diện → vẽ cảnh |
| `js/config.js` | **Bảng dữ liệu game**: 6 cây, vật phẩm, giá, thời gian lớn, số ô kho. Cân bằng game thì sửa ở đây |
| `js/text.vi.js` | **Mọi câu chữ tiếng Việt**. Thêm tiếng Anh: sao chép thành `text.en.js` rồi dịch |
| `js/save.js` | Lưu dữ liệu trong máy (IndexedDB), có số phiên bản để nâng cấp bản lưu cũ |
| `js/clock.js` | Đồng hồ game: tính thời gian đã trôi khi tắt game, không chạy lùi khi giờ máy bị lùi |
| `js/farm.js` | Luật trồng trọt: gieo, tưới, tính tiến độ, thu hoạch, bón phân (F04) |
| `js/inventory.js` | Luật túi đồ: số ô, gộp cùng loại, đầy thì từ chối |
| `js/icons.js` | Biểu tượng vật phẩm |
| `js/coop.js` | Luật nuôi gà: cho ăn mỗi ngày, đẻ trứng, nhặt trứng; thân thiết (F07): đổ nước, vuốt ve, tim, trứng ngon |
| `js/dust.js` | Luật bụi sân thượng: bám bụi sau 3–4 ngày, quét để nhận xu |
| `js/shop.js` | Luật tiệm anh Bảo: giá mua bán, mua thùng, nâng cấp túi đồ |
| `js/orders.js` | Luật đơn hàng hàng xóm: 3 đơn, giao hàng, đổi đơn, tự đổi sau 3 ngày, 7 hàng xóm mở dần, điểm thân thiết |
| `js/ui-economy.js` | Giao diện tiệm, bảng đơn hàng, xác nhận mua thùng |
| `js/tutorial.js` | Hướng dẫn mở đầu cùng bà Tư: gieo → tưới → thu → bán → cho gà ăn; không bỏ qua được, chỉ bấm được chỗ mũi tên chỉ, mở lại giữa chừng vẫn tiếp tục |
| `js/audio.js` | Nhạc lo-fi và tiếng động tạo bằng code (không có file âm thanh), đổi nhạc ngày/đêm |
| `js/ui-settings.js` | Cài đặt: âm lượng, xuất/nhập file lưu, xem lại hướng dẫn, xóa dữ liệu, thống kê |
| `js/level.js` | Luật level: điểm kinh nghiệm, lên level, mở khóa, quà (dữ liệu 10 level trong `config.js`) |
| `js/ui-level.js` | Giao diện level: viên level trên thanh trạng thái, con đường level, bảng chúc mừng |
| `js/pens.js` | Luật vật nuôi khác (F06): thỏ, bồ câu, bể cá — cho ăn mỗi ngày, sản phẩm chờ nhặt, mở ở level 11–13 |
| `js/weather.js` | Luật thời tiết (F09): lịch nắng, mây, gió, mưa theo khối 6 giờ, tính từ một con số lưu trong bản lưu; mưa tưới cây kể cả lúc tắt game |
| `js/daylight.js` | Màu trời, phố, đèn cho từng giờ trong ngày; chuyển dần giữa các khung giờ |
| `js/scene.js` | Cảnh sân thượng vẽ bằng Phaser (hình tạm) |
| `tests/` | Kiểm thử luật chơi: `node tests/farm.test.mjs`, `node tests/daylight.test.mjs`, `node tests/coop.test.mjs`, `node tests/dust.test.mjs`, `node tests/economy.test.mjs`, `node tests/settings.test.mjs`, `node tests/tutorial.test.mjs`, `node tests/level.test.mjs`, `node tests/weather.test.mjs`, `node tests/fertilizer.test.mjs`, `node tests/love.test.mjs`, `node tests/pens.test.mjs` |
| `js/ui.js` | Điều khiển giao diện HTML |
| `js/pwa.js` | Bật chơi offline và theo dõi trạng thái |
| `manifest.webmanifest` | Khai báo PWA: tên app, biểu tượng, mở toàn màn hình, màn dọc |
| `sw.js` | Bộ nhớ offline. Tăng `VERSION` mỗi lần phát hành |
| `vendor/phaser-3.80.1.min.js` | Thư viện Phaser, để trong repo để chạy được khi tắt mạng |
| `icons/` | Biểu tượng app 180, 192, 512 px |

Khi phát hành bản mới: tăng `APP_VERSION` trong `js/config.js` và `VERSION` trong `sw.js` cho giống nhau; thêm file mới vào danh sách `CORE` trong `sw.js`.

## Kiểm thử chặng 0

- [ ] Mở link trên Chrome Android, chọn "Thêm vào màn hình chính" hoặc "Cài đặt ứng dụng"; mở từ biểu tượng thì game chạy toàn màn hình.
- [ ] Mở link trên Safari iPhone, bấm Chia sẻ → "Thêm vào MH chính"; mở từ biểu tượng thì không còn thanh địa chỉ.
- [ ] Mở game một lần khi có mạng, đợi thông báo "Đã lưu game vào máy", bật chế độ máy bay, đóng hẳn rồi mở lại: game vẫn lên.
- [ ] Chạm nhãn "Bản thử" để xem: Mở dạng (Trình duyệt / App trên màn hình chính), Chơi offline (Sẵn sàng), Mạng.
- [ ] Mở trên máy tính: cảnh nằm giữa, không bị kéo giãn.
- [ ] **Lưu dữ liệu:** trong bảng "Bản thử", bấm "Thêm 10 xu" vài lần, đóng hẳn trình duyệt hoặc app, mở lại: số xu vẫn đúng.
- [ ] **Đồng hồ khi vắng:** đóng game, đợi vài phút (hoặc chỉnh giờ máy tiến lên 1 giờ), mở lại: thông báo "Chào mừng trở lại. Bạn đã vắng …"; "Thời gian game đã chạy" tăng đúng phần đó.
- [ ] **Đồng hồ không chạy lùi:** chỉnh giờ máy lùi 2 giờ, mở game: thông báo "Giờ máy vừa bị lùi"; "Thời gian game đã chạy" không giảm; "Giờ máy bị lùi" tăng 1 lần.
- [ ] **Xóa dữ liệu:** bấm "Xóa dữ liệu" một lần thì nút đổi thành "Bấm lần nữa để xóa hẳn"; đợi 4 giây nút trở lại như cũ; bấm hai lần liền thì số xu về 120.

## Kiểm thử chặng 1 – Trồng trọt

Dùng nút "Tua +10 phút" / "Tua +1 giờ" và "Thêm mỗi loại 3 hạt" trong bảng "Bản thử" để không phải chờ.

- [ ] **F10 Túi đồ:** bấm "Túi đồ": thấy hạt rau muống ×3, hạt cải ×2, dòng "Đang dùng 2/12 ô"; tab "Hạt giống" và "Nông sản" lọc đúng.
- [ ] **F01 Gieo hạt:** chạm thùng trống → bảng chọn hạt; loại hết hạt hiện mờ, nút "Hết hạt" không bấm được. Gieo xong, số hạt trong túi giảm 1.
- [ ] **F01** Chạm thùng đã có cây (đã tưới; cây khô thì chạm sẽ tưới theo F02): không mở bảng chọn hạt, hiện "Thùng đã có …, chín sau khoảng …".
- [ ] **F01** Tua nhanh: cây đi đủ 4 hình: hạt → mầm → lớn → chín (có ánh lấp lánh).
- [ ] **F02 Tưới nước:** cây chưa tưới có đất màu nhạt và bong bóng giọt nước. Chạm cây khô để tưới, hoặc bấm "Bình tưới" để tưới mọi cây khô cùng lúc. Đất chuyển màu sẫm.
- [ ] **F02** Gieo 2 cây cùng loại, chỉ tưới 1 cây: cây được tưới chín trước. Cây không tưới bao lâu cũng không chết.
- [ ] **F03 Thu hoạch:** chạm cây chín: nông sản bay về nút Túi đồ, hiện "+3 …". Rau muống, cải thu xong thì thùng trống; húng quế, dưa leo, ớt, cà chua quay về hình "lớn" rồi chín lại.
- [ ] **F10** Bấm "Lấp đầy túi" trong bảng "Bản thử" (các ô trống được lấp bằng trứng gà), rồi thu hoạch một loại nông sản chưa có trong túi: hiện "Túi đồ đã đầy", cây vẫn giữ nông sản.
- [ ] Gieo, tưới, thu xong thì đóng hẳn game ngay, mở lại: mọi thứ còn nguyên.

## Kiểm thử chặng 2 – Thời gian

- [ ] **F20 Tiến triển khi tắt game:** gieo vài cây (tưới một số), đóng hẳn game, đợi hơn 5 phút (hoặc chỉnh giờ máy tiến lên vài giờ), mở lại: bảng "Trong lúc bạn vắng …" kể cây nào đã chín, cây nào lớn thêm, cây nào khô đất. Bấm "Ra vườn" để đóng.
- [ ] **F20** Không muốn chờ: bấm "Giả lập vắng 8 giờ" trong bảng "Bản thử".
- [ ] **F20** Tắt game 8 tiếng rồi mở lại: cây lớn đúng như khi để game mở 8 tiếng.
- [ ] **F20** Chỉnh giờ máy lùi rồi mở game: hiện "Giờ máy vừa bị lùi", cây không mất tiến độ.
- [ ] **F20** Vắng dưới 5 phút: chỉ có lời chào ngắn, không hiện bảng.
- [ ] **F08 Ngày và đêm:** chỉnh giờ máy sang 8h, 14h, 18h, 22h (hoặc dùng các nút Sáng/Chiều/Tối/Đêm trong bảng "Bản thử"): thấy 4 bầu trời khác nhau; ban đêm cửa sổ và đèn dây sáng, có sao và trăng.
- [ ] **F08** Bấm "Chạy nhanh 24 giờ": trời đổi màu dần trong 24 giây, không giật; mặt trời mọc bên trái, lặn sau dãy nhà bên phải; phố lên đèn từ từ.
- [ ] **F08** Để game mở qua 17:00: màu chuyển dần sang chiều tối, không đổi phắt.
- [ ] **N06** Chơi 15 phút trên điện thoại tầm trung: máy không nóng lên rõ rệt.

## Kiểm thử chặng 3 – Nuôi gà

Dùng "Tua +1 giờ", "Tua tới sáng mai" và "Giả lập vắng 8 giờ" trong bảng "Bản thử" để không phải chờ.

- [ ] **Bản lưu cũ:** người đã chơi bản trước, mở bản 0.6: cây, xu, túi đồ còn nguyên; có thêm chuồng 2 gà và 5 "Thức ăn gà" trong tab "Vật tư" của túi đồ.
- [ ] **F05 Cho ăn:** gà đói thì máng ăn có bong bóng hạt thóc. Chạm máng: thóc rơi vào máng, gà chạy lại ăn, thức ăn trong túi giảm 1, hiện "Gà sẽ đẻ trứng sau khoảng 2 giờ".
- [ ] **F05** Chạm máng lần nữa trong cùng ngày: không trừ thức ăn, hiện "Gà đã ăn no hôm nay…".
- [ ] **F05** Tua 2 giờ: trong ổ rơm ở cửa chuồng có 2 quả trứng, chuồng có bong bóng hình quả trứng.
- [ ] **F05** Chạm chuồng: trứng bay về túi, "+2 trứng gà"; tab "Nông sản" có Trứng gà.
- [ ] **F05** Đã đẻ trong ngày mà cho ăn hoặc chờ thêm: không có thêm trứng. "Tua tới sáng mai": gà đói lại, cho ăn được tiếp.
- [ ] **F05** Không cho ăn nhiều ngày ("Tua tới sáng mai" vài lần): gà vẫn còn đủ 2 con, chỉ không đẻ.
- [ ] **F05** Không nhặt trứng qua nhiều ngày: trứng vẫn còn, cộng dồn (hiện "×4", "×6"…).
- [ ] **F05** Hết thức ăn (cho ăn đủ 5 ngày): chạm máng hiện "Hết thức ăn gà".
- [ ] **F05** Túi đầy ("Lấp đầy túi") rồi nhặt trứng: hiện "Túi đồ đã đầy", trứng vẫn nằm trong chuồng.
- [ ] **F20** Cho gà ăn, đóng game hơn 5 phút rồi mở lại (hoặc "Giả lập vắng 8 giờ"): bảng đi vắng có dòng "Gà đã đẻ 2 quả trứng…". Sang ngày mới thì có dòng "Gà đang đói…".

## Kiểm thử bản 0.14.1 – Tinh chỉnh cảnh sân và tiệm

Dùng "+50 KN" trong bảng "Bản thử" để lên level 13 và mở đủ chuồng.

- [ ] **Chuồng thỏ** to hơn: mái tôn, khoang ngủ bên trái (thỏ nâu ló đầu), cửa lưới bên phải, cầu thang nhỏ, bát cỏ khô. Chạm vào chuồng để cho ăn / nhặt lông như trước.
- [ ] **Con thỏ** vẽ lại cùng kiểu với gà: viền nâu, thân tròn, tai có lòng hồng, má hồng, mắt có ánh sáng, đuôi bông. Thỏ trắng đứng trước chuồng, giữa hai thùng xốp (cây cao không che); lúc cúi gặm cỏ, lúc nhảy vài bước.
- [ ] **Không còn dãy đèn dây** giăng ngang sân (cả ngày lẫn đêm).
- [ ] **Cà chua, ớt chín** có quả đỏ tươi, to hơn, có ánh bóng; lúc chưa chín vẫn xanh. Biểu tượng trong túi đồ, tiệm cũng đỏ.
- [ ] **Bỏ bồn nước:** góc trái sân là chuồng bồ câu hai tầng (4 ô cửa, mái đỏ) đứng trên cột gỗ cao. Bồ câu đậu trên bậu, thỉnh thoảng một con bay sang dây phơi rồi về. Chạm vào chuồng bồ câu vẫn cho ăn / nhặt trứng được. Chưa mở (dưới level 12): khung nét đứt "Lv 12" ở đúng chỗ đó.
- [ ] **Tiệm → Mua** chia 3 nhóm: Hạt giống · Phân bón · Thức ăn & túi đồ (thức ăn gà, cỏ khô, hạt kê, cám cá, nâng cấp túi đồ). Mở tab Mua mặc định ở "Hạt giống". Tab Bán không có hàng nhóm này.
- [ ] Hướng dẫn bước Mua vẫn chạy: mũi tên chỉ "Mua 1" hạt rau muống trong nhóm Hạt giống; bấm nhóm khác bị chặn.

## Kiểm thử bản 0.7 – Tinh chỉnh và quét bụi (F23)

- [ ] **Chuồng gà to hơn:** chuồng, sân gà và gà to hơn bản 0.6; chạm chuồng (nhặt trứng) và chạm máng (cho ăn) vẫn trúng.
- [ ] **Vùng chạm thùng xốp:** rê chuột/chạm vào đáy thùng phía trên thì luôn chọn thùng phía trên, không nhảy sang thùng phía dưới. Chạm vào cây cao của thùng phía dưới thì chọn thùng phía dưới. Chạm khe trống giữa các thùng thì không có gì xảy ra.
- [ ] **F23 Bụi:** bấm "Cho bụi bám ngay" (hoặc "Tua tới sáng mai" 3–4 lần): sân hiện 3–4 vệt bụi có lá khô, kèm bong bóng cái chổi.
- [ ] **F23** Chạm từng vệt: chổi quét qua lại, bụi bay, xu bay về ô xu, "+5 xu". Vệt cuối cùng hiện "Sân thượng sạch bóng!".
- [ ] **F23** Sau khi quét sạch, phải 3–4 ngày sau mới bám bụi lại (tua thử 2 ngày: chưa có bụi).
- [ ] **F23** Đóng game khi đang có bụi rồi mở lại: bụi còn đúng chỗ cũ.
- [ ] **F23** Vắng mặt lúc bụi bám: bảng "Trong lúc bạn vắng …" có dòng "Sân thượng bám bụi…".
- [ ] **Bản lưu cũ:** người chơi bản 0.6 mở bản 0.7: mọi thứ còn nguyên; bụi đầu tiên bám sau 3–4 ngày.

## Kiểm thử chặng 4 – Kinh tế và mở rộng

Trong bảng "Bản thử" có "Thêm 10 xu" nếu cần thêm xu để thử mua.

- [ ] **F11 Tiệm:** bấm "Tiệm": anh Bảo chào một câu. Tab "Bán" chưa có hàng thì hiện lời nhắc thu hoạch.
- [ ] **F11** Có nông sản/trứng: "Bán 1" tăng xu đúng giá một món; "Bán hết · N xu" tăng đúng N xu; túi giảm đúng số lượng; ô xu nảy nhẹ.
- [ ] **F11** Tab "Mua": mua 1 hạt giống trừ đúng xu, hạt vào túi. Không đủ xu thì nút mờ và ghi "Thiếu N xu". Túi đầy thì ghi "Túi đồ hết chỗ".
- [ ] **F11** Nâng cấp túi đồ: "Thêm 4 ô túi đồ" (60, 120, 200 xu), túi lên 16, 20, 24 ô; sau lần thứ 3 hiện "đã nâng tối đa".
- [ ] **F11** Mua xong tắt game ngay: xu và đồ đều đã lưu.
- [ ] **F12 Đơn hàng:** trên dây phơi có 3 tờ giấy; chạm vào để mở "Đơn hàng hàng xóm" với 3 đơn của bà Tư / bé Na, mỗi đơn có tiến độ "Có x/y" và phần thưởng.
- [ ] **F12** Chỉ đặt món đã có (lúc đầu: rau muống, cải, trứng gà). Mua hạt mới thì đơn mới có thể đặt món đó.
- [ ] **F12** Đủ hàng: dây phơi hiện bong bóng dấu tích; "Giao hàng" nhận đúng xu (cao hơn bán ở tiệm) và điểm thân thiết; có đơn mới thay vào.
- [ ] **F12** Thiếu hàng: nút ghi "Còn thiếu N" và không bấm được. "Đổi đơn khác" thay đơn mới ngay, không mất gì.
- [ ] **F12 Hàng xóm mở dần (0.8.1):** lúc đầu chỉ bà Tư và bé Na; dòng "Sắp quen" ghi người kế tiếp và còn bao nhiêu đơn. Giao đủ 3 đơn: "Cô Mai mái bên nghe tiếng rau ngon, ghé hỏi mua!" và có đơn của cô Mai. Tiếp theo: anh Tuấn (6 đơn), chú Sáu (10), chị Hoa (15), ông Ba (20).
- [ ] **F12** Mỗi người hay đặt món riêng (chú Sáu hay đặt trứng, chị Hoa đặt dưa leo/húng quế/ớt với số lượng lớn…), mỗi người có ảnh và câu thoại riêng.
- [ ] **F12 Đơn quá hạn (0.8.1):** mỗi đơn ghi "Chờ thêm khoảng …". Để quá 3 ngày ("Tua tới sáng mai" 4 lần, vì lần đầu chỉ tua tới 6 giờ sáng hôm sau): đơn được thay bằng đơn mới đúng chỗ đó, hiện "… đã mua ngoài chợ", không mất xu hay điểm. Nếu hết hạn lúc vắng mặt thì bảng đi vắng ghi "N đơn cũ quá hạn đã được thay bằng đơn mới".
- [ ] **F14 Mua thùng:** ô trống kế tiếp có dấu "+" và giá. Chạm vào: bảng xác nhận "Thùng thứ 5 · 40 xu". Mua: thùng mới nảy lên, gieo được ngay; dấu "+" chuyển sang ô kế tiếp với giá mới (70, 110, 160).
- [ ] **F14** Thiếu xu: bảng ghi "Còn thiếu N xu", nút mờ. Đủ 8 thùng thì không còn dấu "+".
- [ ] **F14** Mua thùng rồi tải lại: số thùng giữ nguyên, mọi thùng chạm được bằng ngón cái.

## Kiểm thử bản 0.8.2 – Sửa lỗi sau vòng test

- [ ] **F12** Bấm "Tua tới sáng mai" tới khi đơn quá hạn: sau thông báo tua khoảng 2 giây hiện "… đã mua ngoài chợ" (hoặc "N đơn cũ đã được thay…").
- [ ] **F12** Sau đó bấm "Giả lập vắng 8 giờ": bảng đi vắng **không** còn dòng "đơn cũ quá hạn" của lần tua trước.

## Kiểm thử bản 0.9.1 – Sửa lỗi trước khi chơi thử

- [ ] **I-25** Người chơi mới (cửa sổ ẩn danh, hoặc Cài đặt → Xóa dữ liệu): trong lúc bà Tư hướng dẫn **không** thấy ô "+ 40 xu" ở chỗ trống bên dưới 4 thùng.
- [ ] **I-25** Đi hết hướng dẫn: ô "+ 40 xu" hiện ra ngay, chạm vào mở bảng mua thùng.
- [ ] **I-25** Cài đặt → "Xem lại hướng dẫn": ô "+" ẩn đi; xong hướng dẫn thì hiện lại.

## Kiểm thử bản 0.14.0 – Vật nuôi khác (F06)

Game có thêm level 11–13. Dùng nút "+50 KN" trong bảng "Bản thử" để lên level nhanh, "Tua 1 giờ" để chờ sản phẩm.

- [ ] **Người chơi mới:** sân không có gì mới (khung chờ chỉ hiện khi còn cách 2 level). Từ level 9: thấy khung nét đứt "Lv 11" (sau sân, giữa hai thùng hàng đầu), "Lv 12" (trên nóc bồn nước), "Lv 13" (trước bồn nước). Chạm khung: "Chuồng thỏ mở ở level 11."
- [ ] **Lên level 11 / 12 / 13:** bảng chúc mừng ghi thức ăn mới ở tiệm và con vật mới; được tặng 5 gói thức ăn. Chuồng hiện dần ra: chuồng thỏ gỗ (thỏ trắng nhảy ngoài, thỏ nâu ló đầu trong chuồng), chuồng bồ câu mái đỏ trên nóc bồn nước (bồ câu gật gù, thỉnh thoảng bay sang dây phơi), chậu cá sành (cá cam bơi, lá súng).
- [ ] **Cho ăn:** chuồng chưa ăn có bong bóng hạt thức ăn. Chạm chuồng: thức ăn rơi xuống, nhãn "Đã cho ăn", thông báo "Thỏ đã ăn. Khoảng 3 giờ nữa có lông thỏ."; túi giảm 1 thức ăn. Bồ câu 2 giờ, cá 4 giờ.
- [ ] Chạm lại trong ngày: báo còn bao lâu; đã có sản phẩm hôm nay thì "Mai cho … ăn tiếp nhé." Hết thức ăn: "Hết cỏ khô. Ghé tiệm anh Bảo mua thêm nhé."
- [ ] **Sản phẩm đúng loại:** thỏ cho 2 túm **lông thỏ** (15 xu), bồ câu 3 quả **trứng bồ câu** (10 xu), cá 2 con **cá giống** (16 xu). Có sản phẩm thì bong bóng đổi thành hình sản phẩm, kèm "×n". Chạm chuồng: sản phẩm bay về túi đồ.
- [ ] **Không chết:** không cho ăn nhiều ngày ("Tua tới sáng mai" vài lần): con vật vẫn còn, chỉ không có sản phẩm. Sản phẩm chưa nhặt không mất, cộng dồn.
- [ ] **Đi vắng:** bảng "Trong lúc bạn vắng…" có dòng "Thỏ có 2 túm lông thỏ mới, đang chờ bạn nhặt."
- [ ] **Tiệm:** cỏ khô 3 xu, hạt kê 4 xu, cám cá 3 xu, mở cùng level với con vật. Sản phẩm bán được; thức ăn không bán được.
- [ ] **Đơn hàng:** sau khi đã có sản phẩm, hàng xóm có thể đặt (cô Mai thích lông thỏ, bé Na thích cá giống, ông Ba thích trứng bồ câu).
- [ ] **Bụi (F23):** hai chỗ bám bụi phía sau sân đã dời xuống khe giữa các thùng; bụi không nằm đè lên chuồng mới.
- [ ] Trong lúc hướng dẫn: chạm chuồng bị chặn như các chỗ khác.

## Kiểm thử bản 0.13.0 – Thân thiết với gà (F07)

Dùng "Tua tới sáng mai" trong bảng "Bản thử" để sang ngày mới.

- [ ] **Hàng tim:** dưới sân gà có tấm 5 tim (người chơi mới: 5 tim trắng). Chạm vào: thông báo số tim và việc đã làm hôm nay ("đã cho ăn / chưa đổ nước / vuốt ve 1/2 con").
- [ ] **Vuốt ve:** chạm vào từng con gà (kể cả lúc gà đang đi): gà ngoảnh đầu, tim nhỏ bay lên, tiếng "cục cục". Chạm lại con đó trong ngày: nhãn "Hôm nay vuốt rồi", không tăng thêm. Chạm gà đứng trước máng: vuốt gà, không đổ thức ăn.
- [ ] **Bình nước:** chưa đổ nước hôm nay thì bình cạn và có bong bóng giọt nước. Chạm bình: nước rót vào, bình đầy, nhãn "Đã đổ nước". Chạm lại: "Bình còn đầy nước". Sang ngày mới bình cạn lại.
- [ ] **Cho ăn** cũng tính là chăm gà như trước (thêm điểm thân thiết).
- [ ] **Tăng tim:** mỗi ngày làm đủ ba việc (cho ăn, đổ nước, vuốt hết gà) được khoảng 2/3 tim; khoảng 8 ngày thì đầy 5 tim. Lên một tim mới: thông báo "Đàn gà quý bạn hơn rồi! Thân thiết n/5 tim".
- [ ] **Bỏ vài ngày:** "Tua tới sáng mai" 3–4 lần không chăm gà: tim chỉ giảm nhẹ (mỗi ngày bỏ trừ 3 điểm, khoảng 1/7 tim), không mất hết, gà không bỏ đi.
- [ ] **Trứng ngon:** tim càng nhiều càng nhiều trứng ngon (1 tim 15%, 5 tim 75% số trứng). Nhặt trứng: "+2 trứng vào túi đồ, có 1 trứng ngon!"; túi có "Trứng gà ngon" (vỏ hồng nâu, có tim).
- [ ] **Tiệm:** trứng gà ngon bán 14 xu (trứng thường 8 xu). Hàng xóm không đặt trứng ngon.
- [ ] **Trong lúc hướng dẫn:** chạm gà, bình nước bị chặn như các chỗ khác.
- [ ] **Bản lưu cũ:** mở lên có 0 tim, trứng đang nằm trong chuồng vẫn nhặt được bình thường.

## Kiểm thử bản 0.12.0 – Phân bón (F04)

Dùng nút "+50 KN" trong bảng "Bản thử" để lên level nhanh.

- [ ] **Tiệm:** tab "Mua" có "Phân lớn nhanh" (5 xu, mở ở level 3) và "Phân sai quả" (8 xu, mở ở level 4). Chưa đủ level thì mờ và ghi "Mở ở level N". Mỗi dòng có mô tả ngắn tác dụng.
- [ ] **Lên level 3:** bảng chúc mừng có dòng "Phân lớn nhanh ở tiệm anh Bảo. Chạm cây đang lớn để bón" và quà 2 gói phân lớn nhanh. **Level 4:** tương tự với phân sai quả.
- [ ] **Bón phân:** có phân trong túi, chạm cây **đang lớn** (đã tưới, chưa chín) → bảng "Bón phân" ghi cây gì, còn bao lâu chín; mỗi loại phân ghi tác dụng cho đúng cây đó ("còn khoảng …", "thêm 2 trái cà chua"), số gói đang có. Loại đã hết thì mờ, có dòng nhắc mua ở tiệm.
- [ ] Bấm "Bón": hạt phân rắc xuống thùng, chữ nổi "Lớn nhanh hơn!" hoặc "Thu thêm +n"; túi giảm 1 gói; góc trái thùng có dấu bao phân (xanh lá = lớn nhanh, cam = sai quả), thanh tiến độ ngắn lại để chừa chỗ.
- [ ] **Lớn nhanh:** gieo 2 cây cùng loại, bón 1 cây: cây bón chín trước (nhanh gấp rưỡi), thời gian "chín sau …" ngắn lại.
- [ ] **Sai quả:** thu cây đã bón được thêm khoảng một nửa (cà chua 3 → 5 trái, rau muống 3 → 5 bó, cải 2 → 3 bó).
- [ ] **Mỗi lứa bón một lần:** chạm lại cây đã bón chỉ hiện "Chín sau …", không mở bảng. Cây quả thu xong (quay về lứa mới) thì bón tiếp được; phần thêm không dồn sang lứa sau.
- [ ] Không có phân trong túi, hoặc cây khô (chạm là tưới), hoặc cây chín (chạm là thu): không mở bảng bón phân.
- [ ] Đóng mở game: dấu bao phân và tác dụng vẫn còn; tắt game lâu cây vẫn lớn nhanh đúng tỉ lệ.
- [ ] Phân không bán được ở tiệm, hàng xóm không đặt phân.

## Kiểm thử bản 0.11.0 – Thời tiết (F09)

Thời tiết chỉ bắt đầu **sau khi xong hướng dẫn** của bà Tư. Trong bảng "Bản thử" có hàng nút **"Đặt thời tiết (30 phút)"**: Theo lịch · Nắng · Mây · Gió · Mưa.

- [ ] **Trong lúc hướng dẫn:** trời luôn nắng. Chạm ô đồng hồ: bà Tư nhắc để ý trời sau khi xong việc.
- [ ] **Ô đồng hồ:** trời nắng hiện khung giờ như cũ (Sáng/Chiều/Tối/Đêm). Trời mây, gió, mưa: biểu tượng và chữ đổi thành "Mây", "Có gió", "Mưa". Vừa một dòng trên màn hình hẹp.
- [ ] **Dự báo:** chạm ô đồng hồ → thông báo trời bây giờ và "Khoảng … nữa có mưa rào" (trong 3 giờ tới) hoặc "Vài giờ tới chưa thấy mưa". Đang mưa: "Tạnh sau khoảng …".
- [ ] **Mưa:** bấm "Mưa": trời tối dần trong vài giây, mây xám kéo tới, mưa rơi xiên, giọt nước bắn trên sàn, nghe tiếng mưa rào và tiếng giọt nước lách tách. Chim và dế im.
- [ ] **Mưa tưới cây:** cây khô hết bong bóng giọt nước, đất sẫm màu. Chạm cây không tưới, bấm "Bình tưới" hiện "Trời đang mưa, cây được tưới rồi."
- [ ] **Mưa tạnh** (bấm "Theo lịch" hoặc "Nắng"): báo "Mưa tạnh rồi…". Đất còn ẩm thêm 10 phút rồi mới khô (dùng "Tua 10 phút" để thử).
- [ ] **Mây:** mây xám, trời hơi tối, mặt trời mờ. **Gió:** lá khô bay ngang sân, nghe tiếng gió vù vù lên xuống.
- [ ] **Ban đêm + mưa** (nút "Đêm" trong "Xem thử khung giờ"): mưa vẫn thấy rõ, không chói.
- [ ] **Mưa lúc vắng:** gieo cây, bấm "Mưa", rồi "Giả lập vắng 8 giờ": bảng đi vắng có dòng "Trời mưa khoảng … phút, cây được tưới tự động".
- [ ] **Đóng mở game:** trời mở lại đúng như lúc trước (cùng lịch); đang mưa thì mở lên vẫn mưa ngay, không chuyển dần.
- [ ] **Theo lịch:** mỗi ngày khoảng 1 giờ mưa, chia 2–3 trận rào 15–40 phút; còn lại nắng, mây hoặc gió.
- [ ] **Bản lưu cũ:** người chơi đã xong hướng dẫn có thời tiết ngay từ lúc cập nhật, không bị tính mưa ngược về trước.

## Kiểm thử bản 0.10.1 – Bắt đầu với 2 thùng, hướng dẫn đủ 7 bước

Thử bằng cửa sổ ẩn danh hoặc sau khi Xóa dữ liệu.

- [ ] Người chơi mới chỉ có **2 thùng xốp** (hàng trên bên trái). Từ level 2 mới hiện ô mua thùng; giá thùng thứ 3 → 8: 25, 30, 40, 70, 110, 160 xu. Người chơi cũ giữ nguyên số thùng, mua thùng tiếp theo đúng giá cũ.
- [ ] **Thứ tự hướng dẫn:** Gieo hạt → Tưới nước → Thu hoạch → Bán → Mua → Cho gà ăn → Đơn hàng → lời chào cuối.
- [ ] **Bán:** trong tiệm bấm "Bán hết" → tiệm vẫn mở, sang bước **Mua**: mũi tên chỉ tab "Mua", rồi chỉ "Mua 1" của hạt rau muống. Mua hạt khác, "Mua 5", tab Bán, Đóng: bị chặn. Mua xong tiệm tự đóng.
- [ ] **Cho gà ăn:** như trước.
- [ ] **Đơn hàng (bước cuối, luôn có):** mũi tên chỉ dây phơi → mở bảng đơn hàng. Có đơn đủ hàng: mũi tên chỉ "Giao hàng", giao xong bảng tự đóng. Chưa đủ hàng: mũi tên chỉ "Đóng". Rồi bà Tư nói lời cuối → "Bắt đầu chơi".
- [ ] Khi bảng Tiệm hoặc Đơn hàng đang mở, lời bà Tư hiện trong khung vàng ngay đầu bảng.
- [ ] Xong hướng dẫn: hướng dẫn trả đơn riêng (của bản 0.9.4) **không** hiện nữa. Người chơi cũ đã xong hướng dẫn từ trước thì vẫn có hướng dẫn trả đơn riêng như cũ.
- [ ] Đóng game ở bước đọc đơn hàng rồi mở lại: quay về bước chạm dây phơi.

## Kiểm thử bản 0.10.0 – Hệ thống level (10 level đầu)

Dùng nút "+50 KN" trong bảng "Bản thử" để lên level nhanh.

- [ ] **Thanh trên cùng:** có viên ngôi sao ghi số level và thanh điểm nhỏ, nằm cạnh số xu. Vừa màn hình hẹp (360 px), không đẩy số xu ra ngoài.
- [ ] **Nhận điểm:** thu hoạch (+4 Cơ bản, +7 Hơi khó, +12 Lâu), giao đơn +15, cho gà ăn +3, nhặt trứng +2, quét bụi +1 mỗi vệt. Mỗi lần có chữ "+n KN" nổi dưới viên level, viên nảy nhẹ. Bán ở tiệm không có điểm.
- [ ] **Lên level:** hiện bảng "Lên level N!" có bà Tư, danh sách mở khóa, quà (xu, hạt). Bấm "Tuyệt quá!" để đóng. Lên nhiều level một lúc: các bảng hiện lần lượt.
- [ ] Bảng chúc mừng không chen vào lúc đang hướng dẫn hoặc đang mở bảng khác; đóng bảng đó thì mới hiện.
- [ ] **Con đường level:** chạm viên level → bảng có tiến độ, cách nhận điểm và 10 level (đã qua có dấu ✓, level hiện tại tô vàng, level sau mờ).
- [ ] **Tiệm khóa theo level:** người chơi mới chỉ mua được hạt rau muống, cải và thức ăn gà. Hạt khác hiện mờ "Mở ở level N". Nâng cấp túi đồ khóa tới level 5.
- [ ] **Ô mua thùng "+40 xu"** chỉ hiện từ level 2.
- [ ] **Mở khóa từng level:** 2 húng quế + mua thùng · 3 dưa leo · 4 cô Mai đặt đơn · 5 ớt + nâng cấp túi · 6 anh Tuấn · 7 cà chua · 8 chú Sáu + thêm 1 gà mái trong sân · 9 chị Hoa · 10 ông Ba + chậu hoa giấy bên phải sân. Hàng xóm mới quen gửi đơn ngay.
- [ ] Hạt đã có trong túi (kể cả hạt chưa mở ở tiệm) vẫn gieo được bình thường.
- [ ] **Bản lưu cũ:** người chơi thử đã giao nhiều đơn được xếp level tương ứng (3 đơn → level 4, 6 → 6, 10 → 8, 15 → 9, 20 → 10), không mất hàng xóm đã quen; đã mua thùng thì ít nhất level 2.

## Kiểm thử bản 0.9.5 – Thông báo gọn hơn

- [ ] Gieo hạt: nhãn nhỏ "Chín sau …" nổi lên ngay trên thùng rồi mờ dần (khoảng 2 giây), không còn thông báo to bên dưới.
- [ ] Tưới (chạm cây hoặc bấm "Bình tưới"): mỗi thùng vừa tưới có nhãn "Đã tưới".
- [ ] Chạm cây đang lớn: nhãn "Chín sau …" (cây thu nhiều lần đang ra lứa mới: "Ra lứa mới sau …"). Chạm liên tục không chồng chữ.
- [ ] Thu hoạch: chỉ còn chữ "+n" bay về túi đồ, không có thông báo to.
- [ ] Các thông báo còn lại (bán hàng, túi đầy, bị chặn…) là viên nhỏ ngay trên thanh công cụ, chữ nhỏ, tự ẩn sau khoảng 2 giây.

## Kiểm thử bản 0.9.4 – Nút Đóng, nhóm hạt giống, hướng dẫn trả đơn

- [ ] **Nút Đóng luôn hiện:** mở Tiệm (tab Mua) và Đơn hàng hàng xóm: nút "Đóng" nằm sẵn ở đáy bảng, không phải cuộn xuống. Cuộn danh sách: chữ trượt phía sau nút, không lộ ra bên dưới. (Áp dụng cho mọi bảng: chọn hạt, túi đồ, cài đặt…)
- [ ] **Nhóm hạt giống:** trong bảng chọn hạt, tab Mua của tiệm và túi đồ, hạt giống có khung màu theo nhóm kèm nhãn: Cơ bản (xanh lá: rau muống, cải, húng quế), Hơi khó (xanh dương: dưa leo, ớt), Lâu (tím: cà chua). Nông sản, trứng, thức ăn gà giữ khung thường.
- [ ] **Hướng dẫn trả đơn – khi nào hiện:** chỉ hiện sau khi xong hướng dẫn chính, vào lần **đầu tiên** túi đồ có đủ hàng cho một đơn (thử nhanh: bảng Bản thử → "Thêm mỗi loại 3 hạt", trồng/thu, hoặc dùng "Lấp đầy túi" nếu đơn cần trứng gà).
- [ ] Bà Tư nhắc chạm dây phơi; giấy đặt hàng sáng lên, có mũi tên. Các nút khác vẫn bấm bình thường (hướng dẫn này không khóa gì).
- [ ] Mở bảng đơn hàng: mũi tên chỉ nút "Giao hàng" (vàng) của đơn đủ hàng. Giao xong, bảng tự đóng, bà Tư nói lời cuối, bấm "Đã hiểu" là xong. Không hiện lại lần nào nữa.
- [ ] Đang hiện hướng dẫn mà bán hết hàng (không còn đủ cho đơn nào): hướng dẫn tạm ẩn; có đủ lại thì hiện lại.
- [ ] Bản lưu đã từng giao đơn trước đây: không hiện hướng dẫn trả đơn.

## Kiểm thử bản 0.9.3 – Vòng trồng nhanh hơn, thanh tiến độ

- [ ] **Thời gian trồng:** bảng chọn hạt ghi rau muống 2 phút, cải 4 phút, húng quế 6 phút, dưa leo 12 phút, ớt 18 phút, cà chua 30 phút.
- [ ] **Tưới:** một lần tưới giữ ẩm 10 phút. Gieo cà chua, tưới, bấm "Tua +10 phút": đất khô, có bong bóng giọt nước.
- [ ] **Thanh tiến độ:** mỗi thùng có cây hiện thanh trên mặt trước thùng, đầy dần theo thời gian. Xanh lá khi đã tưới, cam khi đất khô. Cây chín thì thanh ẩn, còn ánh lấp lánh. Thùng trống không có thanh.
- [ ] Cây thu nhiều lần (húng quế, dưa leo, ớt, cà chua): thu xong thanh về 0 rồi đầy lại.
- [ ] Chạm vào cây đang lớn vẫn hiện "chín sau khoảng …".
- [ ] Bà Tư nói "Rau muống cần khoảng 2 phút mới chín".

## Kiểm thử bản 0.9.2 – Tinh chỉnh hướng dẫn và thời gian trồng

Thử bằng cửa sổ ẩn danh hoặc sau khi Xóa dữ liệu.

- [ ] **Không bỏ qua được:** hộp thoại bà Tư không còn nút "Bỏ qua hướng dẫn".
- [ ] **Mũi tên mới:** mũi tên vàng to, viền nâu, nhún lên xuống; không còn vòng tròn quanh thùng. Thùng cần chạm có quầng vàng và sáng lên (thấy rõ cả ban ngày lẫn ban đêm).
- [ ] **Chỉ bấm chỗ được chỉ:** ở bước gieo, bấm "Túi đồ", "Tiệm", "Cài đặt", chuồng gà, thùng khác: không mở gì, hiện "Làm theo lời bà Tư nhé, chạm vào chỗ mũi tên đang chỉ."
- [ ] **Bảng chọn hạt:** chạm thùng có mũi tên → mũi tên chỉ nút "Gieo" của hạt rau muống. Bấm "Gieo" hạt cải hoặc "Đóng": bị chặn. Bấm "Gieo" rau muống: gieo được.
- [ ] **Tưới:** mũi tên chỉ nút "Bình tưới" (nút sáng vàng), thông báo "Đã gieo…" nằm cao hơn, không che mũi tên. Thùng vẫn sáng, không có mũi tên trên thùng.
- [ ] **Thu hoạch:** rau lớn nhanh khoảng 3 giây, mũi tên hiện trên thùng; chạm để thu.
- [ ] **Tiệm:** mũi tên chỉ nút "Tiệm"; mở ra luôn ở tab "Bán", mũi tên chỉ nút "Bán hết" của rau muống. Bấm tab "Mua", "Bán 1", "Đóng": bị chặn. Bấm "Bán hết": bán được, tiệm tự đóng.
- [ ] **Cho gà ăn (mới):** bà Tư nhắc cho gà ăn, máng ăn sáng lên có mũi tên. Chạm máng: gà ăn, bà Tư nói lời cuối → "Bắt đầu chơi". Sau đó mọi nút bấm lại bình thường.
- (Thời gian trồng và tưới của 0.9.2 đã được thay bằng 0.9.3, xem mục trên.)

## Kiểm thử chặng 5 – Hoàn thiện (bản 0.9.0)

Công cụ thử (bảng "Bản thử", tua giờ…) giờ **ẩn với người chơi mới**. Bật lại bằng một trong hai cách:
mở link có thêm `?test=1`, hoặc vào Cài đặt và chạm 5 lần liền vào dòng "phiên bản 0.9.0". Bản lưu cũ của bạn tự bật sẵn.

**F19 Hướng dẫn** (thử bằng cửa sổ ẩn danh hoặc sau khi Xóa dữ liệu)
- [ ] Mở game lần đầu: bà Tư chào, chỉ có nút "Tiếp" (đã bỏ nút "Bỏ qua hướng dẫn" từ 0.9.2).
- [ ] Đóng game giữa chừng rồi mở lại: tiếp tục đúng bước.
- [ ] Cài đặt → "Xem lại hướng dẫn" chạy lại từ đầu.
- Chi tiết từng bước: xem mục "Kiểm thử bản 0.9.2" bên dưới.

**F20 Âm thanh**
- [ ] Chạm lần đầu: nhạc lo-fi nhẹ, tiếng xe máy, chim sẻ (ngày); 18:30–5:00 nhạc chậm hơn, có tiếng dế.
- [ ] Mỗi thao tác có tiếng riêng: gieo, tưới, thu, bán (tiếng xu), cho gà ăn, quét bụi, bị chặn.
- [ ] Chuyển sang app khác: nhạc tắt; quay lại: nhạc chạy tiếp.

**F21 Cài đặt và N04 Sao lưu**
- [ ] Kéo thanh Nhạc nền / Hiệu ứng: âm lượng đổi ngay, mở lại game vẫn giữ.
- [ ] "Xuất file lưu": điện thoại mở bảng chia sẻ (lưu vào Tệp/Zalo), máy tính tải file `.json`.
- [ ] "Nhập file lưu" chọn file vừa xuất: hiện số xu, số thùng, giờ lưu và hỏi lại → Đồng ý → game tải lại đúng tiến độ.
- [ ] Nhập file linh tinh (không phải file lưu): báo lỗi, không mất gì.
- [ ] "Xóa dữ liệu": bấm lần 1 đổi chữ thành "Bấm lần nữa để xóa hẳn", bấm lần 2 trong 4 giây mới xóa.
- [ ] Thống kê hiện số ngày đã chơi, số lần mở, tổng thời gian.

**N05 Dung lượng**: lần đầu tải khoảng 420 KB (đã nén), gồm cả Phaser. Sau đó chơi offline.
