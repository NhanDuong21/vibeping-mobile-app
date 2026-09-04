# VibePing 1.3.0 — Chi tiết công việc

Từ Hoạt động, mở một công việc là đọc được ngay diễn biến và kết quả Codex. Yêu cầu gần nhất mở sẵn; các yêu cầu cũ mở rộng ngay tại chỗ. Công việc chỉ có một yêu cầu không còn nhãn phân cấp.

- Mỗi tác vụ Codex vẫn xuất hiện một lần; các tác vụ cùng dự án giữ riêng lịch sử.
- Khi không có việc đang chạy, trạng thái thu gọn thành **Codex đang nghỉ**. Công việc hoàn tất nằm trong danh sách Gần đây.
- Dòng lịch sử gọn hơn, có tên, dự án, số yêu cầu, trạng thái và giờ cập nhật. Không còn thời lượng tổng dễ gây hiểu nhầm.
- Preview dùng một câu dễ đọc; nội dung review kỹ thuật và đường dẫn được giữ trong kết quả đầy đủ. Tên bị thiếu có thêm giờ để phân biệt.
- Liên kết từ thông báo mở đúng yêu cầu trong công việc. Các kết quả đã đọc vẫn mở được khi mất mạng; cập nhật trực tiếp và tuỳ chọn chuyển động được giữ nguyên.

## Cập nhật

1. Trên Windows, mở **Tat San sang.bat**, rồi **Stop VibePing.bat**. Đợi khay đóng và tạo bản sao lưu bằng `vibeping.exe backup`.
2. Thay toàn bộ tệp trong thư mục đang cài bằng gói mới; giữ nguyên dữ liệu và đường dẫn cài đặt.
3. Mở lại **Bat San sang.bat** nếu đang dùng Sẵn sàng, hoặc **Start VibePing.bat** để chạy thủ công.
4. Trên iPhone, mở VibePing, chờ **Có bản VibePing mới — Phiên bản 1.3.0**, rồi bấm **Cập nhật**. Không cần xóa biểu tượng, ghép nối hay đăng ký thông báo lại.

Bản này giữ cấu trúc dữ liệu của 1.2.0 và không thêm migration. Số yêu cầu phản ánh lịch sử còn được giữ theo cài đặt thời gian lưu. Kết quả cũ giữ nguyên phần đã lưu, kể cả thông báo giới hạn dung lượng nếu có.
