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
| `js/farm.js` | Luật trồng trọt: gieo, tưới, tính tiến độ, thu hoạch |
| `js/inventory.js` | Luật túi đồ: số ô, gộp cùng loại, đầy thì từ chối |
| `js/icons.js` | Biểu tượng vật phẩm |
| `js/coop.js` | Luật nuôi gà: cho ăn mỗi ngày, đẻ trứng, nhặt trứng |
| `js/daylight.js` | Màu trời, phố, đèn cho từng giờ trong ngày; chuyển dần giữa các khung giờ |
| `js/scene.js` | Cảnh sân thượng vẽ bằng Phaser (hình tạm) |
| `tests/` | Kiểm thử luật chơi: `node tests/farm.test.mjs`, `node tests/daylight.test.mjs`, `node tests/coop.test.mjs` |
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
- [ ] **F01** Chạm thùng đã có cây: không mở bảng chọn hạt, hiện "Thùng đã có …, chín sau khoảng …".
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
