# Cài và vận hành VibePing 1.1.2

Giải nén toàn bộ ZIP Windows x64 vào một thư mục ổn định. Laptop và iPhone dùng cùng tailnet; giữ Tailscale Serve riêng tư, không bật Funnel. Máy dùng app không cần Node.js, pnpm, Rust hay Cargo.

## Khởi động và cập nhật

Nếu đang dùng bản cũ, mở **Tat San sang.bat** rồi **Stop VibePing.bat**, đợi khay biến mất và tạo bản sao lưu bằng `vibeping.exe backup`. Chép toàn bộ tệp trong gói mới vào đúng thư mục đang cài, giữ nguyên đường dẫn để tích hợp Codex vẫn tìm được app. Giữ dữ liệu cục bộ hiện có; không xóa dữ liệu ghép nối hay thông báo. Nếu trước đó dùng Sẵn sàng, mở lại **Bat San sang.bat** sau khi chép xong.

1. Mở **Start VibePing.bat** để chạy thủ công. Nhập mã ghép nối trên iPhone nếu được yêu cầu.
2. Hoặc mở **Bat San sang.bat** để bật khay mèo, tự chạy khi đăng nhập Windows và khôi phục host.
3. Trên iPhone mở biểu tượng VibePing đã thêm vào Màn hình chính. Khi thấy **Phiên bản 1.1.2**, bấm **Cập nhật**. Không xóa biểu tượng hoặc đăng ký lại thông báo.

## Khay Windows

Tìm VibePing trong khay hoặc nhóm biểu tượng ẩn. Nhấp phải để mở app, khởi động, dừng, đổi lựa chọn đăng nhập hoặc tắt Sẵn sàng. Dừng giữ host tắt cho đến khi bạn chọn Khởi động hoặc đăng nhập Windows lần tiếp theo nếu đã bật lựa chọn đó.

**Tat San sang.bat** tắt khay và chạy khi đăng nhập, giữ nguyên trạng thái host. Muốn dừng cả host, dùng **Stop VibePing.bat**. **Restart VibePing.bat** và **Open VibePing.bat** vẫn hoạt động như trước.

Trước khi chuyển thư mục hoặc gỡ app, tắt Sẵn sàng rồi dừng host, đợi khay biến mất. Giữ hai tệp chạy cạnh nhau; sau khi chuyển, bật lại Sẵn sàng và sửa tích hợp Codex theo đường dẫn mới.

## Cá nhân hóa

Trong Cài đặt, chọn thời lượng báo hoàn tất, nhắc chờ và **Dự án của bạn**. Hồ sơ dự án cho phép đổi tên, biểu tượng, màu nhấn, lọc thông báo và xem lịch sử. Các công tắc chung và giờ yên tĩnh vẫn áp dụng.

## Codex, sao lưu và khôi phục

Sau khi cài hoặc sửa tích hợp, chạy `/hooks` trong Codex và kiểm tra các hook VibePing. VibePing không bỏ qua bước tin cậy và không đọc tệp thông tin đăng nhập Codex.

Chỉ sao lưu hoặc khôi phục khi host đã dừng:

```powershell
.\vibeping.exe backup
.\vibeping.exe restore --file <duong-dan-ban-sao> --confirm
```

Giữ bản sao trong thư mục được bảo vệ. Kiểm tra một lần đăng xuất/đăng nhập Windows và thông báo trên iPhone đã khóa sau khi cài; kiểm thử desktop không chứng minh thông báo đã hiện trên iPhone vật lý.
