# ADR 001 — Phạm vi cá nhân, ưu tiên dữ liệu cục bộ

- **Trạng thái:** Đã chấp nhận.
- **Quyết định:** Phục vụ một người, một laptop Windows, một iPhone, một tài khoản Codex và một mạng Tailscale riêng. Windows giữ dữ liệu bền vững; không thêm dịch vụ thuê ngoài.
- **Bối cảnh:** Cần cầu nối thông báo cho quy trình Codex cá nhân với giới hạn chi phí hạ tầng 0 đồng.
- **Phương án đã cân nhắc:** Dịch vụ đám mây nhiều người dùng; lấy điện thoại làm nơi giữ dữ liệu chính; ứng dụng iOS native.
- **Hệ quả:** Ranh giới tin cậy đơn giản, dữ liệu giữ được khi mất mạng; không có đồng bộ nhóm hoặc truy cập ngoài tailnet.
- **Kiểm chứng theo kế hoạch ban đầu:** Gate 0 kiểm tra gửi riêng tư; các giai đoạn sau kiểm tra khôi phục SQLite.
