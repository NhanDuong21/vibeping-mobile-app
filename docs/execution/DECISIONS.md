# Sổ quyết định triển khai

Các mục dưới đây ghi quyết định ngày **02/09/2026** của đợt xây dựng nền tảng V1. Phạm vi và quyền thực hiện là của đợt đó, không tự cho phép tác nhân ở nhiệm vụ mới. Các thay đổi về sau xem [ADR](../adr/), [kiến trúc hiện tại](../ARCHITECTURE.md) và ghi chú phát hành.

## Giữ nền tảng đã kiểm chứng

Bắt đầu từ commit sạch `388c723`, gồm công việc hợp lệ sau `6139525`. Gate 0/Gate 1 vẫn đạt. Giữ mã và bằng chứng thử nghiệm; đưa hành vi đã chứng minh vào mã sản phẩm, không gọi mã thử nghiệm khi chạy sản phẩm.

## Giữ Gate 0 chạy ở giai đoạn đầu

Gate 0 giữ `127.0.0.1:8787` và gốc Serve riêng. Phát triển sản phẩm ở cổng khác cho đến khi giai đoạn 10 có kế hoạch chuyển/quay lại và máy chủ cuối đạt kiểm tra nhanh cổng phụ.

## Kế thừa định hướng Impeccable đã được giao

Trong đợt này người dùng đã yêu cầu chạy không cần theo dõi và cung cấp đối tượng, mục đích, câu chữ, trạng thái, bề rộng, hướng hình ảnh, nền tảng, chuẩn tiếp cận và giới hạn. Không cần hỏi thêm tùy chọn thiết kế. Giữ **Quiet signal**, chế độ Operate, màu tiết chế, điều khiển mobile quen thuộc, ít vùng đóng khung và không thêm tài nguyên trang trí.

## Ranh giới Codex chính thức

Dùng App Server stdio JSONL: `account/read`, `account/rateLimits/read`, `account/rateLimits/updated`. Hoàn tất qua notify cấp người dùng và dữ liệu `agent-turn-complete`. Không tiêu lượt đặt lại hạn mức, không đọc tệp đăng nhập hoặc dựa vào định dạng transcript không được công bố.

## Mã commit trong sổ

Commit không thể chứa mã của chính nó; giai đoạn sau hoàn tất hàng trước. Sau giai đoạn 10 có một commit chỉ ghi sổ để lưu mã phát hành chính xác, giữ lịch sử sản phẩm và mười commit giai đoạn đã được yêu cầu.

## Tài nguyên web và chính sách CSP

Build Angular tạo URL tài nguyên tính từ gốc để tải lại SPA hoạt động với `base-uri` nghiêm ngặt. Tắt chèn critical CSS trực tiếp vì hàm tải nội tuyến được sinh xung đột `script-src 'self'`.

CSP chỉ cho script cùng nguồn, cho kiểu dáng nội tuyến do web component Ionic cần áp dụng lúc chạy. Kiểm thử trình duyệt lỗi khi có lỗi console; giai đoạn 8 kiểm toán lại chính sách. Build Rust tính dấu nhận diện mọi tài nguyên web trước nhúng, tránh Cargo dùng lại PWA cũ khi chỉ đầu ra Angular đổi.

## Điều khiển tiến trình cục bộ riêng

Máy chủ có listener loopback tạm thứ hai để dừng. Địa chỉ/token ngẫu nhiên mỗi lần chạy chỉ ở thư mục dữ liệu cục bộ được Git bỏ qua. Serve chỉ chuyển cổng ứng dụng, không tới kênh điều khiển. Khóa tệp giữ suốt vòng đời. `status` kiểm tra hợp đồng sức khỏe thật, coi thông tin PID không đọc/truy cập được là cũ.

Windows dùng `CreateProcessW` không kế thừa handle, không cửa sổ console, để `start` trả về kể cả khi gọi qua pipe/bộ thử. Tiến trình con ghi log luân phiên trực tiếp. Dừng bình thường không cưỡng bức giết tiến trình.

## Chủ sở hữu và độ tin cậy của thông báo

