# Phase 10 personal-production release-candidate validation

Date: 2026-09-02

## Release artifact

- version: `1.0.0-rc.1`;
- target: Windows x64;
- directory: `artifacts/VibePing-Windows-x64-v1.0.0-rc.1/`;
- archive: `artifacts/VibePing-Windows-x64-v1.0.0-rc.1.zip`;
- SHA-256: `e351f2af504eff80cd7e5a70cf46061ad3c3f7a8541d59d9c1326f15e8dbe007`;
- exact directory contents: `vibeping.exe`, Start/Stop/Restart/Open BAT files, and `Huong-dan.txt`;
- user-machine developer runtime requirement: none.

The build regenerates the contract, builds Angular, fingerprints and embeds the PWA, builds the Rust executable, constructs the exact directory, ZIPs it, and writes an ASCII checksum. Lifecycle BAT files are UTF-8 BOM plus CRLF, use `%~dp0`, work in paths containing spaces, and never add auto-start or use a forced normal shutdown.

## Package smoke

The final package smoke passed from a clean extraction path containing spaces on alternate port 8793. Its child environment omitted Node.js, pnpm, Cargo, and Rust. It verified lifecycle commands, local and private-host health, HSTS/PWA assets, REST, SSE, the real sanitized allowance reader, fixture ingestion through the packaged integration command, delayed queueing, persistence across restart, and graceful stop.

## Reversible cutover

Before cutover, ignored evidence captured Gate 0 process/health, the tailnet-only Serve mapping, Funnel-off state, a complete runtime/data backup, and matching VAPID/subscription hashes. The first BAT cutover attempt exposed Windows UTF-8/LF command parsing; automatic rollback restored Gate 0, then the BAT sources were normalized to UTF-8 BOM plus CRLF and the packaged Stop flow was independently exercised.

On the final attempt, the RC started correctly but an ad-hoc Gate 0-era `/api/health` probe produced a false 404 and attempted rollback. Gate 0 could not bind because the healthy RC already owned port 8787. Verification against the production contract `/api/v1/health` returned service `vibeping`, version `1.0.0-rc.1`; the packaged process was therefore retained. This probe mismatch was outside shipped scripts and did not change data or private networking.

The production database is in WAL mode. The Gate 0 migration marker is complete, one active imported subscription is present as unclaimed, the destination VAPID file matches the Gate 0 source, and both source files match the timestamped production backup. Gate 0 source data remains untouched. The imported subscription will attach to the phone only after the human completes owner pairing.

The packaged executable is running on `127.0.0.1:8787`. The stable private origin returns the RC health response with HSTS. Tailscale Serve is unchanged and tailnet-only; Funnel is off. The installed Codex integration selects the native official `codex.exe`, reports real sanitized allowance access, and has Notify/Hooks ready; `/hooks` trust remains intentionally pending.

## Browser confirmation

The in-app browser loaded both localhost and the existing private origin from the packaged process. Both rendered the Vietnamese onboarding route without console warnings/errors, exposed the manifest, and had an active controlling `sw.js` registration at their own root scope. The private page at 390×844 retained the heading and primary action with no horizontal overflow. No pairing form was submitted and no real push was sent during automation.

## Automated evidence

- Rust format and Clippy with warnings denied;
- 58 production Rust tests plus CLI/HTTP integrations and release build;
- 15 Angular tests, lint, typecheck, production build, and fresh generated contract;
- 46 Playwright checks, including the Phase 9 accessibility/responsive matrix;
- Gate 0 JS/PWA regression checks;
- architecture, client-copy, secret-hygiene, tracked-runtime, and dependency audits;
- reproducible Windows package and clean-environment package smoke.

## Manual boundary

Automation does not prove Home Screen service-worker takeover on the existing iPhone, owner pairing, notification permission, Lock Screen display, foreground/background behavior, tap routing, cellular/offline recovery, post-restart physical delivery, real hook trust, or seven-day reliability. Every row in `docs/execution/MANUAL_ACCEPTANCE.md` remains unchecked. The release state is `READY_FOR_PERSONAL_ACCEPTANCE`, not stable `v1.0.0`.
