# Manual iPhone acceptance

No row in this document is passed by automation. The human completes these checks after the release candidate is running at the existing private origin.

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
