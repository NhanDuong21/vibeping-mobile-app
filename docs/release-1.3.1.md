# VibePing 1.3.1 — Gom đúng công việc cùng đoạn chat

Các công việc hỗ trợ do agent phụ thực hiện trong cùng đoạn chat nay nằm chung với công việc chính. Bản sửa áp dụng cho cả lịch sử đã lưu và bộ nhớ trên điện thoại.

- Xác định công việc cha bằng quan hệ agent mà Codex cung cấp. Các đoạn chat độc lập và bản fork do người dùng tạo vẫn giữ riêng.
- Yêu cầu chính gần nhất cùng kết quả của nó luôn mở đầu. Kết quả hỗ trợ mở rộng ngay bên trong công việc, giữ nguyên nội dung và diễn biến.
- Giữ liên kết công việc cũ, đích đến chính xác của thông báo, trạng thái đã đọc và các kết quả đã lưu để đọc khi mất mạng.
- Khi thiếu thông tin nhóm, VibePing thử đối chiếu lại trong lúc máy đang chạy. Không tạo hoạt động hoặc gửi thông báo hoàn tất chỉ vì gom lại lịch sử.

## Cập nhật

1. Trên Windows, tắt Sẵn sàng bằng **Tat San sang.bat**, rồi chạy **Stop VibePing.bat**. Đợi khay đóng và tạo bản sao lưu bằng `vibeping.exe backup`.
2. Thay toàn bộ tệp trong thư mục đang cài bằng gói mới, giữ nguyên đường dẫn cài đặt và dữ liệu.
3. Mở **Bat San sang.bat** nếu dùng Sẵn sàng, hoặc **Start VibePing.bat** để chạy thủ công.
4. Trên iPhone, mở VibePing trên kết nối riêng, chờ **Có bản VibePing mới — Phiên bản 1.3.1**, rồi bấm **Cập nhật**.

Không cần cài lại biểu tượng, ghép nối hoặc đăng ký thông báo lại. Bản này bổ sung bảng quan hệ công việc; mã và nội dung của các kết quả cũ được giữ nguyên. VibePing tự sao lưu trước khi cập nhật cấu trúc dữ liệu.
