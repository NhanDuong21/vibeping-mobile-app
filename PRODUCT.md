# Định hướng sản phẩm VibePing

<!-- impeccable:product-schema 1 -->

## Platform

web

Mục này giữ tên `Platform` và giá trị `web` để công cụ đọc đúng nền tảng. Ứng dụng trên iPhone là PWA được thêm vào Màn hình chính.

## Công nghệ

Ứng dụng dùng Angular 22, Ionic Angular 9, Tailwind CSS, Angular Signals và RxJS. IndexedDB chỉ là bộ nhớ đệm có thể dựng lại. Phần chạy trên Windows là ứng dụng Rust 1.98 chia mô-đun theo tính năng, dùng SQLite làm dữ liệu chính.

Hai bản thử nghiệm Gate 0 và Gate 1 được giữ để kiểm tra lại các tích hợp rủi ro. Ứng dụng chính phát triển từ những kết quả đã được kiểm chứng này.

## Người dùng và hoàn cảnh sử dụng

Một người dùng Codex trên một laptop Windows x64, mang theo một iPhone và kết nối cả hai vào cùng mạng Tailscale riêng. Người dùng tự khởi động VibePing hoặc chủ động bật chạy cùng phiên đăng nhập Windows. Họ cần nhận tín hiệu đáng tin khi rời laptop, kể cả khi điện thoại dùng dữ liệu di động hoặc đang khóa.

## Vấn đề cần giải quyết

Khi người dùng ở nơi khác, Codex có thể làm xong, chờ xử lý, kết thúc với kiểm thử chưa đạt, có bản xem trước hoặc tiêu thụ gần hết hạn mức. VibePing cần:

- báo đến iPhone vào những thời điểm cần chú ý;
- hiển thị các khung hạn mức Codex và giải thích khi sắp hết;
- vẫn hữu ích khi laptop, điện thoại hoặc mạng tạm gián đoạn;
- giúp người dùng yên tâm theo dõi, không biến điện thoại thành terminal hay ứng dụng chat.

## Mục đích

VibePing là cầu nối thông báo, ưu tiên dữ liệu cục bộ. Tiến trình Windows giữ dữ liệu bền vững và gửi Web Push tiêu chuẩn qua địa chỉ Tailscale riêng ổn định. Khi cần tương tác, người dùng quay lại ChatGPT/Codex.

## Phạm vi hiện có

- Khởi động, dừng và khởi động lại trên Windows.
- **Cá nhân hóa từ 1.1.1:** tên, biểu tượng và màu nhấn nhẹ cho dự án; bộ lọc thông báo theo dự án; ngưỡng thời lượng để báo hoàn tất; một lần nhắc chờ được lưu bền vững; tổng kết ngày; chuyển động nguyên hình linh vật theo trạng thái. Giữ các tab và kết quả Codex đã có.
- **Sẵn sàng từ 1.1.1:** người dùng bật chạy cùng phiên đăng nhập Windows; khay điều khiển cục bộ; kiểm tra sức khỏe âm thầm và tự khôi phục có giới hạn. Dừng ngăn tự khôi phục trong phiên đăng nhập hiện tại. Điện thoại chỉ hiển thị trạng thái.
- Theo dõi công việc hoàn tất, cần người dùng quay lại, kiểm thử cuối chưa đạt, bản xem trước sẵn sàng và hạn mức thấp.
- **Từ 1.3.1:** một cuộc hội thoại Codex cùng các tác nhân phụ được xác minh là một **Công việc** trong Hoạt động. Từng lượt lưu lại là **Yêu cầu**, mở ngay trong chi tiết công việc với diễn biến thật, thời lượng quan sát được, trạng thái đã đọc và kết quả riêng. Yêu cầu chính mới nhất mở sẵn; kết quả tác nhân phụ vẫn đọc được. Công việc chỉ có một yêu cầu không cần nhãn phân cấp.
- Trạng thái rảnh được trình bày gọn; kết quả kỹ thuật đầy đủ nằm trong chi tiết. Không gộp hội thoại độc lập hoặc bản tách do người dùng tạo chỉ vì cùng dự án hay thông tin phiên. Không tự thêm giai đoạn, tên hoặc giờ bắt đầu vào dữ liệu cũ.
- Đọc câu trả lời cuối của Codex trong chi tiết; danh sách và chế độ thông báo tiêu chuẩn có thể hiển thị trích đoạn ngắn. Đây là nội dung chỉ đọc.
- **Từ 1.3.2:** chỉ báo hoàn tất cho hội thoại chính đã xác minh; kết quả tác nhân phụ vẫn lưu trong lịch sử.
- **Từ 1.3.3:** công việc đang chạy ở trang chủ hiển thị đến giây, cập nhật khi trang đang mở và có dữ liệu mới; đồng hồ tạm dừng khi chạy nền hoặc mất kết nối.
- Dùng REST và SSE khi PWA mở; Web Push khi chạy nền. Chỉ đọc hạn mức qua `codex app-server`.
- Có giao diện sáng, tối và theo hệ thống; nội dung ứng dụng bằng tiếng Việt. SQLite giữ dữ liệu chính; IndexedDB chỉ giữ bản đệm.

