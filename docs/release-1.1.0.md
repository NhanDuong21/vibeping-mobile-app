# VibePing 1.1.0 — Phiên làm việc

## Thay đổi

- Hoạt động gom các tín hiệu của cùng một lượt yêu cầu Codex vào một phiên. Thẻ hiện tại giữ nguyên khi bắt đầu, kiểm thử, tiếp tục, chờ bạn và hoàn tất; các phiên trước nằm trong lịch sử. Hai lượt yêu cầu trong cùng task hoặc cùng project vẫn tách riêng.
- Thẻ đang chạy hiện tên công việc, project, trạng thái, thời gian và ba mốc gần nhất. Khi hoàn tất, cùng thẻ chuyển thành tổng kết thời lượng, số lần kiểm thử chưa đạt và đoạn trích kết quả. Mèo tĩnh phản ứng một lần theo tín hiệu, dùng cơ chế chuyển động và cài đặt giảm chuyển động hiện có.
- Chi tiết hiện timeline trước **Kết quả Codex**. Quyền riêng tư được thu gọn thành hàng có thể mở. Các liên kết từ thông báo cũ mở đúng phiên tương ứng.
- Giữ phần câu trả lời cuối đã có ở RC8: tối đa 8.000 ký tự, đoạn trích, ghi chú khi bị rút ngắn, bổ sung kết quả đến muộn và đọc lại bản đã xem khi ngoại tuyến. Cache cũ được chuyển sang đúng phiên, giữ cả liên kết thông báo cũ và kết quả thuộc trang lịch sử chưa tải. Không đọc prompt, suy luận hoặc nhật ký công cụ làm kết quả.
- Dữ liệu cũ được gom từ các mốc đã lưu. Phiên thiếu tín hiệu bắt đầu nói rõ chưa ghi nhận lúc bắt đầu. Khi mất kết nối hoặc quá 2 phút không có tín hiệu mới, thời gian dừng ở tín hiệu cuối; không suy đoán rằng Codex vẫn làm hay đã xong. Lượt bị dừng chưa có thông báo hoàn tất hiển thị **Đã dừng**.
- Phân trang dùng mốc thời gian cố định trong con trỏ. Tín hiệu cập nhật, bổ sung kết quả và đồng bộ lại không tạo thẻ trùng. Đánh dấu từng phiên đã đọc khi ngoại tuyến chỉ xác nhận đến mốc đã xem, không đọc hộ tín hiệu đến sau đó.
- SQLite giữ dữ liệu gốc; cache điện thoại chỉ giữ bản sao. Timeline được dọn cùng thời hạn lưu hoạt động. Dữ liệu thật, kết quả Codex, thông tin push và bản sao lưu không nằm trong Git hoặc gói phát hành.

## Phạm vi

Đây là gói **V1.1 Sessions** đã chốt. Personal và Always ready để bản sau. Khởi động vẫn bằng thao tác chủ động; địa chỉ riêng tư và cơ chế thông báo hiện có được giữ nguyên.

## Cập nhật

Giữ VibePing và Tailscale chạy trên laptop. Trên iPhone, mở VibePing, chờ **Có bản VibePing mới · Phiên bản 1.1.0**, rồi bấm **Cập nhật**. Không xóa biểu tượng hoặc đăng ký lại thông báo.

## Kiểm chứng

Đã qua 129 kiểm thử Rust, 91 kiểm thử Angular, 104 kịch bản trình duyệt, kiểm tra gói Windows và nâng cấp PWA từ RC8. Chi tiết kiểm chứng và các cảnh báo hiện có được ghi trong `docs/validation/SESSIONS_1_1.md`. Các kịch bản trình duyệt dùng dữ liệu giả; hiển thị và nhận thông báo trên iPhone vật lý chưa được xác nhận cho bản này.
