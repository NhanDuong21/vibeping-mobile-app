# Mục lục tài liệu VibePing

Tài liệu dành cho người sử dụng VibePing và người bảo trì mã nguồn. Bản hiện tại trong repo là **1.3.3**. Ghi chú phát hành, biên bản kiểm chứng và quyết định cũ ghi lại trạng thái tại thời điểm lập tài liệu; chúng không xác nhận trạng thái đang chạy trên máy bạn.

## Chọn tài liệu theo nhu cầu

| Nhu cầu                                        | Tài liệu                                                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Cài, cập nhật, chạy, dừng, sao lưu             | [Cài và vận hành](INSTALL_VI.md)                                                                                  |
| Xem tính năng hiện có                          | [README dự án](../README.md), [định hướng sản phẩm](../PRODUCT.md)                                                |
| Xem thay đổi mới nhất                          | [Bản 1.3.3](release-1.3.3.md), [1.3.2](release-1.3.2.md), [1.3.1](release-1.3.1.md)                               |
| Hiểu dữ liệu đi đâu và thành phần nào xử lý    | [Kiến trúc](ARCHITECTURE.md)                                                                                      |
| Hiểu cách dùng và lời nhắc trên ứng dụng       | [Luồng sử dụng](UX_FLOWS.md), [quy ước câu chữ](COPY_GUIDE.md)                                                    |
| Hiểu quy tắc giao diện                         | [Hệ thống thiết kế](../DESIGN.md), [định hướng màn hình mobile](execution/MOBILE_SURFACE_BRIEF.md)                |
| Sửa và kiểm tra mã nguồn                       | [Quy định repo](../AGENTS.md), [README mobile](../apps/mobile/README.md), [chiến lược kiểm thử](TEST_STRATEGY.md) |
| Hiểu rủi ro và cách bảo vệ dữ liệu             | [Mô hình rủi ro](THREAT_MODEL.md)                                                                                 |
| Tra cứu lý do chọn kiến trúc                   | [Các quyết định kiến trúc — ADR](adr/), [sổ quyết định triển khai](execution/DECISIONS.md)                        |
| Tra cứu quá trình xây dựng V1                  | [Lộ trình](ROADMAP.md), [sổ theo dõi triển khai](execution/BUILD_STATUS.md)                                       |
| Xem bằng chứng đã kiểm tra                     | [Biên bản kiểm chứng](validation/)                                                                                |
| Kiểm tra trên iPhone thật và theo dõi bảy ngày | [Danh sách nghiệm thu thủ công](execution/MANUAL_ACCEPTANCE.md)                                                   |

## Một số từ thường gặp

| Thuật ngữ               | Nghĩa trong VibePing                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Repo                    | Thư mục mã nguồn được quản lý bằng Git.                                                                           |
| PWA                     | Ứng dụng web có thể thêm vào Màn hình chính iPhone để mở như ứng dụng.                                            |
| Máy chủ / host          | Tiến trình VibePing trên Windows, lưu dữ liệu chính và gửi thông báo.                                             |
| Localhost / loopback    | Địa chỉ nội bộ máy, ví dụ `127.0.0.1`; tiến trình chỉ lắng nghe tại đây.                                          |
| Tailnet                 | Mạng Tailscale riêng chứa laptop và iPhone của bạn.                                                               |
| Origin                  | Gốc địa chỉ web, gồm giao thức, tên máy và cổng; VibePing giữ ổn định địa chỉ HTTPS riêng `.ts.net`.              |
| Web Push                | Cơ chế gửi thông báo đến trình duyệt/PWA, kể cả khi ứng dụng không mở.                                            |
| VAPID                   | Cặp khóa xác định bên gửi Web Push. Khóa riêng phải được giữ kín và giữ qua các lần khởi động.                    |
| Subscription            | Bản đăng ký nhận thông báo của thiết bị, gồm địa chỉ nhận và vật liệu mã hóa.                                     |
| Outbox                  | Hàng đợi gửi được lưu trong cơ sở dữ liệu, giúp thử lại sau lỗi hoặc khởi động lại.                               |
| Hook / notify           | Cơ chế Codex gọi chương trình khi có sự kiện. Hook VibePing cần được người dùng xem và tin cậy trong Codex.       |
| App Server              | Giao thức qua `codex app-server`, dùng để đọc dữ liệu Codex được hỗ trợ.                                          |
| REST / SSE              | REST lấy dữ liệu hoặc gửi yêu cầu; SSE nhận cập nhật khi ứng dụng đang mở.                                        |
| Cache                   | Bộ nhớ đệm giúp mở lại dữ liệu khi mất mạng; có thể dựng lại từ dữ liệu chính trên Windows.                       |
| Công việc / Yêu cầu     | Công việc đại diện cho cuộc hội thoại chính và tác nhân phụ đã xác minh; Yêu cầu là từng lượt được lưu bên trong. |
| DTO / hợp đồng API      | Cấu trúc dữ liệu trao đổi giữa máy chủ và ứng dụng; được sinh tự động trong dự án.                                |
| Gate / giai đoạn        | Gate là mốc chứng minh tích hợp rủi ro; giai đoạn là phần triển khai sản phẩm.                                    |
| ADR                     | Bản ghi quyết định kiến trúc: hoàn cảnh, lựa chọn, lý do và hệ quả.                                               |
| Lint / E2E / smoke test | Lint tìm lỗi/quy tắc mã; E2E kiểm tra luồng từ đầu đến cuối; smoke test kiểm tra nhanh chức năng thiết yếu.       |
| CSP / CSRF              | CSP giới hạn nguồn nội dung trình duyệt được tải/chạy; token CSRF giúp ngăn trang khác giả yêu cầu ghi.           |
| ACL / SID               | Quyền truy cập tệp Windows / mã nhận diện tài khoản Windows.                                                      |
| IPC / stdio / JSONL     | Giao tiếp giữa tiến trình / đầu vào-đầu ra chuẩn / mỗi dòng là một thông điệp JSON.                               |
| WAL / migration         | Cách SQLite ghi nhật ký giao dịch / bước nâng cấp cấu trúc dữ liệu.                                               |
| TTL / lease             | Thời hạn của việc gửi / quyền xử lý tạm để các tiến trình không gửi trùng.                                        |
| RC / soak test          | RC là bản ứng viên phát hành; soak test là thử dùng liên tục trong thời gian dài.                                 |

Tên lệnh, đường dẫn, trường API, mã trạng thái và số phiên bản giữ nguyên để đối chiếu với mã nguồn. Một số tiêu đề trong tài liệu ngữ cảnh thiết kế giữ từ khóa tiếng Anh vì Impeccable dùng chúng để đọc cấu trúc; phần giải thích vẫn bằng tiếng Việt.
