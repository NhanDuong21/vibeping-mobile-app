# VibePing — personal release-candidate build

VibePing is a personal-production tool that notifies one user's iPhone when Codex finishes, needs attention, leaves final tests failing, has a preview ready, or approaches a usage allowance. This repository is building toward a personal release candidate; it is not a declared stable v1.0 release.

Gate 0 preserves the proven standards-based iPhone Web Push path from a stable private Tailscale Serve origin. Gate 1 preserves the proven signed-in Codex allowance path through the official App Server protocol. The production Angular/Ionic PWA and Rust/SQLite process now build on that evidence without replacing either spike.

## Current status

| Gate | Status | Meaning |
| --- | --- | --- |
| Phase 0 | COMPLETE | Product, architecture, quality, and security foundations are in place. |
| Gate 0 | PASS | A physical iPhone received the Lock Screen push from the stable private origin before and after a Rust restart without reinstalling or resubscribing. |
| Gate 1 | PASS | The real signed-in ChatGPT account returned sanitized allowance windows through Codex App Server. |
| Phase 1 | COMPLETE | The generated-contract Angular/Ionic PWA is embedded in a loopback-only Rust/SQLite process with REST, SSE, PWA caching, browser E2E coverage, and release builds. |

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

Start the Gate 0 server and private Tailscale Serve origin:

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
