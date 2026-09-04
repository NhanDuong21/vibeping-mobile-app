# Chiến lược kiểm thử

## Chạy kiểm tra đầy đủ

Tại gốc repo, chạy `.\scripts\check.ps1`. Quy trình gồm sinh và kiểm tra hợp đồng API, biên dịch, định dạng, lint, kiểm tra kiểu dữ liệu, kiểm thử Rust/Angular/Playwright, PWA, Tailwind, kiến trúc, dữ liệu nhạy cảm, nội dung tiếng Việt, thư viện phụ thuộc và đóng gói.

## Rust

Kiểm thử đơn vị bao phủ chuẩn hóa, kiểm tra đầu vào, lưu trữ, tách thông điệp, lọc dữ liệu nhạy cảm, định dạng thời lượng/thời điểm đặt lại và phân loại kết quả gửi. Bộ kết nối hạ tầng dùng dữ liệu mẫu hoặc dịch vụ giả cục bộ; không cần tài khoản thật hay dịch vụ gửi thông báo thật.

CI chạy `fmt`, Clippy với cảnh báo được coi là lỗi, kiểm thử và biên dịch bản phát hành trên Windows.

## Trình duyệt và service worker của Gate 0

Kiểm tra tĩnh xác minh manifest, tài nguyên cục bộ, nội dung tiếng Việt, phạm vi/địa chỉ mở ổn định và việc không dùng CDN hoặc Tailwind khi chạy.

Kiểm tra trình duyệt bao phủ localhost và `.ts.net`; bề rộng 320/375/390/430 px; giao diện sáng/tối; focus bàn phím; API; manifest/biểu tượng; đăng ký, phạm vi và cập nhật service worker; lỗi console; yêu cầu thất bại; trạng thái không hỗ trợ hoặc bị từ chối quyền.

Kiểm thử service worker dùng hàm thuần khi có thể để kiểm tra dữ liệu JSON/văn bản/phương án dự phòng và đích mở khi chạm thông báo. Trình duyệt chạy đúng chỉ là bằng chứng chẩn đoán.

## Ma trận iPhone thật

Người dùng ghi nhận khi ứng dụng đang mở, chạy nền, điện thoại khóa, ứng dụng bị vuốt khỏi trình chuyển ứng dụng, điện thoại dùng dữ liệu di động trong khi laptop dùng Wi-Fi, mất mạng rồi có lại, chạm để mở/đưa ứng dụng lên trước và gửi sau khi khởi động lại Rust.

Gate 0 chỉ đạt khi đã quan sát thông báo màn hình khóa/chạy nền và đăng ký vẫn hoạt động sau khởi động lại.

## Angular

Kiểm thử tính năng tách store và Signals khỏi component; dùng bộ giả cho tích hợp bất đồng bộ; kiểm tra tương thích hợp đồng API, loại bỏ bộ đệm IndexedDB hỏng, ánh xạ lỗi sang tiếng Việt và các luồng hoàn chỉnh. Trang không cần kiểm thử nghiệp vụ vốn không nằm trong trang.

## Giao diện sản phẩm

Bộ Playwright từ giai đoạn 9 kiểm tra mọi màn hình chính tại 320/375/390/430 px, cả sáng/tối: WCAG A/AA bằng Axe, một tiêu đề trang hiển thị, vùng chạm 44 px, không tràn ngang và tăng chữ gốc lên 125%.

Bộ kiểm tra còn bao phủ giao diện hệ thống, giảm chuyển động, focus bàn phím, cập nhật do người dùng chọn, dữ liệu đệm khi mất mạng, quyền bị từ chối, đăng ký hết hiệu lực, máy chủ đã dừng và lỗi bất ngờ được diễn đạt an toàn. `scripts/check-mobile-copy.ps1` phát hiện tiếng Anh vô tình lọt vào và thuật ngữ kỹ thuật thô trong template hiển thị.

## Kiến trúc, dữ liệu nhạy cảm và thư viện

Công cụ kiến trúc cảnh báo khi mã nguồn hơn 350 dòng, báo lỗi khi hơn 500 dòng, áp dụng giới hạn chặt hơn cho `main.rs` và cấm tên tệp gom việc chung.

Kiểm tra vệ sinh repo phát hiện dữ liệu chạy/bí mật được theo dõi trong Git, mẫu thông tin đăng nhập và truy cập tệp đăng nhập Codex trong mã chính. Kiểm tra thư viện dùng pnpm audit cho phụ thuộc chạy thực tế và RustSec `cargo audit`. Ngoại lệ phải có đường dẫn, lý do và người chịu trách nhiệm hoặc quyết định liên quan.

## Tích hợp thật

Kiểm tra Tailscale, Web Push và tài khoản Codex thật chỉ chạy cục bộ, ghi bằng chứng vào nơi Git bỏ qua. CI không phụ thuộc mạng Tailscale riêng, điện thoại thật, tài khoản Codex đã đăng nhập hoặc bí mật.

## Gói Windows

Quy trình phát hành sinh lại hợp đồng API, biên dịch Angular, nhúng PWA vào tệp Rust rồi đóng gói Windows x64, ZIP và SHA-256. Gói hiện tại có **chín tệp**, gồm hai tệp thực thi, sáu tệp lệnh và một hướng dẫn; danh sách chính xác nằm trong `scripts/package-windows.ps1`.

Kiểm tra nhanh gói giải nén vào đường dẫn có dấu cách, loại Node.js/pnpm/Rust/Cargo khỏi `PATH` của tiến trình con, rồi kiểm tra chạy/dừng/khởi động lại, sức khỏe, header địa chỉ riêng, tài nguyên PWA, REST, SSE, bộ đọc hạn mức đã lọc dữ liệu nhạy cảm, nhận sự kiện Codex mẫu, xếp hàng gửi trễ, lưu trữ và dọn dẹp an toàn ở cổng phụ.

CI Windows chạy các kiểm tra tự động và tạo gói. Các xác nhận về tài khoản thật, mạng riêng, đăng ký thiết bị và thông báo hiện trên iPhone vẫn tách khỏi CI, do người dùng kiểm chứng.
