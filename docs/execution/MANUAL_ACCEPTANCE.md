# Nghiệm thu thủ công trên iPhone

Danh sách ghi lại xác nhận của người dùng, không được đánh dấu đạt bằng tự động. Giữ nguyên các ô đã xác nhận và còn chờ. Đây là hồ sơ nghiệm thu nền tảng V1; các biên bản bản mới không tự hoàn tất những ô còn trống.

## Kiểm tra lần đầu sau bàn giao

1. Mở `Start VibePing.bat` nếu VibePing chưa chạy.
2. Kết nối Tailscale trên iPhone.
3. Mở biểu tượng VibePing hiện có trên Màn hình chính.
4. Hoàn tất ghép nối/cập nhật một lần nếu được hỏi. Nếu vẫn thấy Gate 0, đóng, mở lại một lần rồi tải lại một lần; không xóa biểu tượng hoặc đăng ký lại trừ khi ứng dụng yêu cầu.
5. Xác nhận điện thoại đã sẵn sàng.
6. Lên lịch thông báo thử sau 10 giây.
7. Khóa iPhone trước khi hết 10 giây.
8. Ghi nhận hiển thị, âm thanh/rung và hành vi khi chạm.

Angular service worker thay worker Gate 0 trong cùng phạm vi; lần mở đầu có thể cần đúng một vòng đóng/mở/tải lại để worker mới tiếp quản. Đây là cập nhật một lần, không phải cài lại PWA.

## Cài đặt và cập nhật

- [x] Tailscale đã kết nối trên iPhone.
- [x] Biểu tượng VibePing hiện có trên Màn hình chính mở bản sản phẩm cuối.
- [x] Bản sản phẩm đã thay giao diện Gate 0.
- [x] Địa chỉ riêng không đổi.
- [x] Không cần cài lại, hoặc cách tải lại một lần đã thành công.

## Thông báo

- [x] Thông báo hẹn 10 giây xuất hiện trên iPhone đã khóa.
- [x] Chạm thông báo mở hoặc đưa VibePing lên trước.
- [x] Nhận đúng khi ứng dụng đang mở.
- [x] Nhận đúng khi ứng dụng chạy nền.
- [x] Nhận sau khi vuốt VibePing khỏi trình chuyển ứng dụng.
- [x] Nhận khi iPhone dùng dữ liệu di động và laptop dùng Wi-Fi.
- [x] Tín hiệu chờ đến sau khi iPhone mất mạng rồi có lại.
- [x] Nhận sau khi tiến trình Rust bản cuối khởi động lại.
- [x] Khởi động lại không cần bật thông báo hoặc cài PWA lại.

Bằng chứng ngày 02/09/2026: iPhone đã khóa hiển thị thông báo thử trễ, có âm thanh hoặc rung; chạm mở hoặc đưa VibePing lên trước.

## Tín hiệu Codex

- [ ] Bắt đầu công việc Codex thật hiện thành công việc hiện tại mà không gửi thông báo.
- [ ] Hoàn tất Codex thật tạo một hoạt động và một thông báo.
- [ ] Trạng thái cần cấp phép tạo một thông báo cần quay lại, khi có thể thử an toàn.
- [ ] Kiểm thử lỗi rồi đạt không tạo thông báo lỗi sai.
- [ ] Kiểm thử cuối lỗi chưa được sửa tạo một thông báo lỗi.

## Hạn mức Codex

- [x] Khung hạn mức thật hiển thị dễ hiểu.
- [x] Phần trăm còn lại và giờ đặt lại địa phương đúng.
- [x] Làm mới thủ công hoạt động.
- [ ] Không có mã nhóm nội bộ làm nhãn chính.
- [ ] Mô phỏng mức thấp/rất thấp mà không đổi tài khoản thật.

## Vòng đời và dữ liệu

- [ ] `Start VibePing.bat` khởi động ứng dụng.
- [ ] Chạy Start lần hai báo an toàn rằng đã có phiên chạy.
- [ ] `Stop VibePing.bat` dừng an toàn.
- [ ] PWA hiện lịch sử đã lưu và trạng thái laptop dừng sau Stop.
- [ ] `Restart VibePing.bat` khôi phục dịch vụ.
- [ ] Lịch sử, đăng ký điện thoại và hạn mức còn sau khởi động lại.

## Giao diện và cài đặt

- [x] Giao diện sáng dùng được.
- [x] Giao diện tối dùng được.
- [x] Giao diện hệ thống theo iPhone.
- [x] Không màn hình nào tràn ngang trên iPhone.
- [ ] Mọi chữ hiển thị của ứng dụng là tiếng Việt.
- [x] Cài đặt được giữ và có tác dụng.
- [ ] Giờ yên tĩnh, gồm khoảng qua đêm, hoạt động đúng.
- [ ] Ba mức riêng tư màn hình khóa, từ ít đến nhiều chi tiết, hoạt động đúng.

## Thử dùng liên tục bảy ngày

- [ ] Không cần cứu tiến trình thủ công.
- [ ] Không cần đặt lại đăng ký điện thoại.
- [ ] Không cần cài lại PWA.
- [ ] Không cần sửa cơ sở dữ liệu.
- [ ] Không thấy thông báo hoàn tất trùng.
- [ ] Không mất sự kiện cuối cần chú ý.
- [ ] Không lặp mức cảnh báo hạn mức trong cùng chu kỳ.
- [ ] Khởi động, Dừng và Khởi động lại vẫn tin cậy.
- [ ] Khôi phục sau mất mạng vẫn tin cậy.
- [ ] Không lỗi kỹ thuật thô xuất hiện trên giao diện chính.

Mốc ổn định `v1.0.0` trong kế hoạch gốc vẫn cần hoàn tất ma trận này và thử dùng bảy ngày. Tài liệu này không tự tuyên bố các bản phát hành sau đã được nghiệm thu.
