# VibePing 1.3.3 — Theo dõi đến từng giây

Ghi chú cho bản hiện tại trong repo. Để cài hoặc cập nhật, xem [hướng dẫn vận hành](INSTALL_VI.md).

Trên màn hình chính, thời gian Codex đang làm việc nay hiển thị cả giây, ví dụ **8 phút 12 giây** hoặc **1 giờ 2 phút 3 giây**, và tự cập nhật mỗi giây.

- Giữ nhịp đồng bộ dữ liệu hiện có; cập nhật đồng hồ không tạo thêm yêu cầu mạng.
- Tạm dừng đồng hồ khi ứng dụng ở nền hoặc mất mạng; cập nhật lại thời gian thực khi trở về.
- Giữ thời gian đến tín hiệu cuối khi công việc không còn tín hiệu mới. Thời gian đã hoàn tất không tiếp tục tăng.
- Dùng chữ số đều nhau và không đọc lại bộ đếm mỗi giây qua trình đọc màn hình.
- Giữ cách chặn thông báo hoàn tất từ tác nhân phụ của bản 1.3.2.

## Cập nhật

Trên Windows, tắt Sẵn sàng, chạy **Stop VibePing.bat**, đợi khay đóng và sao lưu bằng `vibeping.exe backup`. Thay toàn bộ tệp trong thư mục cài đặt bằng gói mới, giữ dữ liệu và đường dẫn cũ, rồi mở lại **Bat San sang.bat** hoặc **Start VibePing.bat**.

Trên iPhone, mở VibePing trên kết nối riêng, chờ **Có bản VibePing mới — Phiên bản 1.3.3** rồi bấm **Cập nhật**. Không cần cài lại hoặc đăng ký thông báo lại.
