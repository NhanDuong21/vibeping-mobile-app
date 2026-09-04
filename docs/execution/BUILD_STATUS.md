# Trạng thái triển khai

## Bản hiện tại trong repo

**1.3.3 — Theo dõi đến từng giây.** Trang chủ hiển thị thời gian làm việc đến giây khi còn tín hiệu mới; đồng hồ hiển thị độc lập với nhịp lấy dữ liệu. Giữ chặn thông báo tác nhân phụ từ 1.3.2, nhóm hội thoại đã xác minh từ 1.3.1, Cá nhân hóa, Sẵn sàng và kết quả cuối.

Xem [ghi chú 1.3.3](../release-1.3.3.md) và [biên bản 1.3.3](../validation/WORKING_SECONDS_1_3_3.md). Phiên bản trong repo không tự xác nhận phiên bản đang chạy hoặc nghiệm thu iPhone.

## Hồ sơ đợt xây dựng V1 ban đầu

Các trạng thái và số kiểm thử dưới đây là **lịch sử**, không phải kết quả kiểm tra mới.

- Nhánh đợt triển khai: `codex/vibeping-v1-rc1`.
- Commit bắt đầu: `388c7238eb9278032d140239a2bdd3e3bb7a21d7`.
- Origin riêng ổn định: xác định lúc chạy, không ghi tên riêng vào Git.
- Gate 0: đạt; giữ bằng chứng và dữ liệu để quay lại, đã dừng sau khi chuyển RC thành công.
- Gate 1: đạt.
- Giai đoạn 10: hoàn tất; nghiệm thu iPhone còn chờ ở thời điểm bàn giao.
- Trạng thái đợt: `READY_FOR_PERSONAL_ACCEPTANCE` — sẵn sàng nghiệm thu cá nhân.

## Chi tiết từng giai đoạn

### 1. Ứng dụng nền tảng chạy hoàn chỉnh

**Hoàn tất** · Commit: `8a4c1d2eed7b9c8a5e9ae023d8b9d667155b641a`.

- **Đã làm:** PWA Angular/Ionic/Tailwind; hợp đồng OpenAPI/TypeScript sinh tự động; máy chủ Rust/SQLite chỉ loopback; REST khởi tạo/sức khỏe, SSE, mở tuyến SPA, tài nguyên nhúng, giao diện PWA/ngoại tuyến, CI và kiểm tra kiến trúc.
- **Tự động:** `scripts/check.ps1`: độ mới hợp đồng, lint/kiểu/build Angular, 3 kiểm thử đơn vị, 6 kiểm thử JS Gate 0, Rust fmt/Clippy/test đầy đủ, build phát hành, 6 Playwright sáng/tối, kiến trúc và vệ sinh repo.
- **Quan sát/bàn giao:** Trình duyệt trong ứng dụng ở bề rộng mobile; ảnh cuối 390 px; không tràn, yêu cầu đầu lỗi hoặc cảnh báo console; mở lại liên kết sâu và giao diện ngoại tuyến đạt.
- **Giới hạn:** Kiểm tra iPhone thật ngoài giai đoạn này, còn chờ.

### 2. Vòng đời Windows thủ công

**Hoàn tất** · Commit: `05dbb235af2bad0323a9182b6fbd38eec9a982a9`.

- **Đã làm:** Lệnh start/run/stop/restart/status/doctor/open; chạy nền không cửa sổ; khóa chạy trùng; lưu ý định người dùng; điều khiển bằng token; khôi phục lỗi/dữ liệu cũ; SQLite/log/spool cục bộ; chẩn đoán Tailscale/Serve/Funnel; lớp gọi PowerShell 5.1.
- **Tự động:** 9 kiểm thử vòng đời/cơ sở dữ liệu; tích hợp CLI gồm chạy/dừng hai lần, khởi động lại từ đã dừng, lỗi cưỡng bức trong thử nghiệm, thông tin cũ và đường có dấu cách; 2 tích hợp nền tảng; Clippy `-D warnings`, build phát hành, kiến trúc/vệ sinh repo.
- **Quan sát/bàn giao:** Tệp phát hành thật ở cổng 8790 với Tailscale thật; PID đổi sau restart; dừng an toàn xóa thông tin chạy và listener; lớp gọi chạy trên Windows PowerShell 5.1.
- **Giới hạn:** Gate 0 tiếp tục phục vụ Serve cho đến chuyển bản có thể quay lại ở giai đoạn 10.

### 3. Ghép nối và Web Push sản phẩm

**Hoàn tất** · Commit: `38aca8cd2f46b93494a33c9a0137a76a50c6ecf7`.

