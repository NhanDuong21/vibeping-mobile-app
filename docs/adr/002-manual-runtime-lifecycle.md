# ADR 002 — Khởi động và dừng do người dùng quyết định

- **Trạng thái:** Được thay thế một phần bởi [ADR 011](011-personal-and-always-ready.md), theo yêu cầu rõ ràng của chủ sở hữu cho bản 1.1.1.
- **Quyết định:** Giữ Khởi động, Dừng và Khởi động lại thủ công. Tự chạy khi đăng nhập Windows và tự khôi phục chỉ có khi chủ động bật. Dừng ngăn tự khôi phục cho đến khi chọn Khởi động hoặc lần đăng nhập tiếp theo nếu đã bật.
- **Bối cảnh:** Hoạt động của công cụ cá nhân cần dễ nhận biết và có thể đảo ngược.
- **Phương án đã cân nhắc:** Windows service, thư mục Startup, tác vụ theo lịch.
- **Hệ quả:** Điện thoại có thể báo phía laptop đang tắt; tệp lệnh phải dễ dùng và giữ dữ liệu qua khởi động lại.
- **Kiểm chứng theo kế hoạch ban đầu:** Gate 0 kiểm tra chạy một phiên, dừng an toàn và khởi động lại giữ cùng origin.
