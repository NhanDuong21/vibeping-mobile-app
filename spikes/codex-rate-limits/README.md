# Gate 1 — Kiểm chứng cách đọc hạn mức Codex

Công cụ dòng lệnh Rust này khởi chạy bản Codex đã cài trên máy bằng `codex app-server`, giao tiếp qua đầu vào/đầu ra chuẩn (stdio), hoàn thành bước khởi tạo rồi đọc trạng thái tài khoản đã lọc thông tin nhạy cảm. Công cụ gọi `account/rateLimits/read` và chuẩn hóa mọi khung hạn mức `primary`/`secondary` có sẵn.

Công cụ không đọc tệp đăng nhập Codex, cookie trình duyệt, token hoặc nội dung giao diện. Chạy từ gốc repo:

```powershell
cargo run -p vibeping-gate1 -- read
cargo run -p vibeping-gate1 -- read --json
cargo run -p vibeping-gate1 -- doctor
```

`read` hiển thị hạn mức bằng tiếng Việt theo độ dài khung thời gian; `--json` xuất dữ liệu có cấu trúc; `doctor` kiểm tra khả năng tích hợp. Kết quả thật chỉ ghi vào `.runtime/gate1/last-read.json`, được Git bỏ qua. JSON giữ mã nhóm hạn mức đã chuẩn hóa, không chứa email hoặc thông tin đăng nhập.

Xem [biên bản Gate 1](../../docs/validation/GATE_1_CODEX_RATE_LIMITS.md).
