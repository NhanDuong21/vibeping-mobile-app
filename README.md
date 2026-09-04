# VibePing 1.3.3 — Theo dõi đến từng giây

VibePing giúp bạn theo dõi Codex trên iPhone khi rời laptop Windows. Ứng dụng báo khi công việc hoàn tất, cần bạn quay lại xử lý, kiểm thử cuối chưa đạt, có bản xem trước hoặc hạn mức Codex sắp hết. Bạn có thể đọc kết quả, xem lịch sử và thời gian làm việc đã ghi nhận trên điện thoại.

Dữ liệu chính nằm trên Windows. Laptop và iPhone kết nối qua mạng Tailscale riêng của bạn; máy chủ chỉ lắng nghe trên localhost và dùng **Tailscale Serve** để cung cấp địa chỉ HTTPS riêng. **Không bật Tailscale Funnel.**

## Bắt đầu từ đâu?

| Bạn muốn làm gì?                         | Tài liệu nên đọc                                  |
| ---------------------------------------- | ------------------------------------------------- |
| Cài đặt, cập nhật hoặc sử dụng hằng ngày | [Hướng dẫn cài và vận hành](docs/INSTALL_VI.md)   |
| Xem thay đổi trong bản 1.3.3             | [Ghi chú phát hành 1.3.3](docs/release-1.3.3.md)  |
| Tìm tài liệu và hiểu thuật ngữ           | [Mục lục tài liệu](docs/README.md)                |
| Hiểu phạm vi sản phẩm                    | [Định hướng sản phẩm](PRODUCT.md)                 |
| Hiểu cách hệ thống hoạt động             | [Kiến trúc](docs/ARCHITECTURE.md)                 |
| Sửa mã nguồn                             | [Quy định dành cho tác nhân lập trình](AGENTS.md) |

## Bản hiện tại có gì?

- **1.3.3:** hiển thị số giây khi Codex đang làm việc. Đồng hồ cập nhật mỗi giây khi trang đang mở, không tạo thêm yêu cầu mạng; tạm dừng khi chạy nền hoặc mất kết nối.
- **1.3.2:** chỉ gửi thông báo hoàn tất cho cuộc hội thoại chính đã xác minh. Kết quả tác nhân phụ vẫn được lưu; trường hợp chưa rõ quan hệ sẽ chờ đối soát trước khi gửi.
- **Từ 1.3.1:** mỗi cuộc hội thoại chính và các tác nhân phụ đã xác minh được gộp thành một **Công việc**. Mỗi **Yêu cầu** có diễn biến, thời gian, trạng thái đã đọc và kết quả riêng. Yêu cầu chính mới nhất mở sẵn; các yêu cầu khác mở trong cùng trang. Hội thoại độc lập và bản tách do người dùng tạo vẫn riêng biệt.
- Các tính năng đã có gồm hồ sơ dự án, bộ lọc thông báo, linh vật theo trạng thái, tổng kết Hôm nay, giao diện sáng/tối và chế độ **Sẵn sàng** trên Windows do bạn chủ động bật.

VibePing dành cho một người dùng, một laptop Windows x64, một tài khoản Codex đã đăng nhập và một iPhone. Phạm vi dự án giữ chi phí hạ tầng ở 0 đồng: không thêm tài khoản Apple Developer, App Store, tên miền trả phí, đường hầm công khai, máy chủ hay cơ sở dữ liệu đám mây. Thao tác với Codex vẫn thực hiện trong Codex.

## Chạy và kiểm tra mã nguồn

Chạy các lệnh tại **thư mục gốc repo**. Máy phát triển cần các công cụ trong [hướng dẫn mobile](apps/mobile/README.md); máy chỉ dùng gói Windows không cần Node.js, pnpm, Rust hoặc Cargo.

Kiểm tra toàn bộ dự án:

```powershell
.\scripts\check.ps1
```

Sinh hợp đồng API và chạy môi trường phát triển:

```powershell
pnpm run generate:contracts
.\scripts\dev.ps1
```

Biên dịch, đóng gói Windows x64 và kiểm thử bản phát hành:

```powershell
pnpm run build:release
pnpm run package:windows
pnpm run e2e:release
```

Để chạy riêng bộ kiểm thử trình duyệt sau khi đã biên dịch tệp thực thi phát hành, dùng `pnpm run e2e`.

Gói xuất ra nằm ở `artifacts/VibePing-Windows-x64-v1.3.3/`, kèm ZIP và tệp mã kiểm tra SHA-256. Các tệp này được Git bỏ qua. Gói gồm chín tệp và tự chứa phần chạy ứng dụng.

