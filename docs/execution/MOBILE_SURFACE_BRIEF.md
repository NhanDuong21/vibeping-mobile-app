# Định hướng màn hình mobile

## Người dùng và mục đích

Chế độ **Operate**: một người nhìn nhanh iPhone khi rời laptop Windows. Màn hình đầu cần trả lời VibePing có đang lắng nghe không, Codex có cần chú ý không và dữ liệu nào còn xem được khi laptop không sẵn sàng.

Người dùng phải phân biệt được trạng thái kết nối thật, xem hoạt động/hạn mức thật, chỉ bật thông báo sau thao tác và biết cách khôi phục khi mất mạng hoặc dữ liệu cũ bằng lời dễ hiểu.

## Hướng hình ảnh đã chọn

VibePing Alive phát triển từ **Quiet signal — Tín hiệu nhẹ nhàng**. Nét bạc hà di chuyển theo công việc còn tín hiệu mới; hai nhịp hổ phách báo cần chú ý; mã sự kiện mới chỉ kích hoạt một phản hồi ngắn và thêm vào danh sách.

Giữ vùng trạng thái, phân cấp hạn mức và bố cục hoạt động thoáng. Sơ đồ năm điểm giải thích lần kiểm tra sẵn sàng gần nhất, không ngụ ý điện thoại đã nhận thông báo. Thanh điều hướng và dấu chọn dùng chung giữ cảm giác liền mạch.

## Phạm vi và trạng thái

PWA Angular/Ionic ưu tiên mobile 320–430 px, sáng/tối/hệ thống, tiếng Việt, lớp Tailwind, phông cục bộ, ít vùng đóng khung và tab dưới quen thuộc. Không chat, hành động từ xa, vùng đầu khổng lồ, chuyển màu trang trí, kính mờ, biểu đồ giả hoặc thẻ lồng rối.

Bao phủ lần đầu, tải, rỗng, mới, cũ, ngoại tuyến, bị từ chối quyền, đăng ký điện thoại cũ, laptop dừng, có cập nhật, nội dung dài và lỗi chưa biết được diễn đạt an toàn. Vùng chạm tối thiểu 44 px, focus rõ, xin quyền sau chạm; phản hồi không khẳng định hiển thị trên thiết bị thật.

## Nguyên tắc bố cục

- **Ý chính:** một đường tín hiệu riêng đáng tin.
- **Ngôn ngữ hình ảnh:** nền trắng pha màu hoặc xanh đen, tín hiệu bạc hà, thông tin phụ xanh xám, ít đường kẻ, góc 12–16 px khi cần vùng chứa.
- **Thứ tự đọc:** trạng thái hiện tại → tín hiệu mới nhất → thao tác khi cần khôi phục hoặc xử lý.
- **Khung nhìn đầu:** đầu trang VibePing gọn, trạng thái nổi bật, hàng hạn mức rồi hoạt động; nút khôi phục nằm cạnh trạng thái tương ứng.
- **Cách triển khai:** kế thừa Quiet signal và bố cục đã được giao rõ; không mở cuộc chọn hướng mới. Mã hướng đã chọn: `brief-pinned-operate`.
- **Hoàn tất:** có rà soát cuối, kết luận, cập nhật DESIGN.md và nguồn gốc cho ảnh raster phát hành.
