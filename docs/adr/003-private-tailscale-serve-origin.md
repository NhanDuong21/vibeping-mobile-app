# ADR 003 — Địa chỉ riêng qua Tailscale Serve

- **Trạng thái:** Đã chấp nhận.
- **Quyết định:** Dùng Tailscale Serve xử lý HTTPS ổn định `.ts.net` rồi chuyển tiếp đến Rust chỉ lắng nghe trên localhost. Tuyệt đối không dùng Funnel.
- **Bối cảnh:** Web Push trên iPhone cần địa chỉ an toàn, ổn định mà không cần tên miền trả phí hoặc đám mây công khai.
- **Phương án đã cân nhắc:** Quick Tunnel, tên miền/VPS trả phí, IP mạng nội bộ với TLS tự ký, Funnel.
- **Hệ quả:** Thiết bị phải thuộc tailnet. Giữ và khôi phục cấu hình Serve mà không đụng tuyến không liên quan.
- **Kiểm chứng theo kế hoạch ban đầu:** Gate 0: HTTPS riêng, tên máy ổn định, iPhone dùng dữ liệu di động qua Tailscale, đăng ký còn hoạt động sau khởi động lại.
