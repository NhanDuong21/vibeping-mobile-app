# ADR 005 — Rust chia mô-đun và SQLite

- **Trạng thái:** Đã chấp nhận cho V1 ở thời điểm lập quyết định.
- **Quyết định:** Phát hành tệp thực thi Rust 1.98 cho Windows, tổ chức theo tính năng với bộ kết nối tách rõ, dùng SQLite làm dữ liệu chính.
- **Bối cảnh:** Một người dùng cục bộ cần lưu trữ bền vững và phân phối đơn giản.
- **Phương án đã cân nhắc:** Máy chủ Node, nhiều tiến trình/dịch vụ, IndexedDB trên điện thoại làm dữ liệu chính, cơ sở dữ liệu thuê ngoài.
- **Hệ quả:** Một ranh giới vòng đời và giao dịch; quy tắc mô-đun/tệp ngăn `main.rs` phình to. IndexedDB chỉ là bộ đệm có thể dựng lại.
- **Kiểm chứng theo kế hoạch ban đầu:** Kiểm tra nâng cấp cấu trúc, khôi phục sau lỗi, truy cập đồng thời, sao lưu và luồng chức năng hoàn chỉnh.
