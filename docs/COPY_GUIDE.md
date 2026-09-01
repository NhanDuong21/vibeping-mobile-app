# Vietnamese copy guide

## Voice

Use short, calm Vietnamese that says what is true now and what happens next. Prefer familiar nouns (“điện thoại”, “laptop”, “thông báo”) and active recovery (“Mở lại…”, “Bật…”, “Thử lại”). Do not blame the user or claim delivery before it is observed.

Examples:

- “VibePing trên laptop đang tắt”
- “Chưa kết nối được với laptop”
- “Điện thoại cần bật lại thông báo”
- “Hạn mức Codex”
- “VibePing sẽ tự thử lại”
- “Kết nối riêng tư chưa sẵn sàng”
- “Chưa đồng bộ với laptop”
- “Thông báo đang bị tắt trên iPhone”
- “Chưa đọc được thông tin từ Codex”

## Forbidden primary UI language

Never show these as primary user copy: Agent, Daemon, Backend, Endpoint, Subscription, Push token, Rate-limit bucket, SSE, VAPID, Outbox, Migration, JSON-RPC, HTTP 500, SQL error, or Rust panic. Do not expose provider codes, stack traces, key names, or internal identifiers.

## Error mapping policy

Infrastructure returns stable machine codes. The client owns a complete map from code to Vietnamese state, action, and retry behavior. Unknown codes use a safe fallback: “Đã có lỗi khi kiểm tra. VibePing sẽ tự thử lại.” Raw details may be copied only from an explicitly expanded sanitized diagnostic report; they never replace the human message.

## Allowance labels

Use a returned human name only when it is genuinely readable. Otherwise derive a neutral duration label: “Chu kỳ 15 phút”, “Chu kỳ 2 giờ”, or “Chu kỳ 3 ngày”. Known product-friendly phrases such as “Lượt dùng 5 giờ” and “Hạn mức tuần” are allowed when the duration supports them. Never show an identifier such as `codex_other` as the main label.