## Điều khiển VibePing trên Windows

Bạn có thể chạy thủ công hoặc bật khởi động cùng phiên đăng nhập Windows bằng `Bat San sang.bat` trong gói phát hành. Khi phát triển từ repo, dùng:

```powershell
.\scripts\vibeping.ps1 start
.\scripts\vibeping.ps1 status
.\scripts\vibeping.ps1 doctor
.\scripts\vibeping.ps1 restart
.\scripts\vibeping.ps1 open
.\scripts\vibeping.ps1 stop
```

Các lệnh tương ứng là khởi động, xem trạng thái, chẩn đoán, khởi động lại, mở ứng dụng và dừng. Bạn cũng có thể gọi trực tiếp trên `vibeping.exe`. Lần khởi động chưa ghép nối sẽ hiển thị mã dùng một lần, có thời hạn ngắn, để nhập trên iPhone.

Dữ liệu mặc định nằm trong `%LOCALAPPDATA%\VibePing`: SQLite, khóa ngăn chạy trùng, lựa chọn chạy/dừng, thông tin điều khiển nội bộ, nhật ký luân phiên và danh tính gửi thông báo. Có thể chọn thư mục khác bằng `-DataDir` hoặc `--data-dir`.

Chỉ sao lưu và khôi phục khi VibePing đã dừng. Chạy tại thư mục chứa tệp thực thi:

```powershell
.\vibeping.exe backup
.\vibeping.exe restore --file <duong-dan-ban-sao> --confirm
.\vibeping.exe reset notifications --confirm
```

`restore` khôi phục dữ liệu; `reset notifications` đặt lại dữ liệu thông báo. Hai thao tác cần cờ xác nhận `--confirm`. Bản sao lưu có thể chứa khóa riêng dùng để gửi thông báo; giữ nó trong thư mục VibePing được bảo vệ hoặc bảo vệ bản sao khi chuyển đi nơi khác.

## Tích hợp Codex

Cài, xem trạng thái, sửa hoặc gỡ tích hợp bằng các lệnh sau. Tích hợp giữ lại các hook khác của bạn:

```powershell
.\vibeping.exe integrations codex install
.\vibeping.exe integrations codex status
.\vibeping.exe integrations codex repair
.\vibeping.exe integrations codex remove
```

Sau khi cài hoặc sửa, mở Codex và chạy `/hooks` để xem, xác nhận tin cậy đúng các định nghĩa VibePing. Ứng dụng không tự bỏ qua bước này.

## Các mốc đã kiểm chứng

- **Gate 0 — đạt ngày 02/09/2026:** người dùng đã thấy thông báo trên màn hình khóa iPhone thật, trước và sau khi khởi động lại Rust, với cùng địa chỉ riêng và không cần cài hay đăng ký lại.
- **Gate 1 — đạt:** đọc được hạn mức tài khoản Codex đã đăng nhập qua `codex app-server`; kết quả được lọc thông tin nhạy cảm.
- **Giai đoạn 1–10 — hoàn tất nền tảng V1:** PWA Angular/Ionic được nhúng trong máy chủ Rust/SQLite, có kiểm thử tự động và gói Windows. Xem [sổ theo dõi triển khai](docs/execution/BUILD_STATUS.md) để biết chi tiết lịch sử.

Kết quả kiểm thử tự động và việc dịch vụ gửi thông báo chấp nhận yêu cầu không chứng minh thông báo đã hiện trên iPhone thật. [Nghiệm thu trên thiết bị và sử dụng bảy ngày](docs/execution/MANUAL_ACCEPTANCE.md) vẫn cần người dùng ghi nhận.

## Các bản thử nghiệm được giữ lại

Gate 0 và Gate 1 nằm trong `spikes/` để kiểm tra lại các tích hợp rủi ro. Bản chính đã nhập một lần các tệp VAPID và đăng ký điện thoại đã biết từ Gate 0, sau khi sao lưu có dấu thời gian. Thư mục gốc Gate 0 được giữ nguyên.

Chỉ quay lại Gate 0 khi chủ động muốn dùng bản cũ và đã dừng bản chính:

```powershell
.\spikes\tailscale-web-push\scripts\Start-Gate0.ps1
```

Lần chạy Gate 0 đầu tiên có thể mở trang chấp thuận chính thức của Tailscale. Chấp thuận Serve/HTTPS rồi chạy lại; thao tác này không bật Funnel. Mọi lần xác nhận Gate 0 mới đều cần quan sát trên iPhone thật.

Đọc hạn mức qua công cụ thử nghiệm Gate 1:

```powershell
cargo run -p vibeping-gate1 -- read
```
