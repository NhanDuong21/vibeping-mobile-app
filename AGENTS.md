# Quy định dành cho tác nhân lập trình

Các quy định này áp dụng cho toàn bộ repo. Chỉ triển khai phần việc hoàn chỉnh đang được yêu cầu; không tạo sẵn mã khung cho giai đoạn sau.

## Giới hạn sản phẩm

- VibePing là công cụ theo dõi và nhắc việc phục vụ sử dụng thực tế của một người; không phải sản phẩm điều khiển từ xa hay trò chuyện.
- Mọi nội dung hiển thị trên ứng dụng phải bằng tiếng Việt, dễ hiểu, chỉ rõ việc có thể làm và không lộ lỗi kỹ thuật thô.
- Không thêm tài khoản, nhóm, thanh toán, bảng phân tích, lệnh Codex từ xa, truy cập terminal, gói ứng dụng di động native, triển khai công khai hoặc hạ tầng trả phí.
- Tuyệt đối không bật Tailscale Funnel. Máy chủ chỉ lắng nghe trên localhost và chỉ được truy cập riêng tư qua Tailscale Serve.
- VibePing chỉ khởi động khi người dùng thao tác rõ ràng hoặc đã bật tùy chọn chạy khi đăng nhập Windows từ bản 1.1.1. Được phép có điều khiển tại khay Windows và tự khôi phục có giới hạn. Dừng phải ngăn tự khôi phục cho đến khi người dùng chọn Khởi động hoặc đến lần đăng nhập Windows tiếp theo nếu đã bật tùy chọn đó. Không thêm điều khiển tiến trình từ điện thoại.

## Kiến trúc

- Rust tổ chức theo tính năng, trong một ứng dụng nguyên khối chia mô-đun rõ ràng; các bộ kết nối hạ tầng phải tách biệt.
- Angular tổ chức theo tính năng, dùng các component độc lập nhỏ. Signals quản lý trạng thái cục bộ/giao diện; RxJS quản lý luồng dữ liệu và tích hợp bất đồng bộ.
- Component cấp trang Angular chỉ điều phối trạng thái và tương tác. Không đặt logic mạng, lưu trữ hoặc nghiệp vụ trong trang.
- Hàm xử lý HTTP chỉ kiểm tra đầu vào, gọi một ca sử dụng rồi ánh xạ kết quả. Quy tắc nghiệp vụ nằm ngoài hàm xử lý HTTP.
- Truy cập cơ sở dữ liệu phải qua lớp repository/store thuộc tính năng tương ứng. Không dùng nguyên DTO của API làm mô hình nghiệp vụ mà không xem xét.
- SQLite trên Windows là nguồn dữ liệu chính. IndexedDB trên iPhone chỉ là bộ nhớ đệm.
- Hợp đồng API sinh tự động là nguồn duy nhất cho DTO; không tự khai báo trùng hợp đồng Rust và TypeScript. Cơ chế này được triển khai ở giai đoạn sau của nền tảng.
- Viết kiểu dáng bằng lớp tiện ích Tailwind. Không dùng CSS/SCSS của component, Sass, Tailwind CDN hoặc sửa tay CSS được sinh tự động.
- Dùng skill Impeccable trong dự án cho mọi thay đổi người dùng nhìn thấy.

## Giới hạn kích thước

- `main.rs`: tối đa 120 dòng logic có ý nghĩa.
- Mã nguồn thông thường, không phải mã sinh tự động: mục tiêu 100–300 dòng; cảnh báo khi hơn 350 dòng; CI báo lỗi khi hơn 500 dòng.
- Hàm: mục tiêu dưới 40 dòng; cảnh báo khi hơn 60 dòng; tránh vượt 80 dòng.
- Tách tệp theo trách nhiệm của tính năng, không tạo tệp gom việc không liên quan.

Tên tệp bị cấm: `utils.ts`, `utils.rs`, `helpers.ts`, `helpers.rs` và `common.service.ts`. Cũng cấm: `main.rs` chứa mọi thứ; dịch vụ gom các lĩnh vực không liên quan; truy cập phần nội bộ riêng của tính năng khác; logic nghiệp vụ trong template, component hoặc hàm xử lý Axum; sửa tay tệp sinh tự động; tạo lớp trừu tượng dự phòng hoặc mã khung cho tính năng chưa được yêu cầu.

## Chất lượng và bảo mật

- Mọi thay đổi hành vi phải thêm hoặc cập nhật kiểm thử có ý nghĩa.
- Trước khi bàn giao, chạy kiểm tra định dạng, lint, kiểm thử, biên dịch bản phát hành, biên dịch Tailwind, kiểm tra kiến trúc và kiểm tra dữ liệu nhạy cảm/tệp không được đưa vào Git.
- Không đưa vào Git: khóa riêng VAPID, dữ liệu đăng ký nhận thông báo, nhật ký, PID, ảnh chụp cấu hình Tailscale, kết quả Codex thật, token, cookie, email và đường dẫn riêng của máy.
- Không đọc tệp thông tin đăng nhập Codex hoặc ghi email tài khoản vào nhật ký. Dùng `codex app-server` để đọc trạng thái tài khoản và hạn mức.
- Không sửa repo bên cạnh `vibeping-ios-push-poc`.

## Bàn giao

Mỗi nhiệm vụ phải hoàn thành một phần chức năng dùng được từ đầu đến cuối. Giữ nguyên các thay đổi không liên quan của người dùng. Chỉ commit hoặc push khi người dùng yêu cầu rõ ràng.
