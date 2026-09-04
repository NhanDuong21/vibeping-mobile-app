# VibePing 1.0.0-rc.5 — VibePing Alive

## Thay đổi

- Thẻ trạng thái có đường mint chạy theo công việc còn tín hiệu mới, hai nhịp amber khi Codex chờ bạn, dấu hoàn tất và phản hồi ngắn khi kiểm thử lỗi. Dữ liệu cũ hoặc mất kết nối dừng hiệu ứng đang làm việc; không thêm phần trăm tiến độ giả.
- Sự kiện mới nhận trực tiếp được nhấn một lần, hàng hoạt động đi vào đường tín hiệu và số chưa đọc phản hồi. Không phát lại khi nhận trùng, đồng bộ lịch sử hoặc quay lại từ nền.
- Thanh điều hướng dùng một nền chọn trượt chung, giữ nguyên khi đổi tab. Chuyển trang ngắn theo hướng di chuyển; chi tiết hoạt động có các mốc xuất hiện lần lượt, chỉ dùng dữ liệu đã lưu.
- Màn Máy tính có sơ đồ Laptop → Codex → VibePing → Riêng tư → iPhone. Đường nối dừng ở bước chưa sẵn sàng. Đây là trạng thái theo lần kiểm tra gần nhất, không phải xác nhận thông báo đã đến iPhone.
- Hạn mức chuyển số và thanh từ giá trị cũ đến số mới; số đã lưu khi ngoại tuyến hiển thị ngay. Kéo làm mới dùng mascot hiện có. Toggle và các nhóm lựa chọn có phản hồi chuyển động, preview vẫn bỏ chi tiết cũ ngay khi tăng riêng tư.
- Cài đặt thêm Tối đa (mặc định), Vừa phải và Tối giản, lưu riêng trên điện thoại. Giảm chuyển động của iPhone luôn được ưu tiên. Các hiệu ứng lặp dừng khi ra khỏi màn hình, ở tab ẩn hoặc app về nền.
- Thông báo có bản cập nhật hiện xuyên suốt ứng dụng, kể cả ở Máy tính và Cài đặt; vẫn chờ bạn bấm Cập nhật.

## Cập nhật trên iPhone

Giữ laptop chạy VibePing và Tailscale kết nối. Mở VibePing từ Màn hình chính, vào Hoạt động nếu đang dùng RC4, chờ **Có bản VibePing mới · Phiên bản 1.0.0-rc.5**, rồi bấm **Cập nhật**. Khi mạng ổn, app kiểm tra lúc mở lại và mỗi phút khi đang mở. Nếu chưa thấy, đưa app về nền rồi mở lại.

Không cần gỡ app, xóa Safari, ghép đôi hay đăng ký thông báo lại. RC5 giữ nguyên cơ sở dữ liệu, VAPID và đăng ký hiện có. Bản Windows tiếp tục dùng kết nối riêng tư và khởi động bằng thao tác của bạn.

## Triển khai và giới hạn

Giữ Angular Signals, Tailwind utilities và Ionic Animations hiện có, không thêm thư viện animation. Chuyển động hữu hạn dùng Web Animations API hoặc Angular `animate.enter`; vòng lặp dùng token Tailwind. [Angular](https://angular.dev/guide/animations) và [Ionic](https://ionicframework.com/docs/utilities/animations) cung cấp các API tương ứng.

Mức Tối đa tập trung vào tín hiệu, điều hướng và thao tác; mascot dùng ảnh hiện có. Sơ đồ kết nối chạy một lần theo lần kiểm tra, không giả lập lưu lượng nền. Kiểm thử trên trình duyệt không thay thế việc quan sát bản cập nhật trên iPhone vật lý.

## Kiểm chứng phát hành

- 112 kiểm thử Rust, 68 kiểm thử Angular, 6 kiểm thử nền PWA và 92 kiểm thử trình duyệt đạt. Bao gồm sự kiện trùng/cũ/nền, giảm chuyển động thay đổi ngay, lựa chọn được lưu, thanh điều hướng giữ nguyên và thông báo cập nhật ở tab khác.
- Định dạng, lint, kiểu dữ liệu, hợp đồng API, Tailwind, kiến trúc, vệ sinh kho mã, nội dung tiếng Việt và build Windows release đạt.
- Smoke test gói Windows đạt. Nâng cấp từ cache RC4 sang RC5 hiện thông báo, chờ bấm Cập nhật, giữ dữ liệu cục bộ và mở lại ngoại tuyến bằng giao diện mới.
- Đã đưa RC5 lên tiến trình hiện có; kiểm tra phiên bản máy chủ và manifest PWA tại địa chỉ riêng tư đều là RC5. Giữ đường dẫn launcher, dữ liệu, cấu hình Tailscale Serve và trạng thái Funnel tắt; có bản sao executable cũ để quay lại.
- Impeccable: một lượt kiểm tra theo lô và một lượt xác nhận sau sửa nhãn trợ năng; không còn phát hiện WCAG A/AA hoặc tràn ngang trên các màn được kiểm tra, gồm 320–430 px, desktop, sáng/tối, chữ dài, giảm chuyển động và bàn phím.
- Gói khởi đầu 549,78 kB (khoảng 145,09 kB khi truyền), vượt mức cảnh báo 491 kB nhưng dưới mức chặn 700 kB. Không đổi ngưỡng và không thêm dependency.
- RustSec đạt với ngoại lệ ES256/RSA đã ghi nhận trước đó. npm audit hết thời gian phản hồi sau các lần thử lại; không ghi nhận npm audit là đã đạt.
