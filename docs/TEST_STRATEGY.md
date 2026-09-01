# Test strategy

## Rust

Unit tests cover normalization, validation, persistence, framing, redaction, duration/reset formatting, and delivery classification. Adapter tests use fixtures or local fakes; they do not require live accounts or push providers. Workspace CI runs `fmt`, Clippy with warnings denied, tests, and a release build on Windows.

## Gate 0 browser and service worker

Static checks validate the manifest, local assets, Vietnamese surface, stable scope/start URL, and absence of CDN/Tailwind runtime use. Browser checks cover local and `.ts.net` origins, 320/375/390/430 widths, light/dark preference, keyboard focus, API calls, manifest/icons, service-worker registration/scope/update behavior, console errors, failed requests, and practical unsupported/denied states.

Service-worker tests exercise JSON/text/fallback payload normalization and stable click targets through pure helpers where possible. Browser success is diagnostic evidence only.

## Physical iPhone matrix

The human records foreground, background, locked, app-switcher removed, cellular phone with Wi-Fi laptop, offline then online, tap-to-open/focus, and post-Rust-restart delivery. Gate 0 passes only after Lock Screen/background delivery and subscription survival across the restart.

## Future Angular scope

Future features test use cases and Signals separately from components, RxJS reconnection with marbles/fakes, contract compatibility, IndexedDB cache replacement, Vietnamese error mapping, accessibility, and one end-to-end vertical slice. Pages do not need tests for business logic they must not contain.

## Architecture and hygiene

The architecture checker warns above 350 source lines, fails above 500, applies the stricter `main.rs` rule, and rejects forbidden catch-all filenames. The hygiene check rejects tracked runtime state/secrets and common credential patterns. Allowlist entries require a path, reason, and owner/decision reference.

## Live integrations

Live Tailscale, Web Push, and Codex-account checks run locally and write only ignored evidence. CI never depends on a tailnet, physical phone, signed-in Codex account, or secret.
