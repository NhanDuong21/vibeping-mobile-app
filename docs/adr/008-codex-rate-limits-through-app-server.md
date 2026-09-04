# ADR 008 — Đọc hạn mức Codex qua App Server

- **Trạng thái:** Đã chấp nhận; Gate 1 kiểm chứng.
- **Quyết định:** Chạy `codex app-server` đã đăng nhập, dùng stdio JSONL với `account/read` và `account/rateLimits/read`; giai đoạn sau nhận `account/rateLimits/updated`.
- **Bối cảnh:** Cần hạn mức ChatGPT/Codex thật mà không quản lý thông tin đăng nhập.
- **Phương án đã cân nhắc:** Đọc tệp đăng nhập, trích nội dung `/status`, gọi API không được công bố, tự ước tính mức dùng.
- **Hệ quả:** Chuẩn hóa nhóm hạn mức động và chế độ tài khoản, xử lý thông điệp xen kẽ/hết thời gian chờ; không in email hoặc token.
- **Kiểm chứng theo kế hoạch ban đầu:** Dữ liệu mẫu Gate 1 và ít nhất một khung hạn mức từ tài khoản thật đã đăng nhập.
