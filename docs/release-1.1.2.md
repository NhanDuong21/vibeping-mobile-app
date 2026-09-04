# VibePing 1.1.2 — Nhịp tín hiệu

Chi tiết hoạt động có thêm một nhịp chuyển động nhẹ để bạn nhận ra Codex vẫn đang làm việc.

- Ba vạch mint chuyển động cạnh **Đang làm việc**, theo đúng phiên đang mở và tín hiệu mới nhận.
- Khi Codex chờ bạn, hoàn tất, dừng hoặc khi mất kết nối hay tín hiệu đã cũ, dấu chuyển động biến mất.
- Chuyển động dừng khi rời màn hình hoặc ẩn app. Chế độ Vừa phải, Tối giản và Giảm chuyển động giữ dấu tĩnh.
- Giữ nguyên timeline, kết quả cuối Codex, hồ sơ dự án, thông báo cá nhân và Sẵn sàng trên Windows.

## Cập nhật

1. Trên Windows, mở **Tat San sang.bat** rồi **Stop VibePing.bat**, đợi khay biến mất. Tạo bản sao lưu bằng `vibeping.exe backup`.
2. Giải nén gói mới và thay toàn bộ tệp trong đúng thư mục đang cài. Giữ nguyên đường dẫn và dữ liệu hiện có.
3. Mở lại **Bat San sang.bat** nếu dùng khay và chạy khi đăng nhập, hoặc **Start VibePing.bat** để chạy thủ công.
4. Trên iPhone, mở VibePing và bấm **Cập nhật** khi thấy **Phiên bản 1.1.2**. Không cần xóa biểu tượng, ghép nối hoặc đăng ký thông báo lại.

Gói Windows x64 đi kèm tệp SHA-256. Đã kiểm thử tự động trạng thái phiên, chế độ chuyển động, giao diện sáng/tối và cập nhật PWA giữ dữ liệu. Hiển thị trên iPhone vật lý vẫn cần xác nhận khi sử dụng.

Kiểm tra bảo mật Rust đạt. Dịch vụ audit npm đang lỗi hoặc hết thời gian chờ nên chưa có kết quả kiểm tra mới; bản này không đổi phiên bản thư viện. Script kiểm tra đã được sửa để báo thất bại đúng khi audit không hoàn tất trên Windows PowerShell 5.1.
