# Gate 0 — Web Push qua Tailscale

- **Mục tiêu:** chứng minh PWA trên Màn hình chính nhận Web Push mã hóa từ một địa chỉ HTTPS riêng `.ts.net` ổn định trên iPhone thật; khởi động lại Rust không cần cài hoặc đăng ký lại.
- **Kết quả ghi nhận:** đạt (PASS), ngày 02/09/2026.

## Môi trường tại lần kiểm chứng

Windows x64; Rust 1.98.0; Node.js 24.15.0; pnpm 10.15.1; Tailwind CSS 4.3.3; Tailscale 1.102.3. Chỉ dùng Serve, Funnel tắt. Máy chủ Rust ở `127.0.0.1:8787`; địa chỉ riêng có dạng `https://<device>.<tailnet>.ts.net`. Tên máy thật được lược khỏi tài liệu đưa vào Git.

## Kiểm tra trên máy tính

Cả localhost và HTTPS riêng trả đúng danh tính Gate 0. Địa chỉ riêng qua kiểm tra sức khỏe/trạng thái/khóa công khai, manifest/biểu tượng, ngữ cảnh an toàn, đăng ký service worker tại `/` với `updateViaCache: none` và phiên bản bộ đệm rõ ràng. Khóa trình duyệt dùng đúng dạng P-256 không nén.

Bản cuối hiển thị sáng/tối ở 320/375/390/430 px, không tràn ngang. Điều khiển chính/mở rộng có vùng chạm 44–48 px; focus rõ; đệm hàng/chi tiết 12/16 px. Báo cáo kỹ thuật không có địa chỉ đăng ký hoặc tên khóa. Không thấy cảnh báo ứng dụng, lỗi chạy hay yêu cầu mạng thất bại. Một thông báo chặn kiểu dáng nội tuyến xuất phát từ lớp phủ công cụ kiểm tra, không có URL trang; CSP đã chặn đúng.

Tailscale báo `(tailnet only)`; Serve chỉ chuyển gốc đến `127.0.0.1:8787`; không có `(Funnel on)` hoặc trạng thái Internet công khai. Dừng/khởi động thật tạo PID Rust mới nhưng giữ đúng origin và khóa công khai VAPID.

Kiểm thử đơn vị bao phủ câu chữ an toàn, không hỗ trợ/từ chối quyền, dữ liệu thông báo dự phòng, lưu danh tính gửi, mã hóa khóa trình duyệt không nén và lưu đăng ký vào tệp.

Đã áp dụng Impeccable shape, hai đánh giá critique độc lập, harden và adapt. Cảnh báo đệm bằng không và màu hover sáng/tối trộn được đối chiếu kiểu dáng thực: hàng có viền đệm 12 px, chi tiết 16 px, cả hai giao diện đúng màu. Các cảnh báo này là phát hiện nhầm.

## Ma trận iPhone thủ công

| Trường hợp                                | Kết quả tại lần kiểm chứng                                                              |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| Ứng dụng đang mở                          | Không chạy lại; đã có ở PoC Quick Tunnel trước, ngoài lần kiểm lại địa chỉ lâu dài này. |
| Chạy nền                                  | Đạt — ứng dụng không ở phía trước khi nhận trên màn hình khóa.                          |
| Điện thoại khóa                           | Đạt — người dùng thấy thông báo đầu tiên trên iPhone thật.                              |
| Vuốt khỏi trình chuyển ứng dụng           | Không chạy lại; có bằng chứng PoC trước.                                                |
| iPhone dùng dữ liệu di động, laptop Wi-Fi | Không chạy lại; có bằng chứng PoC trước.                                                |
| Mất mạng rồi có lại                       | Không chạy lại; có bằng chứng PoC trước.                                                |
| Chạm thông báo mở/đưa ứng dụng lên trước  | Không chạy lại; có bằng chứng PoC trước.                                                |
| Khởi động lại Rust, cùng origin/đăng ký   | Đạt — đăng ký vẫn sẵn sàng, người dùng thấy thông báo thứ hai trên màn hình khóa.       |

## Bằng chứng và giới hạn

PoC Quick Tunnel bên cạnh chỉ là bằng chứng trước đó cho ma trận Web Push cơ bản. Máy chủ và Quick Tunnel của PoC đã dừng để nhường cổng 8787; mã nguồn và dữ liệu thông báo bền vững không thay đổi.

Ngày 02/09/2026, iPhone thật đăng ký từ PWA riêng và nhận thông báo màn hình khóa đầu tiên. Sau khi Rust Gate 0 khởi động lại, địa chỉ, danh tính gửi và đăng ký vẫn sẵn sàng mà không cài/đăng ký lại; người dùng thấy thông báo thứ hai.

Việc dịch vụ gửi chấp nhận chỉ là bằng chứng trung gian; cả hai lần hiển thị do người dùng xác nhận. Vì vậy Gate 0 đạt điều kiện địa chỉ lâu dài và giữ đăng ký qua khởi động lại.
