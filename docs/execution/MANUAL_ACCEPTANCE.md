# Manual iPhone acceptance

No row in this document is passed by automation. The human completes these checks after the release candidate is running at the existing private origin.

## Morning handoff

1. Mở `Start VibePing.bat` nếu VibePing chưa chạy.
2. Kết nối Tailscale trên iPhone.
3. Mở biểu tượng VibePing hiện có trên Màn hình chính.
4. Hoàn tất ghép nối/cập nhật một lần nếu được hỏi. Nếu vẫn thấy giao diện Gate 0, đóng VibePing, mở lại một lần, rồi tải lại một lần; không xóa biểu tượng và không đăng ký thông báo lại trừ khi ứng dụng yêu cầu.
5. Xác nhận trạng thái điện thoại đã sẵn sàng.
6. Lên lịch thông báo thử sau 10 giây.
7. Khóa iPhone trước khi hết 10 giây.
8. Ghi lại kết quả hiển thị, âm thanh/rung và hành vi khi chạm thông báo.

Do Angular service worker thay thế worker Gate 0 tại cùng scope, lần mở đầu tiên có thể cần đúng một vòng đóng/mở/tải lại để worker mới giành quyền điều khiển. Đây là bước cập nhật một lần, không phải cài lại PWA.

## Installation and update

- [ ] Tailscale is connected on the iPhone.
- [ ] The existing VibePing Home Screen icon opens the final product.
- [ ] The final product replaces the Gate 0 interface.
- [ ] The private origin has not changed.
- [ ] No reinstall is required, or the documented one-time reload succeeds.

## Push notifications

- [ ] A notification scheduled for 10 seconds appears on the locked iPhone.
- [ ] Tapping the notification opens or focuses VibePing.
- [ ] Foreground delivery behaves correctly.
- [ ] Background delivery behaves correctly.
- [ ] Delivery works after removing VibePing from the app switcher.
- [ ] Delivery works with iPhone cellular data and laptop Wi-Fi.
- [ ] A queued signal arrives after the iPhone goes offline and returns online.
- [ ] Delivery works after the final Rust process restarts.
- [ ] Restart does not require enabling notifications or reinstalling the PWA.

## Codex attention

- [ ] A real Codex task-start signal appears as current work without a push.
- [ ] A real Codex completion creates one activity event and one notification.
- [ ] A permission-required state creates one return-needed notification when safely testable.
- [ ] A failed test followed by a passing test creates no false failure notification.
- [ ] An unresolved final failed test creates one failure notification.

## Codex allowance

- [ ] Real allowance windows are visible and understandable.
- [ ] Percent remaining and local reset time are correct.
- [ ] Manual refresh works.
- [ ] No internal bucket identifier appears as the main label.
- [ ] Low/critical behavior is simulated without changing the real account.

## Lifecycle and state

- [ ] `Start VibePing.bat` starts the application.
- [ ] Running Start a second time reports the existing instance safely.
- [ ] `Stop VibePing.bat` stops the application gracefully.
- [ ] The PWA shows saved history and a stopped-laptop state after Stop.
- [ ] `Restart VibePing.bat` restores service.
- [ ] History, phone registration, and allowance state survive restart.

## Interface and settings

- [ ] Light theme is usable.
- [ ] Dark theme is usable.
- [ ] System theme follows the iPhone.
- [ ] No screen overflows horizontally on the iPhone.
- [ ] All visible client text is Vietnamese.
- [ ] Settings persist and affect behavior.
- [ ] Quiet hours, including an overnight interval, behave correctly.
- [ ] Minimal, balanced, and full lock-screen privacy modes behave correctly.

## Seven-day soak gate

- [ ] No manual process rescue is needed.
- [ ] No phone registration reset is needed.
- [ ] No PWA reinstall is needed.
- [ ] No database repair is needed.
- [ ] No duplicate completion notifications are observed.
- [ ] No final attention event is lost.
- [ ] No allowance stage repeats within one reset cycle.
- [ ] Start, Stop, and Restart remain reliable.
- [ ] Offline recovery remains reliable.
- [ ] No raw technical error reaches the primary interface.

Stable `v1.0.0` remains blocked until this physical matrix and soak gate are complete.
