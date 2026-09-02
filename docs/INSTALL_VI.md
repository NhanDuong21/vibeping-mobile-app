# Cài và vận hành VibePing 1.0.0-rc.1

Đây là release candidate cá nhân cho một laptop Windows x64, một tài khoản Codex đã đăng nhập và một iPhone trong cùng tailnet. Đây chưa phải bản ổn định `1.0.0`.

## Chuẩn bị

- Giữ Tailscale kết nối trên laptop và iPhone.
- Không bật Tailscale Funnel. VibePing chỉ dùng Tailscale Serve riêng tư.
- Giải nén toàn bộ ZIP vào một thư mục mà bạn kiểm soát. Không chạy trực tiếp từ trong ZIP.
- Máy sử dụng không cần cài Node.js, pnpm, Rust hay Cargo.

## Khởi động lần đầu

1. Mở `Start VibePing.bat` bằng thao tác của bạn. VibePing không tự khởi động cùng Windows.
2. Giữ cửa sổ mở đủ lâu để đọc trạng thái và ghi lại mã ghép nối một lần nếu có.
3. Kết nối Tailscale trên iPhone rồi mở biểu tượng VibePing hiện có trên Màn hình chính.
4. Nhập mã nếu ứng dụng yêu cầu và hoàn tất các bước quyền thông báo.
5. Nếu vẫn thấy giao diện Gate 0, đóng VibePing trên iPhone, mở lại một lần, rồi tải lại một lần. Không xóa biểu tượng và không đăng ký lại trừ khi ứng dụng yêu cầu.

Worker Angular mới dùng cùng địa chỉ và scope với Gate 0 nên lần cập nhật đầu có thể cần đúng một vòng đóng/mở/tải lại. Dữ liệu gửi và đăng ký cũ đã được nhập theo kiểu sao chép, không xóa nguồn.

## Điều khiển hằng ngày

- `Start VibePing.bat`: khởi động nền và kiểm tra sẵn sàng.
- `Stop VibePing.bat`: dừng mềm, giữ nguyên dữ liệu và Tailscale.
- `Restart VibePing.bat`: dừng rồi khởi động lại an toàn.
- `Open VibePing.bat`: mở địa chỉ Tailscale riêng ổn định.

Các BAT luôn gọi `vibeping.exe` trong chính thư mục của chúng, kể cả khi đường dẫn có khoảng trắng.

## Kiểm tra Codex

Mở PowerShell trong thư mục gói rồi chạy:

```powershell
.\vibeping.exe integrations codex status
```

Kết quả cần cho thấy Notify và Hooks sẵn sàng. Sau khi cài hoặc sửa tích hợp, mở Codex, chạy `/hooks`, đọc đúng định nghĩa VibePing rồi tự đánh dấu tin cậy. VibePing không bỏ qua bước tin cậy này và không đọc tệp thông tin đăng nhập Codex.

## Sao lưu và khôi phục

Chỉ sao lưu hoặc khôi phục khi VibePing đã dừng:

```powershell
.\vibeping.exe backup
.\vibeping.exe restore --file <duong-dan-ban-sao> --confirm
```

Bản sao có thể chứa danh tính gửi thông báo riêng. Giữ bản sao trong thư mục VibePing được bảo vệ hoặc tự bảo vệ mọi bản được chuyển ra ngoài.

## Buổi sáng kiểm tra iPhone

Thực hiện đúng ma trận trong `docs/execution/MANUAL_ACCEPTANCE.md`. Bắt đầu bằng thông báo trì hoãn 10 giây, khóa iPhone trước khi hết thời gian và ghi lại kết quả thật. Không coi phản hồi API hoặc kiểm thử desktop là bằng chứng thông báo đã hiện trên Màn hình khóa.

## Giới hạn hiện tại

- Ghép nối/cập nhật một lần, hiển thị thông báo trên iPhone thật, hành vi foreground/background và chạm để mở vẫn chờ người dùng xác nhận.
- Tin cậy hook Codex vẫn cần người dùng thực hiện bằng `/hooks`.
- Bản ổn định `1.0.0` bị chặn đến khi toàn bộ ma trận iPhone và giai đoạn dùng thử bảy ngày hoàn tất.
