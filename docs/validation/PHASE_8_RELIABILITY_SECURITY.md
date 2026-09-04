# Giai đoạn 8 — Độ tin cậy, khôi phục và bảo mật

Ngày ghi nhận: 02/09/2026.

## Phạm vi

- SQLite: WAL, khóa ngoại, thời gian chờ khóa, tạo mới/nâng từ cấu trúc cũ, sao lưu trước nâng cấp, hoàn nguyên đúng dữ liệu khi lỗi, dọn lịch sử lúc khởi động và thông báo lỗi dễ hiểu.
- Lệnh `doctor`, `backup`, `restore` và đặt lại thông báo; hai thao tác sau cần xác nhận, có kiểm tra hoàn nguyên; dừng bình thường không cưỡng bức.
- Khôi phục có giới hạn cho dữ liệu tiến trình cũ, dừng đột ngột, đóng SSE, phát lại spool/outbox, hết hạn quyền xử lý, App Server lỗi, mất mạng tạm, kết quả dịch vụ gửi, việc hết hạn và đăng ký cũ.
- Ràng buộc loopback/Host riêng, phát hiện Funnel và chặn an toàn, origin/CSRF/chủ sở hữu, header bảo mật, hiển thị nội dung như văn bản, lọc log/chẩn đoán, quét thư viện/bí mật và ACL người dùng/SYSTEM.
- Ghép/sửa/gỡ tích hợp Codex, chọn tệp thực thi, xử lý thiếu/không tương thích và kiểm tra cấm đọc tệp đăng nhập.

## Bằng chứng tự động

57 kiểm thử đơn vị Rust sản phẩm cùng tích hợp CLI/HTTP bao phủ bản sao dữ liệu/hoàn nguyên, lỗi tiến trình, lệnh khôi phục, ACL, header, mất Tailscale, phân loại gửi, chống trùng quyền xử lý, TTL, đăng ký cũ, ranh giới Codex và lọc dữ liệu.

15 kiểm thử Angular gồm từ chối bộ đệm IndexedDB hỏng, giữ SQLite là nguồn chính. 40 Playwright sáng/tối gồm thay bộ đệm hỏng và không thực thi mã đánh dấu trong nội dung. Hợp đồng mới, lint/kiểu/build Angular, format/Clippy/test/release Rust, kiến trúc và vệ sinh repo đạt.

Tại lần ghi nhận, `pnpm audit --prod --audit-level high` không báo lỗ hổng JavaScript sản phẩm đã biết. `cargo audit --deny warnings` đạt với một ngoại lệ đã xem xét: `RUSTSEC-2023-0071`, cảnh báo thời gian RSA chưa có bản sửa của phụ thuộc gián tiếp từ `web-push-native`. Cả hai đường VibePing chỉ dùng ES256 VAPID; kiểm tra mã sẽ lỗi nếu có thao tác RSA. Đây là kết quả lịch sử, không thay cho lần kiểm toán phụ thuộc mới.

## Bảo vệ trên Windows

Thư mục dữ liệu bỏ quyền kế thừa và cấp toàn quyền đệ quy chỉ cho SID người dùng hiện tại và Local System. Cách này bảo vệ SQLite, VAPID, thông tin điều khiển, log và bản sao tại chỗ mà không đổi danh tính VAPID đã có.

Gói sao lưu chứa danh tính gửi nên nhạy cảm; chỉ tạo trong thư mục được bảo vệ, không in nội dung. Mã độc cùng quyền và bản sao chuyển ra ngoài vẫn là rủi ro còn lại.

## Cần người dùng xác nhận

Không tuyên bố kết quả iPhone thật. Giai đoạn 10 còn kiểm tra gói cuối, địa chỉ riêng, khôi phục đăng ký trong phạm vi tự động làm được, thông báo trễ màn hình khóa và quay lại bản cũ. Thử dùng bảy ngày bắt đầu sau chuyển sang bản ứng viên.
