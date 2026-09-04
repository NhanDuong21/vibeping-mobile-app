# Quy ước viết nội dung tiếng Việt

## Giọng điệu

Viết ngắn, bình tĩnh, nói đúng trạng thái hiện tại và bước tiếp theo. Dùng danh từ quen thuộc như “điện thoại”, “laptop”, “thông báo”; hướng dẫn bằng động từ như “Mở lại…”, “Bật…”, “Thử lại”. Không đổ lỗi cho người dùng hoặc nói thông báo đã hiện khi chưa có bằng chứng.

Các câu mẫu:

- “VibePing trên laptop đang tắt”
- “Chưa kết nối được với laptop”
- “Điện thoại cần bật lại thông báo”
- “Hạn mức Codex”
- “VibePing sẽ tự thử lại”
- “Kết nối riêng tư chưa sẵn sàng”
- “Chưa đồng bộ với laptop”
- “Thông báo đang bị tắt trên iPhone”
- “Chưa đọc được thông tin từ Codex”

## Không đưa thuật ngữ nội bộ lên thông báo chính

Không dùng các từ sau làm nội dung chính trên giao diện: Agent, Daemon, Backend, Endpoint, Subscription, Push token, Rate-limit bucket, SSE, VAPID, Outbox, Migration, JSON-RPC, HTTP 500, SQL error hoặc Rust panic.

Không hiển thị mã của nhà cung cấp, dấu vết ngăn xếp lỗi, tên khóa hoặc mã định danh nội bộ. Trong tài liệu kỹ thuật, giữ thuật ngữ cần đối chiếu và giải thích bằng tiếng Việt; xem [bảng thuật ngữ](README.md).

## Chuyển lỗi kỹ thuật thành hướng dẫn

Hạ tầng trả về mã lỗi ổn định. Ứng dụng ánh xạ từng mã thành trạng thái tiếng Việt, hành động và cách thử lại. Mã chưa biết dùng câu an toàn:

> Đã có lỗi khi kiểm tra. VibePing sẽ tự thử lại.

Chi tiết kỹ thuật chỉ được sao chép từ báo cáo chẩn đoán đã lọc thông tin nhạy cảm, sau khi người dùng chủ động mở rộng. Báo cáo không thay thế thông báo dễ hiểu.

## Tên khung hạn mức

Chỉ dùng tên trả về từ Codex khi tên đó dễ đọc. Nếu không, đặt tên theo thời lượng: “Chu kỳ 15 phút”, “Chu kỳ 2 giờ” hoặc “Chu kỳ 3 ngày”.

Có thể dùng “Lượt dùng 5 giờ” hoặc “Hạn mức tuần” khi đúng với thời lượng thực tế. Không lấy mã như `codex_other` làm nhãn chính.

## Tên gọi nhất quán

- **Công việc:** cuộc hội thoại chính cùng các tác nhân phụ đã xác minh.
- **Yêu cầu:** từng lượt được lưu bên trong công việc.
- **Thời gian ghi nhận:** khoảng thời gian có bằng chứng; không gọi là tổng thời gian làm việc.
- **Dữ liệu đã lưu:** bản đệm hoặc kết quả đọc trước đó; không diễn đạt như dữ liệu đang trực tiếp cập nhật.
- **Sẵn sàng trên Windows:** trạng thái và lựa chọn chạy ở laptop; không ngụ ý điện thoại có thể khởi động hoặc dừng máy chủ.
