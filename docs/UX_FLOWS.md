# UX flows

## Desktop lifecycle

The user starts VibePing through an executable or command file, or enables Windows sign-in startup in 1.1.1. Start verifies local prerequisites, launches one instance, checks health, and verifies the stable private URL. Stop drains and closes the process without stopping Tailscale or deleting device identity, and prevents automatic recovery until Start or the next opted-in sign-in. Restart preserves the origin, VAPID identity, subscription, and durable application state. The Windows tray owns local runtime controls; the phone reports readiness only.

## Install on iPhone

1. Connect Tailscale on the iPhone.
2. Open the private `.ts.net` URL in Safari.
3. Share → “Thêm vào MH chính”.
4. Close Safari and open VibePing from the new icon.
5. If opened as a normal tab, show the four installation steps rather than asking for permission.

## Enable notifications

The Home Screen app checks capabilities without prompting. A user tap on “Bật thông báo” triggers the iOS prompt. Granting permission creates or reuses the browser subscription and saves it to the laptop. Success reads “Điện thoại đã sẵn sàng”. Denial reads “Thông báo đang bị tắt trên iPhone” and points to iPhone Settings.

## Send a test notification

“Gửi thông báo thử” is available only after the laptop and phone are ready. Provider acceptance produces a waiting message, not a claim that the phone displayed it. A stale subscription reads “Điện thoại cần bật lại thông báo”.

## Daily use

Future bottom navigation is:

- **Hoạt động:** recent attention events and delivery state.
- **Máy tính:** current laptop connection and manual recovery guidance.
- **Cài đặt:** theme, notifications, quiet policy, and diagnostic export.

The app opens from cache, marks stale content, refreshes through REST, then follows SSE. A notification tap focuses an existing app window or opens the stable origin.

## Low allowance

The allowance view is titled “Hạn mức Codex”. It shows dynamic windows, remaining percentage, and a local-time reset phrase. Low/critical/exhausted thresholds later create deduplicated activity and notification events. It never promises an exact number of prompts remaining.

## Offline and recovery

- Laptop stopped: “VibePing trên laptop đang tắt”.
- Network/Tailscale unavailable: “Chưa kết nối được với laptop” and “VibePing sẽ tự thử lại”.
- Private HTTPS unavailable: “Kết nối riêng tư chưa sẵn sàng”.
- Cached data: “Chưa đồng bộ với laptop”.
- Permission denied: “Thông báo đang bị tắt trên iPhone”.
- Subscription stale: “Điện thoại cần bật lại thông báo”.
- Codex unavailable: “Chưa đọc được thông tin từ Codex”.

Recovery never switches to public exposure or asks for account secrets.
