# VibePing 1.0.0-rc.4

Ghi chú lịch sử cho phiên bản trong tiêu đề. Để cài hoặc cập nhật bản hiện tại, xem [hướng dẫn vận hành](INSTALL_VI.md).

## Thay đổi

- Thông báo Màn hình khóa dùng tiêu đề ngắn theo tín hiệu: Codex đã xong việc, đang chờ bạn, kiểm thử chưa qua, bản xem trước sẵn sàng hoặc hạn mức thấp. Không lặp tên ứng dụng vào tiêu đề, không dùng câu “thay đổi trên laptop”.
- Ba mức riêng tư khác nhau thực sự: “Chỉ báo” ẩn tác vụ và dự án; “Tên dự án” chỉ hiện dự án; “Hiện tóm tắt” hiện tên tác vụ ngắn và dự án một lần. Hạn mức ở chế độ tóm tắt có phần trăm còn lại và thời gian đến mốc làm mới.
- Nội dung được tạo chung cho thông báo thật và bản xem trước. Hàng đợi và lần gửi lại đọc mức riêng tư mới nhất trước khi gửi; nếu sự kiện nguồn đã bị dọn, nội dung mặc định kín thay vì dùng lại chi tiết cũ.
- Bản xem trước có biểu tượng VibePing, tên ứng dụng, “bây giờ”, tiêu đề và nội dung. Dùng tín hiệu gần nhất; khi chưa có tín hiệu phù hợp, ghi rõ “Ví dụ minh họa”. Đổi mức riêng tư không tải lại trang; chuyển nhẹ và tôn trọng giảm chuyển động. Khi tăng riêng tư, bỏ nội dung cũ ngay.
- Giữ các sửa lỗi RC2/RC3 về trạng thái Codex, giao diện và hạn mức lần cuối khi ngoại tuyến.

## Dữ liệu và giới hạn

Tên tác vụ chỉ lấy từ thông tin mô tả `thread.name` qua [Codex App Server](https://learn.chatgpt.com/docs/app-server), bằng `thread/read` với `includeTurns: false`. Không đọc lời nhắc, bản ghi hội thoại, câu trả lời hoặc tệp thông tin đăng nhập; không tiếp tục tác vụ hay gửi lệnh từ điện thoại. Đọc thông tin mô tả có giới hạn 2 giây và không khởi chạy khi VibePing đã được dừng rõ ràng.

Tên thiếu hoặc không phù hợp dùng câu dự phòng đúng tín hiệu, không suy đoán Codex đã làm gì. Tên được giới hạn độ dài, bỏ dữ liệu nhiều dòng, đường dẫn, email và các mẫu nhạy cảm phổ biến. Tên tác vụ là ngữ cảnh của tác vụ Codex, không phải bản tóm tắt tự động riêng của từng lượt. Các thông báo cũ không có thông tin mô tả cũng dùng câu dự phòng.

SQLite nâng từ cấu trúc dữ liệu 9 lên 10, thêm ngữ cảnh thông báo và tên tác vụ; tự sao lưu trước nâng cấp cấu trúc dữ liệu. Giữ ghép nối, VAPID, đăng ký thông báo và dữ liệu iPhone. Bản xem trước cần kết nối tới laptop để lấy ví dụ mới; lỗi tải không giả làm trạng thái chưa có hoạt động.

Việc đổi mức riêng tư áp dụng cho những thông báo chưa được gửi. VibePing không thể thu hồi thông báo đã giao cho dịch vụ gửi thông báo hoặc đã xuất hiện trên iPhone.

## Cập nhật trên iPhone

Giữ laptop chạy VibePing và Tailscale kết nối. Mở VibePing từ Màn hình chính, chờ “Có bản VibePing mới” phiên bản 1.0.0-rc.4 rồi bấm “Cập nhật”. Không cần gỡ ứng dụng hoặc xóa dữ liệu Safari. Nếu chưa thấy, đưa ứng dụng về nền rồi mở lại để kiểm tra phiên bản.

Chỉ dùng địa chỉ riêng hiện có, không bật Funnel hoặc tự khởi động. Kiểm thử trình duyệt không thay thế xác nhận nhận thông báo trên iPhone thật.

## Kiểm chứng phát hành

- 112 kiểm thử Rust, 64 kiểm thử Angular, 6 kiểm thử nền PWA và 84 kiểm thử trình duyệt đều đạt. Bao gồm ba mức riêng tư, tác vụ qua lần mở lại dữ liệu, thông tin mô tả thiếu/không an toàn, hàng đợi gửi lại sau khi đổi riêng tư, quyền truy cập bản xem trước, mốc làm mới hạn mức, lỗi tải và giảm chuyển động.
- Định dạng, lint, kiểu dữ liệu, hợp đồng API sinh tự động, Tailwind, kiến trúc, vệ sinh kho mã, nội dung tiếng Việt và biên dịch bản phát hành Windows đều đạt.
- Kiểm tra nhanh gói Windows đạt: giải nén, chạy không cần công cụ lập trình, khởi động/dừng/khởi động lại, dữ liệu bền vững, REST/SSE, hàng đợi thử. Luồng nâng cấp PWA từ bộ nhớ đệm RC3 sang RC4 hiển thị đúng phiên bản, chỉ cập nhật khi bấm nút, giữ dữ liệu và mở lại ngoại tuyến.
- Impeccable: giữ Quiet signal và giao diện hiện có; một lượt kiểm tra theo lô cho ba mức riêng tư ở 320/430 px, sáng/tối, tên dài và giảm chuyển động. Không phát hiện lỗi tràn ngang hoặc WCAG A/AA; không cần vòng sửa hình ảnh thứ hai.
- Gói khởi đầu 502,94 kB, trên mức cảnh báo 491 kB nhưng dưới mức chặn 700 kB. Không thay ngưỡng và không thêm thư viện phụ thuộc.
- Dịch vụ npm audit hết thời gian phản hồi trong kiểm tra tại máy; không coi đây là kết quả audit đã đạt. RustSec giữ ngoại lệ ES256/RSA đã ghi nhận từ trước.
