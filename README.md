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
| `js/scene.js` | Cảnh sân thượng vẽ bằng Phaser (hình tạm) |
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
