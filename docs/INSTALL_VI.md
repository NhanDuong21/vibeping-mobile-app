# Cài và vận hành VibePing 1.3.3

Giải nén toàn bộ ZIP Windows x64 vào một thư mục ổn định, không chạy từ trong ZIP. Laptop và iPhone dùng cùng mạng Tailscale riêng (tailnet). Chỉ dùng **Tailscale Serve**, không bật Funnel. Máy sử dụng không cần Node.js, pnpm, Rust hoặc Cargo.

## Cài lần đầu

1. Kết nối Tailscale trên laptop và iPhone.
2. Mở **Start VibePing.bat** để chạy thủ công. Ghi mã ghép nối nếu được hiển thị.
3. Mở địa chỉ HTTPS riêng của VibePing bằng Safari trên iPhone; chọn **Chia sẻ → Thêm vào MH chính**.
4. Đóng Safari, mở biểu tượng VibePing mới. Nhập mã ghép nối nếu được yêu cầu.
5. Bấm **Bật thông báo** trong ứng dụng rồi cấp quyền khi iOS hỏi.
6. Nếu muốn VibePing chạy khi đăng nhập Windows và tự khôi phục có giới hạn, mở **Bat San sang.bat**.

## Cập nhật từ bản cũ

1. Mở **Tat San sang.bat**, rồi **Stop VibePing.bat**. Đợi biểu tượng khay biến mất.
2. Sau khi VibePing dừng, sao lưu bằng `.\vibeping.exe backup` tại thư mục cài.
3. Chép toàn bộ tệp gói mới vào đúng thư mục đang cài. Giữ đường dẫn ổn định để tích hợp Codex tìm được ứng dụng; giữ dữ liệu cục bộ, ghép nối và đăng ký thông báo.
4. Mở lại **Bat San sang.bat** nếu trước đó dùng Sẵn sàng, hoặc **Start VibePing.bat** để chạy thủ công.
5. Trên iPhone, mở VibePing từ Màn hình chính. Khi thấy **Có bản VibePing mới — Phiên bản 1.3.3**, bấm **Cập nhật**.

Không cần xóa biểu tượng, ghép nối hoặc đăng ký thông báo lại khi cập nhật bình thường. Xem [thay đổi bản 1.3.3](release-1.3.3.md).

## Các tệp lệnh Windows

| Tệp                      | Tác dụng                                                            |
| ------------------------ | ------------------------------------------------------------------- |
| **Start VibePing.bat**   | Khởi động nền và kiểm tra sẵn sàng.                                 |
| **Stop VibePing.bat**    | Dừng an toàn, giữ dữ liệu và Tailscale.                             |
| **Restart VibePing.bat** | Dừng rồi khởi động lại.                                             |
| **Open VibePing.bat**    | Mở địa chỉ riêng bằng trình duyệt mặc định.                         |
| **Bat San sang.bat**     | Bật khay, chạy khi đăng nhập và tự khôi phục có giới hạn.           |
| **Tat San sang.bat**     | Tắt khay, tự chạy và tự khôi phục; giữ trạng thái máy chủ hiện tại. |

## Khay Windows và Sẵn sàng

Tìm VibePing trong khay hoặc nhóm biểu tượng ẩn. Nhấp phải để mở ứng dụng, khởi động, dừng, đổi lựa chọn đăng nhập hoặc tắt Sẵn sàng.

**Dừng** giữ máy chủ tắt cho đến khi bạn chọn Khởi động hoặc đăng nhập Windows lần tiếp theo nếu đã bật lựa chọn đó. **Tat San sang.bat** không tự dừng máy chủ; muốn dừng cả máy chủ, dùng thêm **Stop VibePing.bat**.

Giữ `vibeping.exe` và `vibeping-ready.exe` cạnh nhau. Trước khi chuyển thư mục hoặc gỡ ứng dụng, tắt Sẵn sàng, dừng VibePing và đợi khay biến mất. Sau khi chuyển, bật lại Sẵn sàng và sửa tích hợp Codex theo đường mới. Nếu gỡ tích hợp, chạy `.\vibeping.exe integrations codex remove` trước khi xóa gói.

## Cá nhân hóa trên iPhone

Trong **Cài đặt**, chọn thời lượng báo hoàn tất, nhắc chờ hoặc **Dự án của bạn**. Hồ sơ dự án cho phép đổi tên, biểu tượng, màu nhấn, lọc thông báo và xem lịch sử.

Mặc định báo hoàn tất từ hai phút, nhắc chờ một lần sau năm phút; có thể đổi chung hoặc theo dự án. Thiếu giờ bắt đầu vẫn cho phép báo hoàn tất. Công tắc chung và giờ yên tĩnh luôn áp dụng. **Hoạt động** giữ diễn biến, kết quả Codex và tổng kết **Hôm nay**.

## Codex, sao lưu và khôi phục

Sau khi cài hoặc sửa tích hợp, chạy `/hooks` trong Codex để kiểm tra, tin cậy đúng hook VibePing. VibePing không bỏ qua bước này và không đọc tệp đăng nhập Codex.

Chỉ sao lưu/khôi phục khi máy chủ đã dừng; chạy tại thư mục chứa tệp thực thi:

```powershell
.\vibeping.exe backup
.\vibeping.exe restore --file <duong-dan-ban-sao> --confirm
```

Giữ bản sao trong thư mục được bảo vệ vì có thể chứa lịch sử và khóa gửi thông báo. Dữ liệu mặc định ở `%LOCALAPPDATA%\VibePing`; chỉ xóa thư mục này khi chủ động muốn xóa toàn bộ dữ liệu.

## Khi chưa kết nối hoặc chưa nhận thông báo

- Kiểm tra laptop đang thức, VibePing đang chạy và Tailscale đã kết nối trên cả hai thiết bị.
- Nếu quyền bị tắt, mở **Cài đặt iPhone → Thông báo → VibePing**.
- Nếu tích hợp vừa cài/sửa, kiểm tra `/hooks` trong Codex.
- Dùng trang **Máy tính** và chẩn đoán để xem bước khôi phục cụ thể.

Sau cài đặt, kiểm tra một lần đăng xuất/đăng nhập Windows nếu dùng Sẵn sàng và một thông báo trên iPhone đã khóa. Kiểm thử desktop hoặc dịch vụ gửi chấp nhận không chứng minh thông báo đã hiển thị trên iPhone thật.
