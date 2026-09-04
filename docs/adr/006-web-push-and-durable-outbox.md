# ADR 006 — Web Push tiêu chuẩn và hàng đợi bền vững

- **Trạng thái:** Đã chấp nhận; Gate 0 kiểm chứng nền tảng gửi.
- **Quyết định:** Gửi tín hiệu nền bằng Web Push tiêu chuẩn có mã hóa. Bản sản phẩm dùng hàng đợi outbox trong SQLite.
- **Bối cảnh:** Cần thông báo màn hình khóa/chạy nền trên iPhone mà không có ứng dụng native.
- **Phương án đã cân nhắc:** Đọc định kỳ, email, ứng dụng phụ thuộc Firebase, SMS, APNs native.
- **Hệ quả:** Người dùng chủ động cài lên Màn hình chính và cấp quyền. Danh tính VAPID/đăng ký phải được giữ; thiết bị hết hiệu lực và lần thử lại cần quy tắc vòng đời.
- **Kiểm chứng theo kế hoạch ban đầu:** Ma trận iPhone thật và khởi động lại Gate 0; sau đó kiểm tra ghi hàng đợi nguyên tử và thử lại.
