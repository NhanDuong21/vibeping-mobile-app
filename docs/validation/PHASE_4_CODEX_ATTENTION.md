# Giai đoạn 4 — Lưu bền vững tín hiệu Codex

Biên bản lịch sử của giai đoạn 4; không mô tả trạng thái đang chạy trên máy hiện tại.

- **Phạm vi:** notify/hook được hỗ trợ, ghép cấu hình an toàn, nhận qua kênh riêng, chuẩn hóa trạng thái, hoạt động SSE và hàng đợi thông báo đủ điều kiện.
- **Kết quả:** triển khai và kiểm tra tự động đạt; tin cậy hook thật và hiển thị iPhone vẫn do người dùng kiểm tra.
- **Ranh giới Codex:** chỉ notify cấp người dùng, `hooks.json`, JSON sự kiện vòng đời và duyệt tin cậy qua `/hooks`.
- **Riêng tư:** không đọc transcript; không đưa lời nhắc, câu trả lời, đầu vào/kết quả công cụ, đường dẫn đầy đủ, thông tin đăng nhập, email hay dữ liệu đăng ký vào bằng chứng được Git theo dõi.
- **Cùng tồn tại:** giữ nhóm hook cũ, chuyển tiếp notify trước; cài/sửa lặp lại an toàn, chỉ gỡ mục thuộc VibePing.
- **Khôi phục:** Dừng chủ động bỏ tín hiệu đến sau; mất tiến trình bất ngờ khi đang bật chỉ ghi bản chuẩn hóa có giới hạn vào spool nguyên tử, xử lý lại đúng một lần.

## Bằng chứng tự động

Rust kiểm tra lọc dữ liệu, phân loại tín hiệu, lỗi kiểm thử giữa chừng rồi đạt, lỗi cuối chưa sửa, chống trùng hook/notify, chọn tệp tương thích, cùng tồn tại hook, IPC có token, Dừng và xử lý spool một lần.

CLI đã chạy `install`, `status`, `repair`, `remove` trong môi trường tách biệt với tệp Codex tương thích tìm được, không sửa cấu hình thật. OpenAPI/TypeScript sinh có trạng thái công việc hiện tại và hoạt động gần đây. Angular kiểm tra công việc và đọc lại theo SSE; lint, kiểm tra kiểu và biên dịch đạt.

## Cần người dùng xác nhận

Sau khi cài tệp phát hành cuối, mở Codex, chạy `/hooks`, xem và tin cậy đúng định nghĩa VibePing. Sau đó kiểm tra thật các tình huống bắt đầu, xin phép, lỗi/sửa/đạt, lỗi cuối, bản xem trước, hoàn tất và trùng sự kiện. Dịch vụ gửi chấp nhận không chứng minh iPhone đã hiện thông báo.
