# Giai đoạn 5 — Hạn mức Codex trong sản phẩm

Biên bản lịch sử của giai đoạn 5.

- **Phạm vi:** giám sát App Server, chuẩn hóa động, lưu trữ, cảnh báo ngưỡng, REST/SSE, tóm tắt và chi tiết mobile.
- **Kết quả:** tự động và đọc tài khoản thật đạt; hiển thị trên iPhone cần người dùng kiểm tra.
- **Phương thức:** `initialize`, `initialized`, `account/read`, `account/rateLimits/read`, `account/rateLimits/updated`.
- **Làm mới:** khi khởi động, hoàn tất liên quan, App Server cập nhật, người dùng yêu cầu và đọc dự phòng mỗi 10 phút.
- **Khôi phục:** đọc tuần tự, giữ dữ liệu tốt gần nhất với nhãn cũ, thử chạy lại tiến trình con sau 1/5/20/60 giây.

## Bằng chứng tự động

- Mẫu tài khoản bao phủ chưa đăng nhập, đăng nhập được hỗ trợ và API key không hỗ trợ; không trả trường danh tính.
- Chuẩn hóa một/nhiều nhóm, khung primary/secondary, thời lượng lạ, tên null/không an toàn, phần trăm ngoài miền và hết hạn mức.
- Lưu trữ kiểm tra tiến triển thấp/rất thấp/hết một lần mỗi chu kỳ, chu kỳ mới, dữ liệu cũ tốt gần nhất và giao dịch hoạt động/outbox.
- Giao thức giữ thông báo xen kẽ, từ chối JSONL sai, nhận EOF, giới hạn thời gian yêu cầu, gộp lần làm mới đồng thời và giới hạn thời gian chạy lại.
- Angular kiểm tra tóm tắt động, nhãn trạng thái, giờ đặt lại và SSE; giao diện dùng thanh hạn mức dễ tiếp cận, tiết chế, không đoán số lời nhắc.

## Đọc tài khoản thật

Tệp phát hành chạy ở cổng loopback phụ đạt trạng thái `available` với tài khoản Codex đang đăng nhập và trả ba khung chuẩn hóa có nhãn an toàn. Tiến trình dừng đúng cách.

Quét SQLite bằng chứng được Git bỏ qua không thấy mẫu email, bearer token hoặc khóa bí mật OpenAI. Tài liệu Git không ghi phần trăm thật, giờ đặt lại, danh tính tài khoản, mã nhóm nội bộ hoặc đường dẫn tệp thực thi.
