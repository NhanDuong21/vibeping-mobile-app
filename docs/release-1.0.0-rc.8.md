# VibePing 1.0.0-rc.8 — Đọc kết quả Codex trên iPhone

Ghi chú lịch sử cho phiên bản trong tiêu đề. Để cài hoặc cập nhật bản hiện tại, xem [hướng dẫn vận hành](INSTALL_VI.md).

## Thay đổi

- Khi nhận câu trả lời cuối, Hoạt động hiện “Codex đã có kết quả” và đoạn trích cụ thể. Chạm vào thẻ để đọc **Kết quả Codex**, gồm đoạn văn, danh sách và khối mã. Kết quả đến muộn tự bổ sung vào thẻ và trang chi tiết đang mở, không cần tải lại hoặc tạo thông báo trùng.
- Lưu tối đa 8.000 ký tự của câu trả lời cuối; có ghi rõ khi bị rút ngắn. Kết quả đã xem vẫn đọc được từ bộ nhớ đệm khi laptop mất kết nối. Với hoạt động cũ hoặc không có nội dung, ứng dụng nói rõ chưa có kết quả để đọc.
- “Hiện tóm tắt” trên Màn hình khóa dùng đoạn trích tối đa 160 ký tự khi phù hợp. “Chỉ báo” và “Tên dự án” giữ nguyên mức riêng tư. Mức riêng tư được kiểm tra lại trước khi gửi, kể cả thông báo đang chờ hoặc thử lại.
- Ưu tiên `last-assistant-message` từ thông báo hoàn tất được [OpenAI mô tả](https://learn.chatgpt.com/docs/config-file/config-advanced#notifications). Khi cần, dùng [`thread/read`](https://learn.chatgpt.com/docs/app-server) và chọn câu trả lời cuối của đúng lượt đã hoàn tất; không lấy lời báo tiến độ, suy luận, lời nhắc hoặc nhật ký công cụ làm kết quả. Không chạy lại tác vụ hoặc gửi lệnh từ điện thoại.
- Phần đọc dùng nội dung dạng chữ: không thực thi HTML, mở liên kết hoặc tải ảnh trong câu trả lời. Dữ liệu thật chỉ nằm trong thư mục dữ liệu cục bộ và bộ nhớ đệm điện thoại, không đưa vào Git. Dữ liệu kết quả được dọn cùng hoạt động theo thời hạn lưu hiện có.
- Tìm lại Codex khi đường dẫn tệp thực thi đã thay đổi sau cập nhật, để việc đọc tên tác vụ và kết quả không phụ thuộc đường dẫn cũ.
- Kiểm thử bàn phím chờ màn Hoạt động dựng xong trước khi nhấn Tab, tránh lỗi CI thỉnh thoảng đo focus khi trang còn đang khởi tạo.

## Cập nhật

Giữ VibePing và Tailscale chạy trên laptop. Trên iPhone, mở VibePing, chờ **Có bản VibePing mới · Phiên bản 1.0.0-rc.8**, rồi bấm **Cập nhật**. Kết quả được ghi nhận cho các lượt hoàn tất từ bản này; không tự điền lại lịch sử cũ. Thông báo đã gửi trước khi nhận được kết quả không bị gửi lại.

## Kiểm chứng

- 124 kiểm thử Rust, 84 kiểm thử Angular, 6 kiểm thử nền PWA và 102 kịch bản trình duyệt sáng/tối đạt. Lượt trình duyệt đầy đủ dùng 2 tiến trình kiểm thử; kiểm tra bàn phím đã qua sau khi chờ màn hình sẵn sàng.
- Kiểm thử nguồn và lưu trữ bao gồm: đúng lượt/đúng câu trả lời cuối, loại lời báo tiến độ, giới hạn Unicode, bổ sung kết quả muộn, không tạo thẻ trùng, giữ trạng thái đã đọc, lưu qua khởi động lại, bộ nhớ đệm ngoại tuyến và không cho phản hồi HTTP cũ thay trang chi tiết khác. Thông báo đang chờ/thử lại được kiểm tra với cả ba mức riêng tư.
- Đã xác minh trực tiếp `thread/read` trên tác vụ đang dùng: Codex trả được 6 câu trả lời cuối của các lượt đã hoàn tất. Chỉ ghi nhận số lượng và độ dài để kiểm chứng; không in hoặc đưa nội dung thật vào Git.
- Gói Windows qua kiểm tra nhanh chung và `scripts/smoke-codex-result.mjs`: dữ liệu gửi hoàn tất đi qua tệp thực thi, lưu chi tiết, đẩy đoạn trích qua SSE, bổ sung kết quả vào cùng thẻ và đọc lại sau khởi động lại. Dùng dữ liệu giả trong thư mục tạm, không đăng ký người nhận thông báo.
- Nâng cấp PWA RC7 → RC8 đạt: hiện đúng phiên bản, chờ bấm Cập nhật, giữ dữ liệu cục bộ và mở giao diện mới khi ngoại tuyến. Kiểm tra giao diện theo một lô ở 320–430 px đạt; không phát hiện lỗi WCAG A/AA hoặc tràn ngang trên các màn kết quả và quyền riêng tư.
- Định dạng, lint, kiểu dữ liệu, Tailwind, hợp đồng API sinh tự động, nội dung tiếng Việt, kiến trúc và vệ sinh kho mã đạt. Biên dịch bản phát hành toàn workspace đạt. npm audit production không có lỗ hổng đã biết; RustSec đạt với ngoại lệ RUSTSEC-2023-0071 đã xét trước đó do VAPID chỉ dùng ES256, không có thao tác RSA trong mã ứng dụng.
- Đã sao lưu dữ liệu trước nâng cấp cấu trúc dữ liệu và triển khai RC8 lên tiến trình đang dùng. Trạng thái sức khỏe cục bộ và manifest ở địa chỉ riêng tư đều là RC8. Tệp khởi chạy, dữ liệu và cấu hình Tailscale Serve được giữ; Funnel tắt, có bản sao tệp thực thi và dữ liệu trước nâng cấp.
- Gói khởi đầu 555,35 kB (ước tính 146,08 kB khi truyền), vượt mức cảnh báo 491 kB và dưới mức chặn 700 kB. Chưa kiểm tra trực tiếp trên iPhone thật.
