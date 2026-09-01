# ADR 006: Standards-based Web Push and durable outbox

- **Status:** Accepted; Gate 0 validates delivery primitives
- **Decision:** Use encrypted standards-based Web Push for background signals. Production delivery uses a SQLite durable outbox.
- **Context:** iPhone Lock Screen/background attention is required without a native app.
- **Alternatives:** Polling, email, Firebase-specific client, SMS, native APNs.
- **Consequences:** Permission and Home Screen installation are explicit; VAPID identity/subscription persist; stale devices and retries require lifecycle rules.
- **Validation needed:** Gate 0 physical iPhone and restart matrix; later atomic outbox/retry tests.
