# Gate 1 — Đọc hạn mức Codex

- **Mục tiêu:** chứng minh Rust đọc hạn mức tài khoản thật đã đăng nhập qua Codex App Server, không đọc thông tin đăng nhập hoặc trích giao diện.
- **Kết quả ghi nhận:** đạt (PASS), ngày 02/09/2026.
- **Phiên bản Codex:** `codex-cli 0.151.0-alpha.7.2`.
- **Kênh:** stdio JSONL/JSON-RPC mặc định.
- **Phương thức:** `initialize`, `initialized`, `account/read`, `account/rateLimits/read`.

## Kết quả kiểm chứng

- Tài khoản ChatGPT đã đăng nhập; không ghi email.
- Nhận ba khung hạn mức đã chuẩn hóa từ dữ liệu động, gồm cả primary và secondary.
- 14 kiểm thử Rust Gate 1 đạt: tách thông điệp, thông báo xen kẽ, hết thời gian chờ, dữ liệu sai, chưa đăng nhập/chỉ dùng API key, chặn phần trăm ngoài miền, nhãn, định dạng giờ, ưu tiên nhiều nhóm và lọc thông tin nhạy cảm.
- Lần đọc thật trả ít nhất một khung; CLI hiển thị phần trăm còn lại, thời lượng và giờ đặt lại địa phương bằng tiếng Việt.
- JSON trong thư mục chạy được Git bỏ qua không có mẫu email, bearer token hoặc token `sk-`. Tài liệu Git không ghi phần trăm thật hay định danh riêng.
- Không đọc hoặc in tệp đăng nhập Codex, cookie, header xác thực hoặc token truy cập.

## Điều kiện đạt

Đã thỏa mãn ngày 02/09/2026. Chế độ chỉ có API key hoặc đăng nhập không hỗ trợ được xử lý bằng trạng thái lỗi rõ ràng; không tạo số liệu thay thế.
