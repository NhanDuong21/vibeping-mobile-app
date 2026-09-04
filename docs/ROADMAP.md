# Lộ trình xây dựng nền tảng V1

Đây là kế hoạch lịch sử cho bản ứng viên `1.0.0-rc.1`. Gate 0 và Gate 1 đã hoàn tất kiểm chứng rủi ro; các giai đoạn dưới đây được ghi nhận hoàn tất trong [sổ triển khai](execution/BUILD_STATUS.md).

Mỗi giai đoạn bàn giao một phần dùng được từ đầu đến cuối, có kiểm tra tự động, cập nhật sổ và commit mốc theo yêu cầu của đợt triển khai đó. Việc này không thay quy định chỉ commit khi người dùng yêu cầu trong [AGENTS.md](../AGENTS.md). Nghiệm thu iPhone thật vẫn do người dùng thực hiện.

## Hai mốc đã đạt

- **Gate 0:** địa chỉ Tailscale Serve riêng ổn định; PWA cài lên Màn hình chính; giữ VAPID/đăng ký; có bằng chứng màn hình khóa/chạy nền và nhận sau khởi động lại Rust. Các trường hợp dữ liệu di động/ngoại tuyến được phân biệt rõ với bằng chứng PoC trước trong [biên bản](validation/GATE_0_TAILSCALE_WEB_PUSH.md).
- **Gate 1:** đọc tài khoản Codex đã đăng nhập và khung hạn mức động qua phương thức chính thức của `codex app-server`, không đọc thông tin đăng nhập hoặc ghi email.

## Giai đoạn 1 — Ứng dụng nền tảng chạy từ đầu đến cuối

Tạo workspace Angular/Ionic/Tailwind và Rust/SQLite với kiểm tra nghiêm ngặt; sinh hợp đồng API; nhúng web đã biên dịch; chứng minh sức khỏe, khởi tạo, SSE, mở lại tuyến SPA, giao diện đệm service worker và trình duyệt ở cổng không ảnh hưởng Gate 0.

## Giai đoạn 2 — Vòng đời Windows thủ công

Lệnh `start`, `run`, `stop`, `restart`, `status`, `doctor`, `open`; chỉ một phiên chạy; điều khiển dừng cục bộ riêng; lưu ý định người dùng; xử lý thông tin tiến trình cũ; dữ liệu trong local app data. Giai đoạn này chưa có tự chạy Windows; lựa chọn đó được bổ sung có chủ đích ở 1.1.1.

## Giai đoạn 3 — Ghép nối, cài PWA và Web Push

Đưa hành vi đã chứng minh vào mô-đun sản phẩm: ghép nối dùng một lần, kiểm tra danh tính Tailscale, hướng dẫn quyền, chuyển VAPID/đăng ký, outbox bền vững, thử lại/TTL, khôi phục thiết bị cũ, gửi thử trễ và danh tính service worker ổn định.

## Giai đoạn 4 — Tín hiệu cần chú ý từ Codex

Tích hợp notify/hook được hỗ trợ; chọn tệp thực thi xác định; ghép cấu hình an toàn lặp lại được; nhận riêng/spool; chuẩn hóa lượt/sự kiện; chống trùng; lưu hoạt động; SSE và thông báo đủ điều kiện.

## Giai đoạn 5 — Hạn mức Codex

Giám sát App Server; lưu khung primary/secondary động; làm mới/khôi phục; cảnh báo thấp/rất thấp/hết một lần mỗi chu kỳ; tóm tắt/chi tiết không lộ mã nội bộ.

## Giai đoạn 6 — Hoạt động và ngoại tuyến

Diễn biến, lượt hiện tại, chi tiết, chưa đọc, phân trang con trỏ, REST khởi tạo, đối soát SSE, IndexedDB, mất mạng/dữ liệu cũ, liên kết thông báo và cập nhật service worker nhất quán.

## Giai đoạn 7 — Máy tính, Cài đặt, Chẩn đoán

Trạng thái laptop, gửi thử trễ, cài đặt thông báo/hạn mức/giờ yên tĩnh/riêng tư/giao diện/lưu lịch sử, khôi phục thông báo và báo cáo chẩn đoán dễ hiểu, an toàn khi sao chép.

## Giai đoạn 8 — Độ tin cậy và bảo mật

Sao lưu/nâng cấp/khôi phục dữ liệu, outbox/spool qua khởi động lại, tiến trình con, lỗi mạng/dịch vụ gửi, dừng an toàn, Host/origin/CSRF, chống lạm dụng ghép nối, header bảo mật, lọc dữ liệu, quét bí mật và lệnh khôi phục.

## Giai đoạn 9 — Hoàn thiện thiết kế và khả năng tiếp cận

Áp dụng Impeccable critique/harden/adapt/audit/polish có giới hạn ở mọi trạng thái, 320/375/390/430 px, sáng/tối/hệ thống, giảm chuyển động, bàn phím/focus, tiếng Việt động, giới hạn hiệu năng và kiểm tra câu chữ.

## Giai đoạn 10 — Đóng gói và chuẩn bị nghiệm thu

Tạo gói Windows x64 tự chứa `1.0.0-rc.1`; kiểm tra giải nén/vòng đời sạch; giữ địa chỉ riêng và danh tính Gate 0 khi chuyển có thể quay lại; để tiến trình cuối chạy khi an toàn; chuẩn bị danh sách nghiệm thu lần đầu và bảy ngày.

## Ranh giới phát hành

Giai đoạn 10 đạt `READY_FOR_PERSONAL_ACCEPTANCE` — sẵn sàng nghiệm thu cá nhân. Mốc ổn định `v1.0.0` của kế hoạch gốc cần đủ kiểm tra iPhone và bảy ngày sử dụng.

Kế hoạch V1 ban đầu không thêm điều khiển từ xa, truy cập công khai, tài khoản, dữ liệu đám mây, hạ tầng trả phí, gói native hoặc tự chạy. Bản 1.1.1 về sau cho phép tự chạy khi đăng nhập và khôi phục cục bộ theo lựa chọn rõ ràng; xem [ADR 011](adr/011-personal-and-always-ready.md).
