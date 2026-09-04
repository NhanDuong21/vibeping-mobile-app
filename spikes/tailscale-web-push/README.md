# Gate 0 — Kiểm chứng Web Push qua Tailscale

Bản thử nghiệm độc lập này phục vụ PWA chẩn đoán tiếng Việt tại `127.0.0.1:8787`, lưu danh tính gửi VAPID và đăng ký điện thoại mới nhất trong `%LOCALAPPDATA%\VibePing\Gate0`, rồi gửi Web Push được mã hóa. Tailscale Serve cung cấp địa chỉ HTTPS riêng ổn định. Tuyệt đối không dùng Funnel.

## Chạy thử

Chạy tại gốc repo. Nếu bản VibePing chính đang dùng cổng này, cần dừng bản chính trước khi chủ động quay lại Gate 0.

```powershell
.\spikes\tailscale-web-push\scripts\Start-Gate0.ps1
.\spikes\tailscale-web-push\scripts\Show-Gate0Status.ps1
.\spikes\tailscale-web-push\scripts\Send-TestNotification.ps1
.\spikes\tailscale-web-push\scripts\Restart-Gate0.ps1 -SkipBuild
.\spikes\tailscale-web-push\scripts\Stop-Gate0.ps1
```

Các lệnh lần lượt khởi động, xem trạng thái, gửi thông báo thử, khởi động lại và dừng. `-SkipBuild` dùng bản đã biên dịch.

## Dừng và dọn dẹp

Stop giữ nguyên Serve, VAPID và đăng ký điện thoại. Clean Up chỉ khôi phục đúng bản chụp cấu hình Serve khi không phát hiện thay đổi mới hơn. Dữ liệu thông báo được giữ lại, trừ khi truyền `-DeletePushState` và nhập đúng xác nhận `XOA` khi được hỏi.

Kết quả trên iPhone thật là bằng chứng quyết định. Dịch vụ gửi chấp nhận yêu cầu hoặc thông báo hiện trên máy tính chưa đủ để đánh dấu Gate 0 đạt. Xem [biên bản Gate 0](../../docs/validation/GATE_0_TAILSCALE_WEB_PUSH.md).
