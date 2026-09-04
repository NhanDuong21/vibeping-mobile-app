# VibePing 1.0.0-rc.3

## Thay đổi

- Trang Hoạt động và Hạn mức Codex giữ lại số liệu đọc thành công gần nhất, kể cả khi mở lại app mà chưa kết nối được Codex hoặc laptop đang ngoại tuyến.
- Số liệu đã lưu được đánh dấu “Dữ liệu lần cuối”, kèm thời điểm đọc gốc. Không tự đặt lại phần trăm khi qua mốc reset; mốc đặt lại đã lưu hiển thị bằng ngày giờ cụ thể.
- Lỗi kết nối, cập nhật thất bại hoặc phản hồi rỗng không xóa số liệu tốt đã có. Kết nối lại sẽ đồng bộ dữ liệu mới; phản hồi cũ đến muộn không ghi đè lần đọc mới hơn.
- Những lần cập nhật hạn mức khi đang xem Hoạt động cũng được lưu. Không cần mở trang chi tiết để giữ số liệu mới nhất đã nhận.
- Tự đọc dữ liệu hạn mức trong bộ nhớ đệm RC2 trên iPhone; không xóa lịch sử, thao tác đánh dấu đã đọc, ghép đôi hoặc đăng ký thông báo.

## Dữ liệu và giới hạn

SQLite trên laptop vẫn là nguồn dữ liệu chính; IndexedDB trên iPhone chỉ là bản lưu của lần đồng bộ gần nhất. Không đọc tệp đăng nhập hoặc nội dung hội thoại Codex. Không thay hợp đồng dữ liệu hay schema; giữ các sửa lỗi trạng thái và giao diện sáng/tối của RC2.

Nếu thiết bị chưa từng nhận được số liệu hợp lệ, app vẫn báo chưa đọc được hạn mức. Không thể khôi phục dữ liệu chưa từng lưu hoặc đã bị người dùng xóa khỏi Safari. Phần trăm đã lưu không phải số liệu trực tiếp trong lúc mất kết nối.

## Cập nhật trên iPhone

Giữ laptop chạy VibePing và Tailscale kết nối. Mở VibePing từ màn hình chính, chờ thông báo “Có bản VibePing mới” phiên bản 1.0.0-rc.3 rồi bấm “Cập nhật”. Nếu app đang ở nền, đóng rồi mở lại. Không cần gỡ app hay xóa dữ liệu Safari.

Bản cập nhật chỉ dùng nguồn riêng tư hiện có; không bật Funnel, không thêm tự khởi động. Kiểm thử trình duyệt không thay thế xác nhận trên iPhone vật lý.

## Kiểm chứng phát hành

- 101 kiểm thử Rust, 61 kiểm thử Angular, 6 kiểm thử nền PWA và 78 kiểm thử trình duyệt. Các ca mới kiểm tra khôi phục khi ngoại tuyến, chuyển dữ liệu RC2, cập nhật qua luồng trực tiếp, lỗi làm mới, kết nối lại, phản hồi cũ và giữ nguyên phần trăm khi qua mốc đặt lại.
- Định dạng, lint, kiểu dữ liệu, hợp đồng API sinh tự động, Tailwind, kiến trúc, vệ sinh kho mã, nội dung tiếng Việt và build release đã được kiểm tra.
- Gói Windows qua smoke test không cần công cụ lập trình; nâng cấp PWA từ bộ nhớ đệm RC2 thật sang RC3 qua nút cập nhật, giữ dữ liệu và mở lại ngoại tuyến.
- Impeccable: giữ thiết kế Quiet signal, thêm nhãn dữ liệu đã lưu và thời điểm đọc; kiểm tra theo lô trang Hoạt động và Hạn mức ở giao diện sáng/tối, cùng màn hình 320–430 px. Không phát hiện tràn ngang hoặc lỗi WCAG A/AA trên phần chi tiết đã lưu; không cần sửa vòng hình ảnh thứ hai.
- RustSec audit đạt với ngoại lệ ES256/RSA đã ghi nhận từ trước. npm audit vẫn hết thời gian phản hồi từ dịch vụ npm; không coi đây là kết quả đã xác minh. Không đổi phiên bản thư viện phụ thuộc.
- Cảnh báo dung lượng gói khởi đầu: 494,14 kB, trên mức cảnh báo 491 kB nhưng dưới mức chặn 700 kB; không thay ngưỡng để bỏ cảnh báo.
