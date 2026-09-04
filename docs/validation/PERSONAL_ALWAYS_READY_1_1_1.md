# Kiểm chứng Cá nhân hóa và Sẵn sàng 1.1.1

Biên bản lịch sử; các kết quả dưới đây được ghi ngày 04/09/2026.

## Phạm vi và dữ liệu

Nâng cấp 0013 thêm hồ sơ/quy tắc dự án do tính năng quản lý và dấu phân loại một lời nhắc chờ trong outbox hiện có. Giữ mã phiên, mốc, kết quả cuối, ghép nối và đăng ký thông báo. Hồ sơ chỉ dùng tên cuối thư mục đã lọc; repo cùng tên cuối dùng chung hồ sơ.

Công tắc chung quyết định cuối. Hoàn tất thành công mặc định từ hai phút quan sát; không biết bắt đầu vẫn cho gửi, kiểm thử cuối lỗi không bị ngưỡng thời lượng chặn. Nhắc chờ mặc định năm phút, chống trùng mỗi lượt/đăng ký và hủy khi tiếp tục. Hàng đợi kiểm tra lại quy tắc, trạng thái chờ, giờ yên tĩnh và riêng tư, gồm tên dự án tùy chỉnh.

Tổng kết ngày lấy từ các mốc còn lưu theo ngày địa phương điện thoại; khoảng trùng tính một lần. Không phải thời gian CPU, phân tích hoặc điểm năng suất. SQLite giữ dữ liệu chính; IndexedDB đệm hồ sơ/quy tắc/tổng kết có thể dựng lại. Bộ kiểm thử cũ tiếp tục bảo vệ phiên và kết quả cuối.

## Kiểm tra tự động — 04/09/2026

- Rust: **142 kiểm thử đạt**; format/Clippy không cảnh báo đạt.
- Angular: **103 kiểm thử/32 tệp đạt**; tranh chấp lưu hồ sơ, bộ đệm dự phòng, lọc lịch sử, ranh giới ngày, linh vật và độ mới Windows. Quay lại ứng dụng/trang và kiểm tra mỗi 30 giây không giữ trạng thái khỏe cũ; lỗi/dữ liệu cũ hiện giờ kiểm tra trước.
- Playwright: **108 kịch bản đạt** sáng/tối. Sau hai sửa đổi từ đánh giá, bốn kịch bản liên quan chạy lại đạt trên tệp cuối, gồm Windows cũ và nhãn màu tiếng Việt. 16 ảnh gồm sáng/tối, dự án ở 320/390/1024 px, lịch sử, Cài đặt mới/cũ, Hoạt động và Hôm nay; đây là mô phỏng Chromium.
- Format, lint/kiểu, hợp đồng, tiếng Việt, kiến trúc (339 tệp), vệ sinh repo, JS/PWA Gate 0 và sáu kiểm thử hàm đạt. Cảnh báo độ dài cũ dưới 500 dòng.
- Tailwind/Angular/Windows build đạt; gói tải đầu **559,38 kB**, trên cảnh báo 491 kB và dưới lỗi 700 kB.
- Kiểm toán phụ thuộc đạt. npm thử lại sau lỗi mạng rồi không báo lỗ hổng đã biết. RustSec đạt với ngoại lệ `RUSTSEC-2023-0071`; đã kiểm tra ES256 và phụ thuộc gián tiếp. Không đổi phiên bản thư viện.
- Windows thật: tệp khởi chạy GUI subsystem, đăng ký khay, một tiến trình đồng hành, máy chủ lỗi/khôi phục, Dừng vẫn tắt qua hai nhịp kiểm tra và tắt đồng hành sạch đều đạt. Dùng thư mục dữ liệu tách biệt, không đăng ký tự chạy cho bản thử.
- Service worker thật **1.1.0 → 1.1.1**: kích hoạt chủ động, giao diện ngoại tuyến mới và giữ dữ liệu đạt, kể cả lần lặp trên tệp cuối.
- ZIP giải nén đạt vòng đời, sức khỏe riêng, PWA, REST/SSE, hạn mức, sự kiện giả, hàng đợi trễ và giữ dữ liệu qua khởi động lại khi không có công cụ phát triển.
- Impeccable xác nhận hai điểm đã xử lý, `disposition: ship` trong phạm vi danh sách sửa; 16 ảnh hợp lệ, công cụ tự động không có phát hiện. Ba ảnh raster cũ giữ nguồn gốc, không thêm ảnh linh vật.

## Gói và máy cài tại thời điểm ghi nhận

Gói: `VibePing-Windows-x64-v1.1.1.zip`.

SHA-256: `c98568b1c86aad87236c7b93c612d98437ac8685e3853a0734d3dae9c51a0107`.

Đã sao lưu tệp 1.1.0/hướng dẫn và tạo gói dữ liệu bảo vệ sau dừng an toàn. Cài đặt ban đầu bị duyệt tự động chặn; sau khi chủ sở hữu cho phép rõ ràng, 1.1.1 được cài ở đường cũ và chạy thành công. Sức khỏe localhost/HTTPS riêng và manifest đều báo 1.1.1.

Sẵn sàng được bật tại lần ghi nhận: máy chủ khỏe, khay hoạt động, tự chạy khi đăng nhập bật. Mục HKCU Run được đối chiếu với tệp khởi chạy GUI ở đường cài ổn định. Điều này xác nhận cấu hình, không thay thử đăng xuất/đăng nhập thật.

Kiểm tra SHA-256 chỉ đọc xác nhận bảy kết quả cuối, trích đoạn/cờ rút ngắn, chủ sở hữu, hai đăng ký và VAPID giữ nguyên. Tệp cài khớp gói 1.1.1. Serve giữ nguyên, Funnel tắt. Bản sao/bằng chứng nằm ngoài Git.

## Giới hạn nghiệm thu

Tiến trình đồng hành dùng đường cài ổn định, một mục HKCU Run, điều khiển cục bộ xác thực và khóa chạy một phiên; không giết PID tùy ý, không cho điện thoại điều khiển. Chỉ truy cập qua Serve riêng.

Đăng xuất/đăng nhập Windows thật, diện mạo/thao tác menu khay, hiển thị/nhận màn hình khóa iPhone và dùng dài ngày chưa được xác nhận bằng tự động. Kiểm tra native thật chứng minh đăng ký khay và khôi phục, không thay các bước này.
