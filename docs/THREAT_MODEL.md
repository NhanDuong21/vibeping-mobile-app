# Mô hình rủi ro và bảo vệ dữ liệu

## Những gì cần bảo vệ

Lịch sử hoạt động và kết quả Codex được giữ lại, hạn mức, cơ sở dữ liệu SQLite, khóa riêng VAPID, đăng ký điện thoại (địa chỉ nhận và khóa mã hóa), tên/cấu hình mạng riêng Tailscale, nhật ký đã lọc và sự chú ý của người dùng.

## Truy cập và thực thi

- **Lộ ứng dụng ra Internet:** Funnel, đường hầm công khai hoặc lắng nghe ngoài loopback có thể làm lộ bề mặt truy cập. Cấm Funnel, chỉ bind `127.0.0.1`, kiểm tra Serve và giữ ranh giới mạng riêng.
- **Tiến trình độc hại trên Windows:** tiến trình khác của cùng người dùng có thể gọi localhost hoặc sửa dữ liệu chạy. Thư mục dữ liệu có ACL không kế thừa, chỉ cho người dùng hiện tại/SYSTEM; kiểm tra tệp và kích thước; không có API chạy lệnh; điều khiển nội bộ cần token. Mã độc cùng quyền người dùng vẫn là rủi ro còn lại.
- **Thiết bị khác trong tailnet bị xâm nhập:** chỉ nhận một chủ sở hữu gắn với header đăng nhập Tailscale Serve đáng tin; thao tác ghi cần JSON cùng origin, token CSRF mỗi lần chạy, giới hạn tần suất và quyền API tối thiểu. Không có lệnh từ xa.
- **Giả mạo sự kiện qua kênh cục bộ:** listener điều khiển dùng cổng loopback tạm, token ngẫu nhiên mỗi lần chạy, JSON tối đa 64 KiB và tập trường chuẩn hóa khép kín. Không có tuyến HTTP nhận sự kiện thô.
- **Đọc trái phép hoạt động:** sau ghép nối, các API khởi tạo, danh sách/chi tiết, hạn mức và SSE cần đúng danh tính chủ sở hữu từ Serve. Thao tác đánh dấu đã đọc còn cần JSON cùng origin và CSRF.
- **Sửa cài đặt trái phép:** đọc cần chủ sở hữu; ghi cần thêm cùng origin và CSRF. Máy chủ kiểm tra enum, giờ, độ lệch múi giờ, ngưỡng và thời gian lưu.

## Thông báo và khóa gửi

- **Lộ đăng ký điện thoại:** dữ liệu chứa địa chỉ dịch vụ nhận và khóa mã hóa. Không ghi log, commit hay xuất dữ liệu này; lưu cục bộ và vô hiệu khi trả HTTP 404/410.
- **Lộ khóa VAPID:** có thể bị dùng để giả danh bên gửi tới các đăng ký. Lưu khóa ngoài repo, không in ra, lọc nhật ký và chỉ xóa khi có thao tác rõ ràng.
- **Thư viện RSA gián tiếp:** hồ sơ kiểm toán của dự án ghi nhận `web-push-native` kéo RustCrypto RSA qua phần JWT, với cảnh báo thời gian xử lý Marvin chưa có bản sửa trong lần đánh giá đó. VibePing chỉ tạo/ký VAPID P-256/ES256, không cung cấp giải mã hay ký RSA. Script kiểm tra phụ thuộc nêu ngoại lệ này và báo lỗi nếu mã chính hoặc Gate 0 có thao tác RSA; kết quả phụ thuộc mới nhất phải lấy từ lần chạy kiểm tra hiện tại.
- **Thông báo quá nhiều hoặc sai:** dùng tag ổn định, nội dung tối thiểu, chống trùng, công tắc theo loại, giờ yên tĩnh có ngoại lệ khẩn rõ ràng và gửi thử do người dùng chọn. Dịch vụ gửi chấp nhận không có nghĩa điện thoại đã hiển thị.
- **Quy tắc dự án vượt cài đặt chung:** công tắc chung quyết định cuối; trước gửi phải kiểm tra lại quy tắc dự án, trạng thái đang chờ, thời lượng, giờ yên tĩnh và riêng tư. Chỉ có một lời nhắc bền vững cho mỗi lượt/đăng ký.
- **Lộ nội dung trên màn hình khóa:** người ở gần có thể đọc tên dự án hoặc tóm tắt. Chế độ riêng tư thay chi tiết bằng lời nhắc mở ứng dụng; danh sách bên trong vẫn có chi tiết và ràng buộc chủ sở hữu.

## Tích hợp Codex

