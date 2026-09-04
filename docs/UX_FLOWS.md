# Các luồng sử dụng

## Chạy và dừng trên Windows

Người dùng mở tệp thực thi/tệp lệnh hoặc bật chạy khi đăng nhập Windows từ bản 1.1.1. Khởi động kiểm tra điều kiện cần, bảo đảm chỉ có một phiên chạy, kiểm tra sức khỏe và địa chỉ riêng ổn định.

Dừng xử lý phần việc cần kết thúc và đóng tiến trình, giữ Tailscale cùng danh tính thiết bị. Máy chủ không tự khôi phục cho đến khi người dùng chọn Khởi động hoặc đến lần đăng nhập Windows tiếp theo nếu đã bật lựa chọn đó. Khởi động lại giữ địa chỉ, VAPID, đăng ký điện thoại và dữ liệu bền vững.

Khay Windows cung cấp điều khiển cục bộ. Điện thoại chỉ báo trạng thái sẵn sàng.

## Cài trên iPhone

1. Kết nối Tailscale trên iPhone.
2. Mở địa chỉ riêng `.ts.net` bằng Safari.
3. Chọn Chia sẻ → “Thêm vào MH chính”.
4. Đóng Safari và mở VibePing từ biểu tượng mới.
5. Nếu vẫn mở dưới dạng tab thường, ứng dụng hiển thị bốn bước cài đặt thay vì xin quyền thông báo.

## Bật thông báo

Ứng dụng trên Màn hình chính kiểm tra khả năng hỗ trợ mà chưa mở hộp xin quyền. Khi người dùng bấm **Bật thông báo**, iOS mới hỏi quyền.

Nếu được cấp quyền, ứng dụng tạo hoặc dùng lại đăng ký nhận thông báo và lưu về laptop, rồi báo “Điện thoại đã sẵn sàng”. Nếu bị từ chối, ứng dụng báo “Thông báo đang bị tắt trên iPhone” và hướng dẫn mở Cài đặt iPhone.

## Gửi thông báo thử

**Gửi thông báo thử** chỉ dùng được khi laptop và điện thoại sẵn sàng. Khi dịch vụ gửi chấp nhận yêu cầu, ứng dụng hiển thị trạng thái chờ; chưa khẳng định điện thoại đã hiển thị. Đăng ký hết hiệu lực được diễn đạt là “Điện thoại cần bật lại thông báo”.

## Dùng hằng ngày

Ba tab chính:

- **Hoạt động:** công việc, yêu cầu, kết quả Codex, trạng thái chưa đọc và tổng kết ngày.
- **Máy tính:** kết nối laptop hiện tại và hướng dẫn khôi phục.
- **Cài đặt:** giao diện, thông báo, giờ yên tĩnh, dự án, trạng thái Sẵn sàng và báo cáo chẩn đoán.

Ứng dụng mở từ bộ nhớ đệm, đánh dấu dữ liệu cũ, lấy dữ liệu mới qua REST rồi theo dõi SSE. Chạm thông báo đưa bạn về cửa sổ ứng dụng đang có hoặc mở địa chỉ ổn định, đến đúng yêu cầu liên quan. Yêu cầu chính mới nhất mở sẵn trong chi tiết công việc; yêu cầu cũ mở tại chỗ.

## Khi hạn mức thấp

Trang **Hạn mức Codex** hiển thị các khung hạn mức nhận được, phần trăm còn lại và thời điểm đặt lại theo giờ địa phương. Các mức thấp, rất thấp và hết hạn mức tạo sự kiện và thông báo có chống trùng. Ứng dụng không đoán số câu lệnh còn dùng được.

## Mất kết nối và khôi phục

| Tình huống                          | Nội dung hiển thị                                        |
| ----------------------------------- | -------------------------------------------------------- |
| Laptop đã dừng VibePing             | “VibePing trên laptop đang tắt”                          |
| Mạng hoặc Tailscale không sẵn sàng  | “Chưa kết nối được với laptop”; “VibePing sẽ tự thử lại” |
| HTTPS riêng chưa dùng được          | “Kết nối riêng tư chưa sẵn sàng”                         |
| Đang xem dữ liệu đệm                | “Chưa đồng bộ với laptop”                                |
| Quyền thông báo bị từ chối          | “Thông báo đang bị tắt trên iPhone”                      |
| Đăng ký nhận thông báo hết hiệu lực | “Điện thoại cần bật lại thông báo”                       |
| Chưa đọc được Codex                 | “Chưa đọc được thông tin từ Codex”                       |

Mọi cách khôi phục đều giữ kết nối riêng tư và không yêu cầu người dùng cung cấp bí mật tài khoản.
