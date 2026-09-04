# VibePing 1.2.0 — Phiên làm việc

Màn Hoạt động gọn hơn: mỗi tác vụ Codex chỉ xuất hiện một lần, dù bạn đã gửi nhiều yêu cầu trong tác vụ đó.

- Một phiên chứa nhiều lượt làm việc. Gửi yêu cầu mới cập nhật phiên và đưa phiên lên đầu; hai tác vụ trong cùng dự án vẫn tách riêng.
- Mở **Chi tiết phiên làm việc** để xem lượt hiện tại và danh sách các lượt. Các lượt cũ tải thêm khi cần.
- **Chi tiết lượt làm việc** giữ nguyên diễn biến và kết quả Codex đã lưu, thêm vị trí lượt, mốc thời gian và điều hướng lượt trước/sau.
- Chỉ báo cần chú ý khi vấn đề còn hiệu lực. Kiểm thử từng chưa đạt nhưng sau đó đã đạt được hiển thị như lịch sử.
- Liên kết thông báo cũ vẫn mở đúng lượt. Hoạt động thiếu định danh phiên vẫn đọc được riêng; không ghép bằng tên dự án.
- Bộ nhớ đệm từ bản cũ được ghép lại bằng định danh lượt đã xác nhận, giữ kết quả đã đọc và tránh lặp phiên sau cập nhật.

## Cập nhật

1. Trên Windows, mở **Tat San sang.bat** rồi **Stop VibePing.bat**. Đợi khay đóng và tạo bản sao lưu bằng `vibeping.exe backup`.
2. Thay toàn bộ tệp trong thư mục đang cài bằng gói mới; giữ nguyên dữ liệu và đường dẫn cài đặt.
3. Mở lại **Bat San sang.bat** nếu đang dùng Sẵn sàng, hoặc **Start VibePing.bat** để chạy thủ công.
4. Trên iPhone, mở VibePing, chờ **Có bản VibePing mới — Phiên bản 1.2.0**, rồi bấm **Cập nhật**. Không cần xóa biểu tượng, ghép nối hay đăng ký thông báo lại.

Tên phiên và thời gian chỉ dùng dữ liệu đã lưu. Nếu thiếu tên, app dùng tên trung tính; nếu thiếu thời điểm bắt đầu, app không tính thời lượng. Kết quả đã bị giới hạn dung lượng ở bản cũ vẫn giữ nguyên phần đã lưu và lời giải thích trong chi tiết. Số lượt phản ánh lịch sử còn được giữ theo cài đặt thời gian lưu.
