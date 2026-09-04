# VibePing 1.0.0-rc.7 — Đọc hạn mức Codex thường xuyên hơn

## Thay đổi

- Laptop đọc mới hạn mức từ Codex khoảng mỗi **15 giây** khi có màn hình VibePing kết nối trực tiếp, và mỗi **1 phút** khi không có màn hình kết nối, thay cho nhịp dự phòng 10 phút. Kết quả đọc thành công được lưu rồi đẩy ngay lên iPhone.
- Tín hiệu thay đổi hạn mức, kết thúc lượt Codex và nút Cập nhật tiếp tục yêu cầu đọc sớm. Một bộ đọc phục vụ mọi màn hình, không chạy nhiều yêu cầu song song; các yêu cầu đến trong một lần đọc dùng chung kết quả. Nếu vừa đọc thành công chưa quá 5 giây, thao tác Cập nhật dùng kết quả đó.
- Tín hiệu dồn được gộp, hai lần đọc cách nhau ít nhất 5 giây trong phiên bình thường. Không chạy bù nhiều lần sau khi laptop ngủ hoặc một lần đọc chậm. Lỗi liên tiếp vẫn lùi nhịp thử lại; chỉ đặt lại mức lùi sau khi đọc hạn mức thành công.
- Tăng thời gian chờ phản hồi hạn mức từ 12 lên 30 giây, sau khi quan sát Codex có lần mất gần 20 giây mới trả lời. Nút Cập nhật chờ tối đa 35 giây để nhận kết quả của bộ đọc; các yêu cầu vẫn chạy tuần tự. Nhịp 15 giây/1 phút được tính sau mỗi lần đọc xong, chưa bao gồm thời gian chờ Codex.
- Trang hạn mức đóng kết nối khi app về nền và mở lại khi quay lại, để laptop có thể chuyển về nhịp chậm nếu không còn màn hình nào kết nối. Giữ số liệu đã lưu khi mất mạng.
- “Đọc lần cuối” có thêm giây, kèm lời giải thích về nhịp tự đọc. Giữ phần trăm thật Codex trả về; không thêm số thập phân giả hoặc tự giảm khi chưa có dữ liệu mới.
- Kiểm tra trợ năng chờ hiệu ứng xuất hiện hữu hạn kết thúc trước khi đo độ tương phản; các hiệu ứng tín hiệu lặp vẫn chạy. Điều này tránh đo chữ ở giữa hiệu ứng chuyển trang như lỗi CI của RC6.

## Cập nhật trên iPhone

Giữ VibePing và Tailscale chạy trên laptop. Mở VibePing từ Màn hình chính, chờ **Có bản VibePing mới · Phiên bản 1.0.0-rc.7**, rồi bấm **Cập nhật**. Không cần gỡ app hoặc ghép đôi lại.

Giữ nguyên dữ liệu, đăng ký thông báo, VAPID, launcher và kết nối Tailscale Serve riêng tư; Funnel tắt. Khoảng đọc không đảm bảo Codex đã công bố số mới trong từng khoảng đó.

## Kiểm chứng

- 119 kiểm thử Rust, 79 kiểm thử Angular và 6 kiểm thử nền PWA đạt. Định dạng, lint, kiểu dữ liệu, hợp đồng API, nội dung tiếng Việt, Tailwind, kiến trúc và vệ sinh kho mã đạt; build Windows release và Gate 1 đạt.
- 100 kịch bản trình duyệt đạt trong một lượt chạy đủ trên giao diện sáng/tối, với 2 worker và không bật chụp ảnh. Sau tinh chỉnh thời gian chờ Codex và câu giải thích nhịp đọc, kiểm thử Rust được chạy lại toàn bộ; 2 kịch bản hạn mức liên quan tiếp tục đạt trên bản build cuối.
- Giao diện hạn mức được kiểm tra ở 320–430 px, không phát hiện lỗi WCAG A/AA hoặc tràn ngang trên màn kiểm tra. Luồng thử nhận số mới và thời điểm đọc tới giây ngay trên trang đang mở, không tải lại.
- Smoke test gói Windows cuối và nâng cấp PWA RC6 → RC7 đạt: thông báo đúng phiên bản, chờ bấm Cập nhật, giữ dữ liệu cục bộ và mở lại giao diện mới khi ngoại tuyến.
- Đã triển khai RC7 lên tiến trình hiện có; health trên laptop và manifest PWA ở địa chỉ riêng tư đều là RC7. Đo qua kết nối riêng tư ghi nhận 3 lần đọc Codex thành công tự động liên tiếp, không có mẫu trạng thái cũ trong lượt đo; khoảng cách hai lần cuối là 18,7 giây, bao gồm độ trễ nguồn. Không bấm Cập nhật hoặc tải lại trong lượt đo. Giữ launcher, dữ liệu và cấu hình Serve; Funnel tắt, có bản sao executable trước nâng cấp.
- RustSec đạt với ngoại lệ RUSTSEC-2023-0071 đã xét trước đó: VAPID chỉ dùng ES256, không có thao tác RSA trong mã ứng dụng. npm audit production chưa hoàn tất vì registry bị `ERR_SOCKET_TIMEOUT` ở cả hai lần thử; không thêm hoặc cập nhật dependency trong RC7.
- Gói khởi đầu 553,41 kB (ước tính 145,89 kB khi truyền), còn vượt mức cảnh báo 491 kB và dưới mức chặn 700 kB. Chưa kiểm tra trực tiếp trên iPhone vật lý; nhịp thực nhận có thể chậm hơn khi Codex hoặc mạng phản hồi chậm.
