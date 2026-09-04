# ADR 007 — Nhận sự kiện Codex qua notify và hook

- **Trạng thái:** Được đề xuất ở giai đoạn nền tảng; triển khai sau đó được ghi tại [giai đoạn 4](../validation/PHASE_4_CODEX_ATTENTION.md).
- **Quyết định:** Ưu tiên đường sự kiện notify/hook được Codex hỗ trợ, chuẩn hóa thành sự kiện nghiệp vụ VibePing. Không trích xuất giao diện hoặc nội dung terminal.
- **Bối cảnh:** Tín hiệu hoàn tất và cần người dùng quay lại phải có ranh giới tích hợp đáng tin.
- **Phương án đã cân nhắc:** OCR, đọc giao diện Codex định kỳ, phân tích nội dung console, suy đoán từ hệ thống tệp.
- **Hệ quả:** Theo đúng dữ liệu giao thức được hỗ trợ, có thể cần kiểm tra tương thích phiên bản. Không tạo mã khung trong giai đoạn 0.
- **Kiểm chứng theo kế hoạch ban đầu:** Một phần triển khai sau phải chứng minh sự kiện thật, chống trùng, khôi phục sau khởi động lại và diễn đạt lỗi an toàn.
