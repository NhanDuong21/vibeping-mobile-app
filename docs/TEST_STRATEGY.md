# Test strategy

## Rust

Unit tests cover normalization, validation, persistence, framing, redaction, duration/reset formatting, and delivery classification. Adapter tests use fixtures or local fakes; they do not require live accounts or push providers. Workspace CI runs `fmt`, Clippy with warnings denied, tests, and a release build on Windows.

## Gate 0 browser and service worker

Static checks validate the manifest, local assets, Vietnamese surface, stable scope/start URL, and absence of CDN/Tailwind runtime use. Browser checks cover local and `.ts.net` origins, 320/375/390/430 widths, light/dark preference, keyboard focus, API calls, manifest/icons, service-worker registration/scope/update behavior, console errors, failed requests, and practical unsupported/denied states.

Service-worker tests exercise JSON/text/fallback payload normalization and stable click targets through pure helpers where possible. Browser success is diagnostic evidence only.

## Physical iPhone matrix

The human records foreground, background, locked, app-switcher removed, cellular phone with Wi-Fi laptop, offline then online, tap-to-open/focus, and post-Rust-restart delivery. Gate 0 passes only after Lock Screen/background delivery and subscription survival across the restart.

## Angular scope

Feature tests isolate stores and Signals from components, exercise asynchronous integration with fakes, verify contract compatibility, reject corrupted IndexedDB cache, cover Vietnamese recovery mapping, and retain end-to-end vertical slices. Pages do not need tests for business logic they do not contain.

## Product interface audit

The maintained Phase 9 Playwright audit covers every primary surface at 320/375/390/430 px across light and dark projects, with WCAG A/AA Axe checks, one visible page heading, 44 px interactive targets, horizontal-overflow detection, and 125% root-text stress. It also covers system theme, reduced motion, keyboard focus, the deliberate update state, offline cache, denied permission, stale notification registration, stopped desktop, and a safely mapped unexpected error. `scripts/check-mobile-copy.ps1` rejects common accidental English and raw technical terms in user-visible templates.

## Architecture and hygiene

The architecture checker warns above 350 source lines, fails above 500, applies the stricter `main.rs` rule, and rejects forbidden catch-all filenames. The hygiene check rejects tracked runtime state/secrets, common credential patterns, and any Codex credential-file access in production source. Dependency gates run the production pnpm audit and RustSec `cargo audit`. Allowlist entries require a path, reason, and owner/decision reference.

## Live integrations

Live Tailscale, Web Push, and Codex-account checks run locally and write only ignored evidence. CI never depends on a tailnet, physical phone, signed-in Codex account, or secret.