- **Lộ thông tin đăng nhập:** chỉ dùng App Server qua stdio để đọc trạng thái cần thiết. Không đọc tệp đăng nhập, cookie, token hoặc header xác thực.
- **Lộ nội dung không cần thiết:** hook có thể chứa lời nhắc, tham số/kết quả công cụ và đường dẫn hội thoại. Phân loại đầu vào có giới hạn ngay trong bộ nhớ; không mở tệp transcript hoặc lưu lời nhắc/nhật ký công cụ.
- **Kết quả cuối được lưu có chủ đích:** bản hiện tại giữ câu trả lời cuối, giới hạn 8.000 ký tự Unicode, lấy từ notify hoặc lượt khớp chính xác qua App Server. Đây là dữ liệu cá nhân được phép hiển thị, khác với nhật ký công cụ. Danh sách chỉ dùng trích đoạn đã lọc; chi tiết và bộ đệm đã xem cần được bảo vệ cùng lịch sử. Xem [kiến trúc](ARCHITECTURE.md).
- **Lộ thông tin tài khoản từ phản hồi/stderr:** chỉ phân tích chế độ tài khoản và trường hạn mức cần thiết trong bộ nhớ; bỏ stderr có giới hạn, băm mã nhóm, từ chối nhãn đáng ngờ. Không lưu email, mã tài khoản, token hoặc phản hồi thô.
- **Ghi đè hook của người dùng:** sao lưu có thời gian; ghép TOML giữ định dạng; chỉ sở hữu các mục JSON VibePing; cài/sửa lặp lại an toàn; chuyển tiếp notify cũ; chỉ gỡ mục đúng chủ sở hữu. Xem và tin cậy qua `/hooks` vẫn bắt buộc.

## Khởi động và khôi phục

- **Tự chạy ngoài ý muốn:** Sẵn sàng cần bật rõ ràng; chỉ quản lý một mục HKCU Run với đối số được đặt trong dấu nháy, có thể tắt hoàn nguyên. Ý định chạy/dừng được xử lý tuần tự, có khóa chạy trùng. Khôi phục dùng điều khiển cục bộ đã xác thực, không giết PID tùy ý. Giữ thư mục cài ổn định và tắt Sẵn sàng trước khi chuyển. Không có Windows service hoặc API điều khiển từ xa.
- **Lộ hoặc sửa gói sao lưu:** gói chứa lịch sử chính và có thể có khóa VAPID. Chỉ tạo trong thư mục được ACL bảo vệ, không in nội dung, giới hạn kích thước, kiểm tra mã toàn vẹn và danh tính SQLite. Khôi phục cần ứng dụng dừng và xác nhận; lỗi thì hoàn nguyên. Người dùng phải bảo vệ bản sao chuyển ra ngoài.

## Giao diện, bộ đệm và nhật ký

- **Lộ dữ liệu chẩn đoán:** báo cáo chỉ tạo từ tập trạng thái cố định, số lượng, phiên bản và thời gian. Không ghép đường dẫn, endpoint, danh tính, lỗi thô, token hoặc dữ liệu đăng ký. Kiểm thử với giá trị có hình dạng bí mật.
- **Bộ đệm mobile cũ hoặc bị đọc:** người có quyền truy cập điện thoại có thể xem dữ liệu gần đây và chi tiết đã lưu. Chỉ đệm dữ liệu hiển thị được phép, có giới hạn; không đệm lời nhắc, nhật ký công cụ, danh tính tài khoản hay khóa thông báo. Gắn nhãn dữ liệu cũ, chống trùng bằng mã sự kiện, đối soát REST theo chủ sở hữu và giữ SQLite là dữ liệu chính.
- **Nhật ký lộ bí mật:** dùng mã lỗi ổn định, không nội suy lỗi thô; stderr có giới hạn; quét bí mật và chỉ xuất báo cáo đã lọc.

## Khi hệ thống gián đoạn

Laptop ngủ, Tailscale ngắt, iPhone mất mạng, dịch vụ giới hạn gửi, đăng ký hết hiệu lực, Codex hết thời gian chờ/thoát hoặc VibePing dừng lỗi là các tình huống cần xử lý.

Thử lại Web Push, đăng ký lại do người dùng chọn, khởi động lại App Server với thời gian chờ tăng, đọc dự phòng, dữ liệu hạn mức tốt gần nhất, hướng dẫn chẩn đoán và hàng chờ sự kiện đã lọc đều có giới hạn. Lỗi không được mở đường công khai hoặc tự xóa danh tính đã lưu.

## Rủi ro còn lại

Bản dùng cá nhân không thể ngăn hoàn toàn người có quyền truy cập vật lý, mã độc cùng quyền người dùng hoặc việc lộ bản sao lưu được chuyển ra ngoài thư mục bảo vệ.
