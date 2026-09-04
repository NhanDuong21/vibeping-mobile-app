# Giai đoạn 10 — Kiểm chứng bản ứng viên dùng cá nhân

Ngày ghi nhận: 02/09/2026. Đây là biên bản lịch sử của `1.0.0-rc.1`; các trạng thái “đang chạy” và “đang chờ” dưới đây thuộc lần kiểm chứng đó.

## Gói phát hành

- Phiên bản: `1.0.0-rc.1`; nền tảng Windows x64.
- Thư mục: `artifacts/VibePing-Windows-x64-v1.0.0-rc.1/`.
- ZIP: `artifacts/VibePing-Windows-x64-v1.0.0-rc.1.zip`.
- SHA-256: `e351f2af504eff80cd7e5a70cf46061ad3c3f7a8541d59d9c1326f15e8dbe007`.
- Sáu tệp: `vibeping.exe`, bốn BAT Start/Stop/Restart/Open và `Huong-dan.txt`.
- Máy sử dụng không cần công cụ phát triển.

Quy trình sinh lại hợp đồng, biên dịch Angular, tính dấu nhận diện tài nguyên và nhúng PWA, biên dịch Rust, tạo đúng thư mục, nén ZIP và ghi mã kiểm tra ASCII. BAT dùng UTF-8 BOM/CRLF và `%~dp0`, chạy ở đường dẫn có dấu cách; không thêm tự chạy hoặc cưỡng bức dừng bình thường.

## Kiểm tra nhanh gói

Gói giải nén sạch tại đường dẫn có dấu cách, cổng phụ 8793, đã đạt. Môi trường con không có Node.js, pnpm, Cargo hoặc Rust.

Đã kiểm tra vòng đời, sức khỏe localhost/Host riêng, HSTS/tài nguyên PWA, REST, SSE, đọc hạn mức thật đã lọc, nhận sự kiện mẫu qua lệnh tích hợp đóng gói, hàng đợi trễ, dữ liệu qua khởi động lại và dừng an toàn.

## Chuyển bản có thể quay lại

Trước chuyển, bằng chứng được Git bỏ qua đã ghi tiến trình/sức khỏe Gate 0, Serve chỉ trong tailnet, Funnel tắt, bản sao toàn bộ dữ liệu chạy và mã băm VAPID/đăng ký khớp.

Lần BAT đầu gặp lỗi phân tích lệnh UTF-8/LF trên Windows; tự quay lại Gate 0. Sau đó nguồn BAT đổi sang UTF-8 BOM/CRLF và luồng Stop đóng gói được kiểm tra riêng.

Lần cuối RC khởi động đúng, nhưng phép thử tạm dùng API Gate 0 `/api/health` nhận 404 và thử quay lại. Gate 0 không chiếm được cổng vì RC khỏe đang giữ 8787. Đọc đúng hợp đồng sản phẩm `/api/v1/health` trả dịch vụ `vibeping`, phiên bản `1.0.0-rc.1`; vì vậy giữ tiến trình đóng gói. Phép thử tạm sai nằm ngoài script phát hành, không đổi dữ liệu hoặc mạng riêng.

SQLite dùng WAL; dấu nhập Gate 0 hoàn tất; có một đăng ký nhập đang hoạt động nhưng chưa nhận chủ sở hữu. Tệp VAPID đích khớp nguồn; hai tệp nguồn khớp bản sao có thời gian. Dữ liệu nguồn Gate 0 giữ nguyên. Đăng ký nhập chỉ gắn với điện thoại sau ghép nối.

Tại thời điểm đó, gói chạy trên `127.0.0.1:8787`; origin riêng trả sức khỏe RC có HSTS. Serve giữ nguyên, chỉ tailnet, Funnel tắt. Tích hợp chọn `codex.exe` native chính thức, đọc được hạn mức đã lọc và Notify/Hooks sẵn sàng; bước tin cậy `/hooks` còn chờ.

## Xác nhận trình duyệt

Trình duyệt trong ứng dụng mở localhost và origin riêng từ gói. Cả hai hiện thiết lập tiếng Việt, không cảnh báo/lỗi console, có manifest và `sw.js` đang kiểm soát ở gốc tương ứng. Trang riêng 390×844 giữ tiêu đề/nút chính, không tràn ngang. Tự động không gửi biểu mẫu ghép nối hoặc thông báo thật.

## Bằng chứng tự động

- Định dạng Rust và Clippy với cảnh báo là lỗi.
- 58 kiểm thử Rust sản phẩm, tích hợp CLI/HTTP và biên dịch phát hành.
- 15 kiểm thử Angular, lint, kiểm tra kiểu, build sản phẩm và hợp đồng mới.
- 46 Playwright, gồm ma trận tiếp cận/đáp ứng giai đoạn 9.
- Kiểm tra JavaScript/PWA Gate 0.
- Kiến trúc, câu chữ, bí mật, dữ liệu chạy trong Git và phụ thuộc.
- Gói Windows tái tạo được và kiểm tra nhanh trong môi trường sạch.

## Cần người dùng xác nhận

Tự động không chứng minh service worker đã tiếp quản iPhone cũ, ghép nối, quyền thông báo, màn hình khóa, đang mở/chạy nền, chạm mở, dữ liệu di động/ngoại tuyến, nhận sau khởi động lại, tin cậy hook thật hoặc ổn định bảy ngày.

Khi lập biên bản này, danh sách nghiệm thu còn chưa đánh dấu. Các xác nhận bổ sung về sau nằm trong [danh sách nghiệm thu](../execution/MANUAL_ACCEPTANCE.md). Trạng thái giai đoạn là `READY_FOR_PERSONAL_ACCEPTANCE` — sẵn sàng để người dùng nghiệm thu, chưa phải bản ổn định `v1.0.0`.