- **Đã làm:** Mã ghép nối băm dùng một lần gắn danh tính Serve; hướng dẫn cài/quyền; VAPID bền vững; sao lưu/nhập Gate 0 không phá dữ liệu; đăng ký thiết bị; outbox giao dịch với gửi thử trễ, thử lại/TTL có giới hạn và đăng ký cũ; điều hướng chạm thông báo Angular.
- **Tự động:** 18 kiểm thử Rust sản phẩm, tích hợp vòng đời/API, hợp đồng mới, lint/kiểu/build Angular, 3 Angular, 16 Playwright sáng/tối, kiến trúc/vệ sinh repo.
- **Quan sát/bàn giao:** Tự động mobile thử các trạng thái thiết lập; Gate 0 tiếp tục chạy và Funnel tắt.
- **Giới hạn:** Gửi trên iPhone thật bằng tiến trình sản phẩm chờ đến chuyển bản giai đoạn 10.

### 4. Tín hiệu Codex

**Hoàn tất** · Commit: `4d57124c65b852f07b352dbe40b7639ecbe2627b`.

- **Đã làm:** Chọn tệp Codex an toàn; ghép notify/hook lặp an toàn có sao lưu/cùng tồn tại/gỡ; IPC loopback đã lọc và spool khi lỗi; lưu lượt/hoạt động; chống trùng gửi; SSE và giao diện công việc.
- **Tự động:** 24 Rust gồm phân loại, trạng thái, chống trùng, IPC, spool, ghép cấu hình; hợp đồng sinh; lint/kiểu/build và 4 Angular; thử install/status/repair/remove tách biệt.
- **Quan sát/bàn giao:** Cần người dùng xem `/hooks` khi nghiệm thu; không tuyên bố hook thật gửi trước khi tin cậy.
- **Giới hạn:** Hiển thị iPhone thật chờ chuyển bản cuối.

### 5. Hạn mức Codex

**Hoàn tất** · Commit: `6173a96a8a879b29fe9f46517acf88bfeefed891`.

- **Đã làm:** Giám sát phiên App Server chính thức; phân loại tài khoản; chuẩn hóa primary/secondary động; làm mới theo sự kiện/hoàn tất/thủ công/định kỳ; lưu và dùng lần tốt cũ; cảnh báo thấp/rất thấp/hết theo chu kỳ; REST/SSE; tóm tắt/chi tiết.
- **Tự động:** 35 Rust gồm hạn mức/tài khoản/giao thức/khởi động lại/đồng thời/cảnh báo/ràng buộc chủ; 6 Angular; hợp đồng mới; lint/kiểu/build; 20 Playwright sáng/tối.
- **Quan sát/bàn giao:** Tài khoản thật trả ba khung chuẩn hóa; SQLite bằng chứng bỏ qua không có mẫu email/token; áp dụng Impeccable Shape/Implement/Critique/Harden/Adapt.
- **Giới hạn:** Hiển thị iPhone và mô phỏng cảnh báo thấp còn chờ nghiệm thu cuối.

### 6. Hoạt động và ngoại tuyến

**Hoàn tất** · Commit: `0a5033f95572eb50a3392f83ac2613902fadfe8a`.

- **Đã làm:** Khởi tạo theo chủ; danh sách con trỏ/chi tiết/đã đọc; huy hiệu chưa đọc/tab dưới; đích thông báo chính xác; đối soát SSE; IndexedDB có giới hạn/thao tác đã đọc chờ; ngoại tuyến/cũ/thiếu; cập nhật service worker do người dùng chọn.
- **Tự động:** 37 Rust; 9 Angular; hợp đồng mới; lint/kiểu/build phát hành; 30 Playwright sáng/tối gồm phân trang, SSE trùng, liên kết sâu, mở bộ đệm ngoại tuyến và nâng cấu trúc.
- **Quan sát/bàn giao:** Impeccable Shape/Implement/Critique/Harden/Adapt, một vòng ảnh sáng/tối 390 px; sửa cuộn và màu liên kết Ionic.
- **Giới hạn:** Hiển thị iPhone thật chờ nghiệm thu cuối.

### 7. Máy tính, Cài đặt và Chẩn đoán

**Hoàn tất** · Commit: `64644181cee7b231ce3491e01b2756c75af810f6`.

- **Đã làm:** Trạng thái theo chủ; gửi thử trễ; loại thông báo, ngưỡng hạn mức, cảnh báo nghiêm trọng, giờ qua đêm/ngoại lệ khẩn; riêng tư/giao diện/lưu lịch sử; đăng ký lại; chẩn đoán đã lọc và báo cáo sao chép.
- **Tự động:** 42 Rust; 14 Angular; hợp đồng mới; lint/kiểu/build phát hành; 36 Playwright sáng/tối gồm lưu đầy đủ, gửi thử trễ, chẩn đoán, sao chép và WCAG.
- **Quan sát/bàn giao:** Impeccable Shape/Implement/Critique/Harden/Adapt, ảnh 390×844 sáng/tối; sửa dấu hiệu công tắc, vùng chạm, hướng dẫn khôi phục trùng và tương phản chữ.
- **Giới hạn:** Cài đặt trên iPhone, hiển thị trễ và khôi phục quyền thật còn chờ.