Nhận chủ lần đầu dùng mã tám ký tự, hạn 10 phút, một lần, chỉ lưu SHA-256. Chỉ tin header Tailscale khi Serve cung cấp Host `.ts.net`; chặn giả mạo trực tiếp localhost. Ghi cần JSON, đúng Origin HTTPS riêng và CSRF mỗi lần chạy. Trước nhận chủ chỉ cho trạng thái đăng ký và gửi thử có giới hạn tần suất.

Chuyển Gate 0 chỉ sao chép: sao lưu có thời gian, dùng lại VAPID/đăng ký đã chứng minh, giữ nguồn, gắn đăng ký nhập sau ghép nối. Service worker Angular là bên duy nhất xử lý push/click; worker bao chỉ nhập `ngsw-worker.js`, nội dung dùng `navigateLastFocusedOrOpen`.

## Hook được duyệt và notify được hỗ trợ

Hoàn tất từ mảng notify cấp người dùng. Công việc hiện tại, xin phép, kiểm thử cuối và bằng chứng bản xem trước từ hook vòng đời được hỗ trợ. Chỉ ghép hook thuộc VibePing, chuyển tiếp notify cũ, giữ hook dự án/plugin như Impeccable; bắt buộc duyệt `/hooks`, không truyền cờ bỏ tin cậy.

Tại giai đoạn này, dữ liệu bền vững chỉ gồm khóa phiên/lượt băm, tên cuối dự án đã lọc, tín hiệu thuộc tập cố định và giờ. Không mở transcript hoặc lưu lời nhắc/nội dung công cụ. Kết quả kiểm thử sau công cụ chỉ là trạng thái tham khảo: lỗi giữa chừng không báo; lỗi chưa sửa tại Stop/hoàn tất mới tạo cần chú ý. Cơ chế giữ câu trả lời cuối được bổ sung ở RC8, mô tả trong kiến trúc hiện tại.

## Giám sát hạn mức qua App Server

Đưa chuỗi `initialize`, `initialized`, `account/read`, `account/rateLimits/read` của Gate 1 vào một tiến trình con sống lâu. Sự kiện cập nhật, hoàn tất, làm mới thủ công tuần tự và đọc dự phòng 10 phút dùng một bộ đọc. Thoát bất ngờ thử lại sau 1/5/20/60 giây; giữ dữ liệu tốt cũ, không chặn nhận hoạt động/push. Nhịp đọc sau đó được thay ở RC7.

Mã nhóm nội bộ chỉ là SHA-256. Chỉ nhận nhãn có giới hạn, không giống mã định danh/bí mật; còn lại đặt nhãn tiếng Việt theo thời lượng. Trạng thái cảnh báo theo khung băm + giờ đặt lại, nên thấp/rất thấp/hết chỉ tiến một lần mỗi chu kỳ, không đổi tài khoản thật để thử.

## Hoạt động ngoại tuyến là bản sao có thể dựng lại

SQLite là dữ liệu chính. PWA đệm tối đa 100 sự kiện, công việc hiện tại, tóm tắt hạn mức, phân trang, lần đồng bộ và thao tác đã đọc chờ gửi. Gắn nhãn khi chỉ dùng đệm, gửi lại thao tác sau kết nối, đối soát SSE bằng REST và gộp ID trùng.

Liên kết thông báo mở đúng chi tiết; sự kiện thiếu/hết hạn có đường quay lại dễ hiểu. Sau ghép nối, lớp kiểm tra chủ áp dụng đọc dữ liệu riêng, hoạt động, hạn mức và luồng. Trước nhận chủ, đọc chỉ để hỗ trợ thiết lập cục bộ; mọi ghi đã đọc cần chủ, JSON cùng origin và CSRF.

Service worker Angular là giao diện ngoại tuyến duy nhất. Có bản mới thì hiện lời mời tiếng Việt và chỉ tải lại khi bấm Cập nhật, không tự làm mất trạng thái đang đọc.

## Cài đặt điều khiển gửi, vẫn giữ hoạt động

Tắt loại thông báo chỉ ngăn việc gửi; sự kiện vẫn ghi trong danh sách theo chủ. Giờ yên tĩnh lưu `HH:MM` và độ lệch giờ điện thoại lúc sửa; bắt đầu muộn hơn kết thúc nghĩa là qua nửa đêm.

