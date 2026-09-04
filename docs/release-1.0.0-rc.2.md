# VibePing 1.0.0-rc.2

## Thay đổi

- Sửa “Codex đang làm việc” bị giữ lại sau khi công việc đã kết thúc. Chỉ tín hiệu bắt đầu từ người dùng xác nhận một lượt đang được theo dõi; tín hiệu công cụ đơn lẻ không tự tạo công việc hiện tại.
- Tín hiệu đến muộn không mở lại lượt đã kết thúc hoặc ghi đè trạng thái mới hơn. Lượt mới thay thế lượt cũ trong cùng phiên, không ảnh hưởng phiên khác.
- Khi quá hai phút không có tín hiệu, trạng thái chuyển thành “Chưa rõ trạng thái Codex”, không tự báo hoàn tất. Giao diện ngừng chuyển động trong tối đa một nhịp cập nhật 30 giây; mở lại app kiểm tra ngay và đồng bộ với laptop.
- Phản hồi tải lại đến muộn không ghi đè tín hiệu kết thúc vừa nhận.
- Khi dừng hoặc khởi động lại VibePing, kết nối trực tiếp tới điện thoại được đóng đúng cách; không để tiến trình cũ giữ khóa dữ liệu và chặn bản mới khởi động.
- Thông báo cập nhật và kéo xuống làm mới theo đúng giao diện sáng/tối đã chọn.
- App kiểm tra cập nhật khi mở, trở lại từ nền, có mạng và mỗi phút khi đang mở. Chỉ mời cập nhật khi toàn bộ bản mới đã tải xong, có số phiên bản; không tự tải lại khi bạn đang xem.

## Dữ liệu và tương thích

Migration 0009 phục hồi bằng chứng bắt đầu từ lịch sử đã lưu. Các bản ghi cũ không đủ bằng chứng được loại khỏi công việc hiện tại; lịch sử và thông báo không bị xóa, không tạo sự kiện hoàn tất giả. Có sao lưu dữ liệu trước migration. Nếu phục hồi RC1, phải phục hồi cả bản sao dữ liệu trước migration.

Tích hợp dùng các hook đã được duyệt; bản cập nhật không tự thay cấu hình tin cậy Codex. Bộ nhận hỗ trợ `Interrupt` nếu Codex gửi tín hiệu này. Không dùng `SubagentStop` để đóng lượt cha: [tài liệu hooks Codex](https://learn.chatgpt.com/docs/hooks) nêu hook của tác vụ con dùng chung mã phiên với tác vụ cha. Không đọc nội dung hội thoại, khóa tài khoản hoặc kết quả công cụ riêng tư để suy đoán trạng thái.

## Cập nhật trên iPhone

Giữ laptop bật VibePing và Tailscale kết nối. Mở VibePing từ màn hình chính, đóng rồi mở lại nếu đang giữ bản cũ; khi xuất hiện “Có bản VibePing mới”, bấm “Cập nhật”. Lần nâng từ RC1 có thể cần mở lại app để bộ lưu ngoại tuyến kiểm tra bản mới. Không xóa dữ liệu Safari hoặc gỡ app; thao tác đó có thể làm mất ghép đôi và đăng ký thông báo.

Không thay nguồn riêng tư, không bật Funnel, không thêm tự khởi động. Bản phát hành vẫn là RC: kiểm thử trình duyệt không thay thế kiểm chứng cập nhật và thông báo trên iPhone vật lý.

## Kiểm chứng phát hành

- 100 kiểm thử Rust, 52 kiểm thử Angular, 6 kiểm thử nền PWA và 68 kiểm thử Playwright đạt; bổ sung kiểm thử migration RC1, tín hiệu đến muộn, mất tín hiệu, phản hồi tải lại sai thứ tự và dừng khi kết nối trực tiếp còn mở.
- Đã chạy kiểm tra định dạng, lint, kiểu dữ liệu, hợp đồng API, Tailwind, kiến trúc, vệ sinh kho mã, nội dung tiếng Việt và release build.
- Kiểm thử gói Windows chạy trong môi trường không có công cụ lập trình; kiểm thử PWA dùng bộ nhớ đệm RC1 thật, nút cập nhật và tải RC2 khi ngoại tuyến. Không gửi thông báo thử tới điện thoại thật.
- RustSec audit đạt với ngoại lệ ES256/RSA đã được ghi nhận từ trước. Kiểm tra npm audit đã thử lại và thử cả đầu cuối bulk nhưng dịch vụ npm hết thời gian phản hồi; không coi đây là kết quả an toàn đã được xác minh. Bản này không thay các phiên bản thư viện phụ thuộc.
- Build vẫn có cảnh báo kích thước gói khởi đầu 494,09 kB so với mức cảnh báo 491 kB, dưới mức chặn 700 kB. Không nới ngưỡng kiểm tra để bỏ qua cảnh báo.