## Ngoài phạm vi

Không có trả lời hoặc phê duyệt từ điện thoại, terminal, chạy lệnh từ xa, điều khiển màn hình, chat, tài khoản, nhóm, thanh toán, bảng phân tích, gói Capacitor native hay tự cập nhật tệp thực thi. Không phân phối qua Apple, dùng tên miền trả phí, đường hầm công khai, máy chủ/cơ sở dữ liệu thuê ngoài hoặc VPS.

## Nguyên tắc sản phẩm

1. **Báo đúng lúc:** cho biết khi nào cần quay lại Codex để hành động.
2. **Riêng tư và cục bộ:** giữ trạng thái trên Windows, truy cập ứng dụng trong mạng riêng.
3. **Lưu bền vững:** giữ danh tính gửi, đăng ký thiết bị, sự kiện và công việc thử lại qua các lần khởi động.
4. **Nói rõ việc cần làm:** dùng từ quen thuộc, giải thích bước tiếp theo trước chi tiết kỹ thuật.
5. **Làm từng phần hoàn chỉnh:** kiểm chứng tích hợp rủi ro trước khi mở rộng sản phẩm.

## Bằng chứng nền tảng

Repo bên cạnh `../vibeping-ios-push-poc` từng chứng minh Web Push tiêu chuẩn trên iPhone: màn hình khóa/chạy nền, dữ liệu di động, đóng ứng dụng khỏi trình chuyển ứng dụng và nhận bù sau mất mạng qua Quick Tunnel tạm thời. Repo đó chỉ được tham khảo, không sửa.

Gate 0 kiểm chứng địa chỉ riêng lâu dài và hành vi sau khởi động lại. Chỉ ghi nhận kết quả đã có bằng chứng.

## Tiêu chí nghiệm thu nền tảng V1

- Tệp thực thi Windows được khởi động thủ công vẫn cung cấp cùng địa chỉ PWA riêng `.ts.net` sau khởi động lại.
- PWA trên Màn hình chính nhận thông báo liên quan khi khóa/chạy nền, không cần cài lại hoặc tạo lại đăng ký.
- Màn hình hoạt động và hạn mức khôi phục từ dữ liệu Windows sau gián đoạn mạng.
- Đọc được khung hạn mức Codex thật qua phiên App Server đã đăng nhập mà không xử lý thông tin đăng nhập.
- Nội dung tiếng Việt dễ hiểu, dễ tiếp cận, bình tĩnh và không lộ lỗi kỹ thuật thô.

## Khả năng tiếp cận

Vùng chạm tối thiểu 44×44 px; hỗ trợ bề rộng 320–430 px; đủ tương phản ở giao diện sáng và tối; tôn trọng vùng an toàn iPhone. Chỉ xin quyền khi người dùng thao tác, luôn thấy vị trí focus và tuân theo lựa chọn giảm chuyển động.