Xin phép, lỗi cuối chưa sửa, hạn mức rất thấp/hết chỉ vượt giờ yên tĩnh khi đã bật ngoại lệ khẩn. Ngưỡng thấp chọn 1–50%; rất thấp/hết có công tắc riêng. Riêng tư thay nội dung khóa bằng lời hướng dẫn chung. Gửi thử trễ bỏ qua bộ lọc thông thường vì là thao tác chẩn đoán trực tiếp.

## Chẩn đoán chỉ dùng dữ liệu đã lọc

Máy tính tổng hợp độ sẵn sàng mà Rust đang quản lý. Chẩn đoán tạo kiểm tra/hướng khôi phục từ giá trị ổn định và sức khỏe SQLite. Báo cáo sao chép chỉ gồm phiên bản, enum, số đếm, thời gian; không xuất đối tượng lỗi, đường dẫn, danh tính Tailscale/tài khoản Codex, endpoint hoặc khóa. Khôi phục thông báo là thao tác trên iPhone, không sửa quyền iOS từ xa.

## Khôi phục rõ ràng và bảo vệ theo chủ

Kiểm tra SQLite trước/sau nâng cấu trúc. Dữ liệu cũ được checkpoint và sao lưu trước; lỗi đóng pool rồi phục hồi đúng byte cũ, trả lời tiếng Việt dễ hiểu.

Restore chỉ nhận gói VibePing có giới hạn, checksum và danh tính SQLite đúng; cần `--confirm` và ứng dụng dừng. Tạo bản sao trước khôi phục, kiểm tra qua bộ kết nối bình thường, hoàn nguyên nếu lỗi. Đặt lại thông báo cũng cần dừng/xác nhận, không thay chủ hoặc VAPID.

Thư mục dữ liệu Windows dùng ACL không kế thừa cho SID hiện tại và Local System, bảo vệ VAPID, SQLite, điều khiển, log, bản sao. Giữ đúng khóa gửi nhập vào, hỗ trợ nền mà không đặt vật liệu giải mã trong môi trường tiến trình.

Từ chối đổi ACL đệ quy ở gốc hệ thống tệp, gốc hồ sơ người dùng hoặc thư mục làm việc. Bản sao chuyển ra ngoài vẫn nhạy cảm.

## Hoàn thiện giao diện trong một vòng sửa

Giai đoạn 9 giữ Quiet signal và kiến trúc. Lần đầu phát hiện lỗi WCAG huy hiệu chưa đọc, nhãn lặp, mũi tên Unicode khó hiểu, tên máy phát triển trong thiết lập và giảm chuyển động áp dụng quá rộng.

Một vòng sửa xử lý các điểm này, giới hạn giảm chuyển động đúng nơi và thêm kiểm tra tiếp cận/tiếng Việt được duy trì. Một vòng ảnh sáng/tối xác nhận kết thúc kiểm tra hình ảnh; các kiểm thử không liên quan hình ảnh về sau không mở lại vòng này.

## Gói ứng viên tự chứa

Gói ban đầu có đúng `vibeping.exe` đã nhúng web, bốn BAT thao tác rõ ràng và hướng dẫn tiếng Việt. BAT UTF-8 BOM/CRLF giữ chữ và `%~dp0` có dấu cách trên PowerShell 5.1/`cmd.exe`. Bản này chưa tự chạy, máy dùng không cần Node.js/pnpm/Rust/Cargo. Gói chín tệp và Sẵn sàng được thêm ở 1.1.1.

Chọn Codex ưu tiên `codex.exe` native chính thức hơn tệp gọi npm, để tích hợp hoạt động khi bỏ công cụ phát triển khỏi `PATH`, vẫn theo notify/hook và bước tin cậy bắt buộc.

## Chuyển bản giữ danh tính riêng

Giai đoạn 10 sao lưu đủ trạng thái quay lại Gate 0, xác minh băm người gửi/đăng ký và thử gói ở cổng phụ. Tiến trình cuối chỉ chép VAPID/đăng ký vào dữ liệu sản phẩm được bảo vệ, giữ nguồn/bản sao có thời gian rồi tiếp quản cổng loopback cũ.

Serve vẫn chỉ tailnet tại origin cũ; Funnel tắt. Quay lại là dừng RC an toàn rồi chạy Gate 0 đã giữ, không sửa Serve hoặc xóa danh tính điện thoại.
