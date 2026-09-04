# Kiểm chứng phiên làm việc 1.1.0

Biên bản lịch sử của bản 1.1.0; kết quả cuối ghi nhận ngày 04/09/2026.

## Dữ liệu và tương thích

Nâng cấp 0012 thêm định danh phiên công khai không lộ thông tin nguồn cho mỗi lượt Codex đã băm và bảng giai đoạn do tính năng quản lý. Chỉ chuyển từ bằng chứng sự kiện còn lưu, không thêm toàn hội thoại, lời nhắc hoặc nhật ký công cụ. Kết quả RC8 giữ trên sự kiện gốc.

Danh sách nhóm dùng `GET /api/v1/events?grouped=true`; danh sách không nhóm vẫn có. Chi tiết nhận cả mã phiên công khai và mã thông báo gốc. OpenAPI/TypeScript sinh chứa tóm tắt phiên. Danh sách có trích đoạn và ba mốc cuối; chi tiết có toàn bộ diễn biến/kết quả đã giữ.

Yêu cầu đánh dấu phiên đã đọc có thể gửi mốc cuối đã xem. Mở ngoại tuyến không đánh dấu hộ lần hoàn tất đến sau. Đọc tất cả vẫn là hành động riêng. Tín hiệu mới cập nhật cùng thẻ; câu trả lời muộn bổ sung kết quả. Con trỏ giữ thời gian lúc phân trang, nên cập nhật hàng không dời ranh giới trang.

Bí danh sự kiện gốc cho phép điện thoại gắn kết quả/diễn biến RC8 đã xem về phiên. Kết quả thuộc trang chưa tải nằm trong vùng đệm dự phòng có giới hạn. Liên kết thông báo cũ và liên kết phiên chuẩn đều mở được từ bộ đệm khi ngoại tuyến; danh sách chỉ có một thẻ.

## Phạm vi kiểm thử

- Rust: nhóm vòng đời, mốc thật, thử lại, lượt riêng, phân trang ổn định, thiếu giờ bắt đầu, dừng/hoàn tất, xác nhận đã đọc có giới hạn, liên kết cũ, giữ kết quả, khởi động lại và dọn mốc.
- Angular: thời lượng đang tăng/đóng băng/chưa biết, dữ liệu cũ, đối soát cùng thẻ và chưa đọc; giữ kiểm thử kết quả/bộ đệm/tranh chấp RC8.
- Trình duyệt: cùng định danh DOM qua hoàn tất, lịch sử không lặp thẻ đang làm, diễn biến trước kết quả, sáng/tối/mobile/desktop, WCAG A/AA, tràn ngang, giảm chuyển động, tải lại ngoại tuyến và giữ kết quả.
- `smoke-work-sessions.mjs`: nâng cơ sở dữ liệu RC8 qua hook/notify giả từ tệp thực thi, liên kết cũ, kết quả và khởi động lại. Không đăng ký người nhận thông báo thật.

## Kết quả cuối — 04/09/2026

- Định dạng, lint/kiểu Angular, hợp đồng mới, định dạng Rust và Clippy không cảnh báo: đạt.
- Rust: 129 kiểm thử; Angular: 91 kiểm thử/29 tệp; Gate 0: 6 kiểm thử hàm trình duyệt đều đạt.
- Playwright: 104 kịch bản sáng/tối. Ảnh phiên ở 320/375/430/1024 px khi phù hợp đạt; đã xem đủ 16 ảnh cuối. Đây là mô phỏng Chromium, không phải iPhone thật.
- Tailwind, PWA, kiến trúc (296 tệp), vệ sinh repo và tiếng Việt đạt; cảnh báo độ dài cũ dưới ngưỡng lỗi 500 dòng.
- Build Angular/Windows đạt; gói tải đầu 558,70 kB, trên cảnh báo 491 kB và dưới ngưỡng lỗi 700 kB.
- RustSec đạt với ngoại lệ `RUSTSEC-2023-0071` đã xem xét; kiểm lại ES256 và đường phụ thuộc `web-push-native`. API cũ của pnpm audit hết thời gian/trả HTTP 500; đã kiểm tra đúng 25 phiên bản phụ thuộc chạy qua API bulk advisory npm bằng HTTP Windows, không có cảnh báo. Không đổi thư viện.
- Kiểm tra tệp thực thi đạt nâng dữ liệu RC8, vòng đời phiên, liên kết cũ, gửi/bổ sung kết quả và khởi động lại. ZIP giải nén đạt vòng đời, REST, SSE, PWA, hàng đợi trễ và lưu trữ khi không có công cụ phát triển.
- Nâng service worker thật trong trình duyệt tách biệt: bộ đệm RC8 → người dùng chọn cập nhật 1.1.0 → giao diện ngoại tuyến mới, giữ dữ liệu.
- Đánh giá Impeccable: điểm lỗi bộ đệm RC8 được xác nhận đã xử lý, `disposition: ship` trong phạm vi lỗi đó; 16 ảnh hợp lệ, giữ Quiet signal.
- Nguồn biểu tượng ghi trong metadata PNG, mã băm dữ liệu ảnh giữ nguyên. Đã build/kiểm gói và PWA lại sau thay đổi metadata.

## Gói và máy cài tại thời điểm ghi nhận

Máy cài được sao lưu bằng lệnh RC8 trước nâng cấp. Bản 1.1.0 chạy qua đường khởi động cũ; sức khỏe localhost/riêng và manifest báo 1.1.0. Serve giữ nguyên, Funnel tắt. SHA-256 xác nhận cả ba kết quả cuối, trích đoạn và cờ rút ngắn giữ nguyên. Bằng chứng/bản sao bảo vệ nằm ngoài Git.

Gói: `VibePing-Windows-x64-v1.1.0.zip`.

SHA-256: `4d19e9b5f8106d72b4e50a0d742a834bdb57200dadbc258020b3c21ccf4d42b3`.

Tự động desktop không xác nhận hiển thị iPhone thật, nhận màn hình khóa của bản này hoặc thử dùng dài ngày.
