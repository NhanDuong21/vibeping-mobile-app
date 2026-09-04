# Kiểm chứng thông báo hoàn tất 1.3.2

Biên bản lịch sử của bản 1.3.2.

Thông báo đến sớm được xác định là lượt tác nhân phụ hoàn tất. Bản 1.3.1 sửa cách nhóm hoạt động nhưng chưa đổi điều kiện gửi. Bản này dùng cùng quan hệ cha-con đã xác minh và lưu để quyết định được gửi hay không.

Kết quả hoàn tất và kiểm thử cuối lỗi của tác nhân phụ vẫn lưu hoạt động nhưng không tạo việc gửi. Quan hệ chưa biết giữ việc chờ có giới hạn; mỗi lần đợi 30 giây cho tiến trình đối soát, tối đa đến hạn gốc. Công việc chính đã xác nhận vẫn tuân ngưỡng thời lượng, riêng tư và lịch gửi. Mọi lần thử, gồm lần gửi lại và quyền xử lý phục hồi từ bản cũ, đều kiểm lại quan hệ. Việc mất sự kiện nguồn hết hạn vì không thể xác minh.

Hồi quy bao phủ công việc chính đang chạy có nhiều câu trả lời phụ, một thông báo chính cuối, giữ kết quả, tín hiệu trùng, đọc thông tin hết thời gian rồi phân giải con/gốc, mở lại cơ sở dữ liệu, chờ/thử lại/quyền xử lý hết hạn, nguồn chưa biết hết hạn, lỗi cuối tác nhân phụ và giữ thông báo cần xin phép. Kiểm thử riêng tư/chính sách cá nhân được cung cấp định danh công việc chính rõ ràng.

Đây là sửa cơ chế gửi. Bố cục, câu chữ, bảng màu, ảnh và thao tác thông báo không đổi; thông báo phiên bản PWA lên 1.3.2.

## Kiểm chứng phát hành

- Format, lint, kiểu, hợp đồng, build Tailwind/sản phẩm, Rust format/Clippy/release, kiến trúc, vệ sinh repo, tiếng Việt và phụ thuộc đạt.
- 128 mobile, 156 Rust, sáu Gate 0, 122 kịch bản trình duyệt và cả sáu hồi quy gửi mới đạt.
- ZIP chín tệp đạt giải nén, vòng đời, sức khỏe riêng, REST/SSE, PWA, hạn mức thật, dữ liệu gửi mẫu, hàng đợi trễ và giữ dữ liệu qua khởi động lại khi không có công cụ phát triển.
- Bộ đệm service worker thật 1.3.1 nhận thông báo 1.3.2, kích hoạt sau bấm cập nhật, giữ dữ liệu/giao diện ngoại tuyến. Phép kiểm tra cho phép bản sửa máy chủ giữ JavaScript giống nhau nhưng vẫn đòi manifest phiên bản đổi và thao tác cập nhật thật.
- Máy cài riêng và manifest báo 1.3.2. Kiểm tra bảo vệ giữ 32 kết quả, 113 sự kiện, 153 mốc, một chủ sở hữu, hai đăng ký và một danh tính điện thoại. VAPID, Serve và tự chạy Windows không đổi; đồng hành/khay hoạt động khỏe trở lại.

SHA-256 ZIP: `433e6990db8705b479e9ffe6bb796b3f3fe6e0d1bf02d637ddf2dd9204d314d4`.

Đánh giá gửi kết luận `ship`. Không đổi bố cục/ảnh nên không cần hướng thiết kế mới. Chưa quan sát thông báo iPhone thật; không gửi thông báo thử thật đến điện thoại trong lần sửa này.
