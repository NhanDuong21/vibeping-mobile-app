# ADR 010 — Quy trình thiết kế Impeccable

- **Trạng thái:** Đã chấp nhận.
- **Quyết định:** Cài Impeccable trong dự án và dùng cho mọi phần người dùng nhìn thấy. Gate 0 áp dụng `shape`, `critique`, `harden` và `adapt`.
- **Bối cảnh:** Công cụ cần được thiết kế có chủ đích, dễ tiếp cận; bản thử nghiệm chẩn đoán không cần trở thành trang quảng cáo.
- **Phương án đã cân nhắc:** Tác nhân tự đặt kiểu dáng tùy lúc; xây hệ thống thiết kế lớn trước khi chứng minh sản phẩm; dùng giao diện framework chưa rà soát.
- **Hệ quả:** `PRODUCT.md` và `DESIGN.md` giữ định hướng lâu dài. Công việc giao diện có số vòng kiểm tra giới hạn, dựa trên bằng chứng và tuân theo phạm vi sản phẩm.
- **Kiểm chứng theo kế hoạch ban đầu:** Hook dự án đã được tin cậy, kiểm tra tự động, ảnh ở bề rộng mục tiêu và rà soát cuối có giới hạn.