### 8. Độ tin cậy và bảo mật

**Hoàn tất** · Commit: `f9c73ee3c810525d7f2e602c14649ee3585523b6`.

- **Đã làm:** Sao lưu/hoàn nguyên nâng cấp SQLite, lưu lịch sử; sao lưu/khôi phục/đặt lại thông báo có xác nhận; xử lý lỗi vòng đời/outbox/spool/SSE/mạng/push/Codex; Host riêng/header; bộ đệm/XSS; log mã ổn định; ACL chủ/SYSTEM.
- **Tự động:** 57 Rust sản phẩm cùng tích hợp CLI/HTTP; 15 Angular; 40 Playwright sáng/tối; hợp đồng, lint, kiểu, release, kiến trúc, vệ sinh repo, quét bí mật/phụ thuộc.
- **Quan sát/bàn giao:** Không tuyên bố iPhone thật; Gate 0 riêng vẫn đang chạy tại giai đoạn này.
- **Giới hạn:** Mã độc cùng người dùng và bản sao chuyển ra ngoài thư mục bảo vệ là rủi ro còn lại.

### 9. Hoàn thiện giao diện

**Hoàn tất** · Commit: `84d969aa844b1a371f46ea5a8a221f54aa229cfd`.

- **Đã làm:** Một vòng Impeccable kiểm tra/sửa/xác nhận có giới hạn trên màn hình chính và khôi phục; sửa tương phản chưa đọc/phân cấp; điều khiển SVG rõ ngữ nghĩa; giảm chuyển động có mục tiêu; kiểm tra tiếng Việt.
- **Tự động:** 57 Rust; 15 Angular; 46 Playwright sáng/tối; WCAG A/AA, 320/375/390/430 px, chữ 125%, bàn phím, chuyển động, tràn, vùng chạm, câu chữ và gói sản phẩm.
- **Quan sát/bàn giao:** Một vòng xác nhận trình duyệt sáng/tối hoàn tất; iPhone thật còn chờ.
- **Giới hạn:** Phông, vùng an toàn và thanh trình duyệt iPhone cần người dùng nghiệm thu.

### 10. Gói Windows và chuẩn bị nghiệm thu

**Hoàn tất** · Commit: `6d6258e0bed9bf28848a034b9de201ae766cf8c9`.

- **Đã làm:** Gói Windows x64 tự chứa `1.0.0-rc.1`; BAT UTF-8/CRLF; ưu tiên Codex native; script phát hành/CI Windows; thử gói sạch; nhập Gate 0 không phá dữ liệu và chuyển có thể quay lại; RC cuối chạy ở origin riêng cũ.
- **Tự động:** 58 Rust sản phẩm; 15 Angular; 46 Playwright; format, Clippy, release, hợp đồng, PWA, kiến trúc, câu chữ, vệ sinh repo, phụ thuộc; gói chạy không công cụ phát triển; localhost/riêng có service worker hoạt động.
- **Quan sát/bàn giao:** Tại lúc bàn giao, ma trận iPhone/bảy ngày còn chờ, đăng ký nhập chờ ghép chủ một lần. Các xác nhận về sau nằm trong danh sách nghiệm thu.
- **Giới hạn:** Tin cậy hook, thông báo hiện thật, worker Màn hình chính tiếp quản và dùng bảy ngày vẫn cần người dùng xác nhận.

## Bước nghiệm thu còn lại

Theo [danh sách nghiệm thu thủ công](MANUAL_ACCEPTANCE.md), hoàn tất các ô còn trống rồi ghi nhận thử dùng bảy ngày. Không tuyên bố mốc ổn định `v1.0.0` của kế hoạch gốc trước khi đủ bằng chứng.

Ở thời điểm bàn giao giai đoạn 10, RC chạy từ gói tại `127.0.0.1:8787`. Đây là điểm tiếp tục lịch sử; cần kiểm tra trạng thái thực tế trước khi vận hành lại. Chỉ gửi thông báo thử khi người dùng đã ghép nối/cập nhật và sẵn sàng quan sát iPhone khóa.

## Cách ghi commit lịch sử

Commit không thể chứa chính mã băm của nó. Đầu giai đoạn sau ghi mã chính xác của giai đoạn trước. Sau commit phát hành giai đoạn 10 có một commit chỉ cập nhật tài liệu để lưu đúng mã phát hành.
