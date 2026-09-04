# VibePing 1.0.0-rc.6 — Trạng thái tự cập nhật, thông báo rõ nghĩa

## Thay đổi

- Sửa lỗi rời trang chi tiết đóng kết nối cập nhật dùng chung, khiến Hoạt động có thể đứng trạng thái đến khi tải lại. Phiên theo dõi nay thuộc ứng dụng và giữ nguyên khi đổi trang.
- Trạng thái tiếp tục nhận trực tiếp qua SSE. Khi trang đang mở, VibePing lấy lại trạng thái từ laptop mỗi 15 giây để khôi phục sự kiện bị bỏ lỡ; yêu cầu treo hết thời gian sau 10 giây. Nối lại luồng nếu im lặng 45 giây và mở kết nối mới khi quay lại từ nền hoặc có mạng trở lại.
- Nhịp kết nối chỉ xác nhận đường truyền. Nếu Codex không gửi tín hiệu công việc trong 2 phút, thẻ ghi “Chưa nhận tín hiệu mới từ Codex”, giải thích rằng chưa thể kết luận đã xong. VibePing không tự suy đoán công việc hoàn tất.
- Đổi “Kiểm thử vẫn chưa qua” thành “Kiểm thử mã nguồn chưa đạt” trong thông báo, Hoạt động, chi tiết và Cài đặt. Thẻ hiện tại nói rõ Codex có thể đang sửa. Chi tiết lịch sử ghi rõ đây là kết quả gần nhất đã ghi nhận tại thời điểm thông báo, không phải trạng thái mọi lần kiểm thử sau đó.
- Các hướng dẫn xác nhận, xem kết quả và xem trước chỉ đúng nơi thực hiện: Codex trên laptop. Giữ nguyên các mức riêng tư của thông báo; thông báo đã nằm trên Màn hình khóa trước nâng cấp không đổi nội dung.

## Cập nhật trên iPhone

Giữ laptop chạy VibePing và kết nối Tailscale. Mở VibePing từ Màn hình chính, chờ **Có bản VibePing mới · Phiên bản 1.0.0-rc.6**, rồi bấm **Cập nhật**. App kiểm tra lúc trở lại từ nền và mỗi phút khi đang mở. Không cần gỡ app hoặc ghép đôi lại.

RC6 giữ nguyên dữ liệu, VAPID, đăng ký thông báo và launcher Windows hiện có. Máy chủ tiếp tục dùng localhost qua Tailscale Serve riêng tư; Funnel tắt. Không tự khởi động Windows.

## Kiểm chứng

- 113 kiểm thử Rust, 76 kiểm thử Angular và 6 kiểm thử nền PWA đạt. Kiểm tra định dạng, lint, kiểu dữ liệu, hợp đồng API, Tailwind, kiến trúc, vệ sinh kho mã và nội dung tiếng Việt đạt; build Windows release và Gate 1 đạt.
- 98 kịch bản trình duyệt đã được xác minh trên hai giao diện sáng/tối: 93 đạt lượt chạy đầy đủ; nhóm 6 chứa các trường hợp còn lại đạt sau khi đồng nhất dữ liệu giả của hạn mức giữa bootstrap và trang chi tiết. Bao gồm rời chi tiết/đổi tab rồi nhận tín hiệu ngay, khôi phục sự kiện bị bỏ lỡ sau 15 giây và giữ nguyên trang đang mở.
- Kiểm tra giao diện theo lô đạt ở 320–430 px, gồm thông báo kiểm thử và trạng thái chờ tín hiệu. Không phát hiện lỗi WCAG A/AA hoặc tràn ngang trên các màn kiểm tra; không cần sửa thêm sau lượt xem ảnh.
- Smoke test gói Windows và nâng cấp cache RC5 → RC6 đạt: hiện đúng phiên bản, chờ bấm Cập nhật, giữ dữ liệu cục bộ và mở lại giao diện mới khi ngoại tuyến.
- Đã triển khai RC6 lên tiến trình hiện có; health trên laptop và manifest PWA ở địa chỉ riêng tư đều là RC6. Giữ đường dẫn launcher và dữ liệu; cấu hình Serve không đổi, Funnel tắt. Có bản sao executable trước nâng cấp để quay lại.
- npm audit production không có lỗ hổng đã biết. RustSec đạt với ngoại lệ RUSTSEC-2023-0071 đã xét trước đó: VAPID chỉ dùng ES256, không có thao tác RSA trong mã ứng dụng.
- Gói khởi đầu 553,10 kB (ước tính 145,79 kB khi truyền), còn vượt mức cảnh báo 491 kB và dưới mức chặn 700 kB; không thêm dependency hoặc đổi ngưỡng. Chưa kiểm tra trực tiếp trên iPhone vật lý.
