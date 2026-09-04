# VibePing 1.3.2 — Thông báo đúng công việc chính

Ghi chú lịch sử cho phiên bản trong tiêu đề. Để cài hoặc cập nhật bản hiện tại, xem [hướng dẫn vận hành](INSTALL_VI.md).

Sửa lỗi iPhone nhận thông báo hoàn tất khi tác nhân phụ đã trả kết quả nhưng Codex vẫn đang làm yêu cầu chính.

- Chỉ gửi thông báo hoàn tất của công việc chính đã được xác định bằng quan hệ cha-con từ Codex. Kết quả và lỗi kiểm thử cuối của tác nhân phụ vẫn nằm trong lịch sử, không gửi thông báo hoàn tất riêng.
- Nếu chưa xác định được quan hệ cha-con, giữ thông báo chờ đối chiếu lại; không mặc định đó là công việc chính. Thông báo chưa xác định được sẽ hết hạn theo thời hạn hiện có.
- Kiểm tra lại nguồn của từng thông báo trước mỗi lần gửi, kể cả hàng đợi từ bản cũ, lần gửi lại hoặc sau khi khởi động lại.
- Giữ các thông báo cần bạn cho phép, bản xem trước và hạn mức theo cài đặt hiện tại.

## Cập nhật

1. Trên Windows, tắt Sẵn sàng bằng **Tat San sang.bat**, rồi chạy **Stop VibePing.bat**. Đợi khay đóng và sao lưu bằng `vibeping.exe backup`.
2. Thay toàn bộ tệp trong thư mục cài đặt bằng gói mới, giữ nguyên đường dẫn và dữ liệu.
3. Mở **Bat San sang.bat** nếu dùng Sẵn sàng, hoặc **Start VibePing.bat** để chạy thủ công.
4. Trên iPhone, mở VibePing trên kết nối riêng, chờ **Có bản VibePing mới — Phiên bản 1.3.2**, rồi bấm **Cập nhật**.

Không cần cài lại biểu tượng, ghép nối hoặc đăng ký thông báo lại. Thông báo đã gửi trước khi cập nhật có thể vẫn còn trong Trung tâm thông báo của iPhone.
