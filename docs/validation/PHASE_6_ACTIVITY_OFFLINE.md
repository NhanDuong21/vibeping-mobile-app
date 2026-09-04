# Giai đoạn 6 — Hoạt động và sử dụng khi mất mạng

Ngày ghi nhận: 02/09/2026.

## Phạm vi

REST khởi tạo theo chủ sở hữu, danh sách theo con trỏ, chi tiết đúng sự kiện, đánh dấu đã đọc/tất cả; trạng thái Codex, tóm tắt hạn mức, huy hiệu chưa đọc, tab dưới, phân trang và liên kết thông báo. Gộp/kết nối lại SSE có chống trùng; IndexedDB có giới hạn, nhãn dữ liệu cũ, giao diện ngoại tuyến, thao tác đã đọc chờ gửi và nâng cấp cấu trúc. Có đường quay lại khi sự kiện thiếu và thông báo cập nhật do người dùng chọn.

## Bằng chứng tự động

- 37 kiểm thử Rust: sản phẩm cũ, danh sách rỗng, phân trang, con trỏ/giới hạn sai, tra chi tiết, đã đọc lặp an toàn và đọc tất cả.
- 9 kiểm thử Angular: kết nối, hạn mức, mở từ bộ đệm, dùng lại dữ liệu cũ, gộp SSE trùng, cập nhật đã đọc trước phản hồi và service worker sẵn sàng.
- OpenAPI/TypeScript sinh đúng phiên bản; lint, kiểm tra kiểu nghiêm ngặt, biên dịch Angular, định dạng Rust, Clippy không cảnh báo, bản Rust phát hành, kiến trúc, vệ sinh repo và diff đều đạt.
- 30 kiểm tra Playwright ở dự án sáng/tối 390 px: tràn ngang 320–430 px, trạng thái hoạt động, tên dài, phân trang, chi tiết, chưa đọc, SSE trùng sau nối lại, liên kết thiếu, mở bộ đệm mất mạng, IndexedDB v1→v2, giao diện PWA, thiết lập ban đầu và hạn mức.

## Rà soát Impeccable

Giữ “Quiet signal”: chữ và đường phân cách tạo phân cấp; màu chỉ biểu thị trạng thái; thanh tab dùng nhãn quen thuộc. Một vòng ảnh 390×844 sáng/tối phát hiện màu liên kết xanh mặc định Ionic và danh sách dài không cuộn trong router outlet.

Đã sửa bằng màu Tailwind rõ ràng và vùng cuộn nội bộ có tính vùng an toàn. Tên dài xuống dòng không tràn; vùng chạm ít nhất 44 px; xử lý giảm chuyển động khi đó còn ở mức toàn cục.

## Cần người dùng xác nhận

Không tuyên bố kết quả iPhone thật. Mở ngoại tuyến từ Màn hình chính, thông báo đến chi tiết, vùng an toàn và kích hoạt cập nhật vẫn nằm trong nghiệm thu sau khi chuyển sang bản sản phẩm.
