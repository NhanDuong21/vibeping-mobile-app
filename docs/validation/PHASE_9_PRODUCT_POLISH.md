# Giai đoạn 9 — Hoàn thiện giao diện và khả năng tiếp cận

Ngày ghi nhận: 02/09/2026.

## Phạm vi

Thiết lập ban đầu, hoạt động, chi tiết sự kiện/hạn mức, máy tính, cài đặt, chẩn đoán, có cập nhật, mất mạng, quyền bị từ chối, đăng ký cũ, máy chủ tắt và lỗi bất ngờ an toàn.

Kiểm tra 320/375/390/430 px, giao diện sáng/tối/hệ thống, giảm chuyển động, focus, cấu trúc tiêu đề, tên cho công nghệ hỗ trợ, vùng chạm 44 px, tương phản, tăng chữ 125%, tiếng Việt dài, vùng an toàn và tràn ngang. Rà soát gói biên dịch, trang tải theo nhu cầu, phông/thư viện, giao diện đệm và câu chữ.

## Vòng Impeccable có giới hạn

Đánh giá đầu đạt 18/20, phát hiện: huy hiệu chưa đọc san hô không đủ tương phản WCAG; nhãn đầu mục lặp làm yếu phân cấp; mũi tên Unicode không nhất quán; tên máy phát triển trong thiết lập; quy tắc giảm chuyển động toàn cục ảnh hưởng quá rộng.

Một vòng sửa làm tối màu san hô để chữ trắng đạt 5,08:1, đơn giản tiêu đề, dùng mũi tên SVG rõ, bỏ tên máy giả và chỉ giảm các chuyển động thực/nhịp tải. Đánh giá cuối đạt 20/20. Một lần xác nhận ảnh sáng/tối sau đó không cần vòng sửa hình ảnh thứ hai.

Bằng chứng được Git bỏ qua trong `.runtime/phase9/initial` và `.runtime/phase9/confirmation`, gồm ảnh ghép và từng màn hình, không có dữ liệu sản phẩm thật hoặc bí mật.

## Bằng chứng tự động

- Bộ Playwright được duy trì bao phủ màn hình chính và khôi phục ở sáng/tối.
- Axe không còn lỗi WCAG A/AA; mỗi trang có một `h1` hiển thị, không vùng chạm đo được dưới 44 px, không tràn ngang ở bề rộng được giao hoặc khi tăng chữ 125%.
- Kiểm thử tương tác xác minh giao diện hệ thống, giảm chuyển động công tắc/nhịp tải và focus bàn phím.
- Kiểm tra câu chữ chặn tiếng Anh vô tình lọt, thuật ngữ giao thức/lưu trữ/lỗi thô, địa chỉ loopback và tên máy giả đã bỏ.
- Gói tải đầu tại thời điểm đó: 488,26 kB thô, ước tính truyền 127,89 kB. Mỗi trang tải theo nhu cầu; khung chỉ nhập phần Ionic host/router cần dùng, phông hệ thống cục bộ, không thêm phông ngoài hay yêu cầu trang trí.
- Angular service worker là lớp giao diện đệm duy nhất; cập nhật do người dùng chủ động chọn.

## Cần người dùng xác nhận

Tự động trình duyệt và ảnh desktop không chứng minh cách iPhone thật dựng phông, thanh Safari, vùng an toàn Màn hình chính, hộp quyền hoặc thông báo màn hình khóa. Những việc này thuộc nghiệm thu giai đoạn 10.
