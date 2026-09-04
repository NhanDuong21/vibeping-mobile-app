# ADR 009 — Chỉ viết kiểu dáng bằng Tailwind

- **Trạng thái:** Đã chấp nhận.
- **Quyết định:** Chỉ dùng lớp tiện ích Tailwind cho màn hình/component. Giữ một tệp đầu vào toàn cục tối thiểu cho Tailwind, giá trị thiết kế và yêu cầu nền tảng; không sửa tay đầu ra được sinh.
- **Bối cảnh:** Một cách viết thống nhất giúp tránh giao diện mặc định Ionic lệch hướng và kiểu dáng rải rác.
- **Phương án đã cân nhắc:** SCSS, CSS component, CSS modules, Tailwind CDN, phối nhiều cách viết.
- **Hệ quả:** Template nhiều lớp cần kỷ luật; giá trị thiết kế tập trung phải gọn; chỉ nhập CSS toàn cục framework khi không tránh được.
- **Kiểm chứng theo kế hoạch ban đầu:** Kiểm tra tĩnh PWA, công cụ Impeccable, rà soát mã và quy tắc kiến trúc Angular ở giai đoạn sau.
