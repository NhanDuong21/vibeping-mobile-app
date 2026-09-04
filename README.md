# VibePing — personal release-candidate build

VibePing is a personal-production tool that notifies one user's iPhone when Codex finishes, needs attention, leaves final tests failing, has a preview ready, or approaches a usage allowance. This repository is building toward a personal release candidate; it is not a declared stable v1.0 release.

Gate 0 preserves the proven standards-based iPhone Web Push evidence from the stable private Tailscale Serve origin. Gate 1 preserves the proven signed-in Codex allowance path through the official App Server protocol. The self-contained Rust/SQLite release candidate now serves the Angular/Ionic PWA at that same private origin; the Gate 0 source, state, and rollback path remain preserved.

## Current status

| Gate | Status | Meaning |
| --- | --- | --- |
| Phase 0 | COMPLETE | Product, architecture, quality, and security foundations are in place. |
| Gate 0 | PASS | A physical iPhone received the Lock Screen push from the stable private origin before and after a Rust restart without reinstalling or resubscribing. |
| Gate 1 | PASS | The real signed-in ChatGPT account returned sanitized allowance windows through Codex App Server. |
| Phase 1 | COMPLETE | The generated-contract Angular/Ionic PWA is embedded in a loopback-only Rust/SQLite process with REST, SSE, PWA caching, browser E2E coverage, and release builds. |
| Phase 2 | COMPLETE | Manual Windows lifecycle commands, single-instance control, graceful recovery, diagnostics, logs, and durable user intent are production-ready. |
| Phase 3 | COMPLETE | Private owner pairing, PWA installation and permission onboarding, Gate 0 state import, persistent VAPID, subscriptions, and durable Web Push delivery are production-ready. |
| Phase 4 | COMPLETE | Supported Codex notify/hooks feed a private durable activity stream, deduplicated attention events, SSE updates, and eligible push jobs without storing prompts or tool output. |
| Phase 5 | COMPLETE | A supervised official Codex App Server session persists dynamic allowance windows, publishes live updates, deduplicates threshold alerts, and powers Vietnamese summary/detail views. |
| Phase 6 | COMPLETE | The mobile Activity product now has a paginated unread feed, exact event detail links, bottom navigation, live reconciliation, IndexedDB recovery, stale states, and a deliberate app-update banner. |
| Phase 7 | COMPLETE | Computer readiness, production notification preferences, overnight quiet hours, privacy/theme/retention controls, subscription recovery, and sanitized diagnostics are available on mobile. |
| Phase 8 | COMPLETE | Database migration recovery, confirmed backup/restore/reset commands, lifecycle and push fault handling, private-host and browser security, cache/XSS safety, redaction, dependency audits, and Windows owner ACLs are hardened. |
| Phase 9 | COMPLETE | Every required mobile surface and recovery state has completed the bounded Impeccable, accessibility, responsive, theme, motion, keyboard, copy, and performance audit. |
| Phase 10 | COMPLETE | The `1.0.0-rc.1` Windows x64 package, clean-environment smoke test, reversible Gate 0 cutover, stable private origin, native Codex integration, and morning acceptance handoff are ready. |

## Constraints

V1 is for one Windows x64 laptop, one signed-in Codex account, one iPhone, and one personal Tailscale tailnet. It must cost 0 VND: no Apple Developer account, App Store, paid domain, public tunnel, cloud backend, cloud database, or VPS. Tailscale Funnel is forbidden.

## Developer commands

Run all local checks:

```powershell
.\scripts\check.ps1
```

Generate the API contract and start the production shell on a development port:

```powershell
pnpm run generate:contracts
.\scripts\dev.ps1
```

Run the production browser suite after building the release executable:

```powershell
pnpm run e2e
```

Build and package the self-contained Windows x64 release candidate:

```powershell
pnpm run build:release
pnpm run package:windows
pnpm run e2e:release
```

The ignored output is `artifacts/VibePing-Windows-x64-v1.0.0-rc.4/`, its ZIP, and its SHA-256 file. The six-file package needs no Node.js, pnpm, Rust, or Cargo installation on the user machine. See [RC4 release notes](docs/release-1.0.0-rc.4.md) for useful Lock Screen notifications, distinct privacy modes, and the iPhone update.

Control the production process explicitly (there is no auto-start):

```powershell
.\scripts\vibeping.ps1 start
.\scripts\vibeping.ps1 status
.\scripts\vibeping.ps1 doctor
.\scripts\vibeping.ps1 restart
.\scripts\vibeping.ps1 open
.\scripts\vibeping.ps1 stop
```

Back up or recover local state only while VibePing is stopped. Restore and notification reset deliberately require explicit confirmation:

```powershell
vibeping backup
vibeping restore --file <duong-dan-ban-sao> --confirm
vibeping reset notifications --confirm
```

Manual backup bundles can include the private notification sender identity. Keep them inside the protected VibePing data directory or protect any copy you move elsewhere.

The same public commands are available directly on `vibeping.exe`. The first unpaired Start prints a short-lived one-time pairing code. Runtime data, the single-instance lock, user intent, private shutdown metadata, SQLite, rotating logs, and sender identity live under `%LOCALAPPDATA%\VibePing` unless `-DataDir`/`--data-dir` is supplied.

Install, inspect, repair, or remove the Codex integration without replacing unrelated user hooks:

```powershell
vibeping integrations codex install
vibeping integrations codex status
vibeping integrations codex repair
vibeping integrations codex remove
```

After install or repair, open Codex and run `/hooks` to review and trust the exact VibePing definitions. This human trust step is intentionally not bypassed.

Production imports the known Gate 0 VAPID and phone-registration files once, after first copying them to a timestamped local backup. The original Gate 0 directory is never modified or deleted. Phase 10 completed the reversible cutover while preserving the existing private origin, Tailscale Serve mapping, and Funnel-off state.

Use the preserved Gate 0 launcher only for an intentional rollback after stopping the release candidate:

```powershell
.\spikes\tailscale-web-push\scripts\Start-Gate0.ps1
```

Read the signed-in Codex account limits:

```powershell
cargo run -p vibeping-gate1 -- read
```

Gate 0 passed on 2026-09-02 after the human observed delivery on the physical iPhone Lock Screen both before and after a Rust restart. Any future Gate 0 revalidation still requires the same physical confirmation; provider acceptance or desktop automation alone is insufficient.

The first Gate 0 start may open Tailscale's official consent page. Approve Serve/HTTPS once, then run the start command again. This does not enable Funnel.

See [PRODUCT.md](PRODUCT.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/execution](docs/execution), and [docs/validation](docs/validation) for durable decisions, execution evidence, and manual acceptance boundaries.
