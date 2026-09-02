# VibePing V1 execution roadmap

Gate 0 and Gate 1 are completed risk validations. The ten phases below are the production implementation plan for release candidate `1.0.0-rc.1`. Each phase ends in a working vertical slice, automated validation, an updated build ledger, and a local checkpoint commit. Physical iPhone acceptance remains a human gate.

## Verified gates

- **Gate 0 — PASS:** stable private Tailscale Serve origin, installable Home Screen PWA, persistent VAPID identity and phone subscription, physical Lock Screen/background delivery, cellular/offline evidence, and delivery after the Rust process restarted.
- **Gate 1 — PASS:** signed-in Codex account and dynamic allowance windows read through official `codex app-server` methods, normalized without reading credentials or recording account email.

## Phase 1 — Production walking skeleton

Create strict Angular/Ionic/Tailwind and Rust/SQLite production workspaces, generate the API contract, embed the production web build, and prove health, bootstrap, SSE, SPA fallback, service-worker shell, and browser rendering on a development port that does not disturb Gate 0.

## Phase 2 — Manual Windows lifecycle

Ship explicit `start`, `run`, `stop`, `restart`, `status`, `doctor`, and `open` commands with single-instance enforcement, private local shutdown, durable intent, stale-process recovery, runtime paths under local app data, and no Windows auto-start.

## Phase 3 — Pairing, PWA installation, and production Web Push

Port the proven push behavior into production modules: one-time owner pairing, Tailscale identity checks, notification onboarding, VAPID and subscription migration, durable outbox, retry/TTL handling, stale-device recovery, delayed test push, and stable service-worker identity.

## Phase 4 — Codex attention events

Integrate supported Codex notify/hooks, deterministic executable selection, safe idempotent configuration merge, private ingestion/spool, normalized turn and attention events, deduplication, activity persistence, SSE publication, and eligible notification jobs.

## Phase 5 — Codex allowance experience

Supervise `codex app-server`, persist all dynamic primary/secondary windows, refresh and recover, create low/critical/exhausted alerts once per reset cycle, and expose the allowance summary/detail experience without internal identifiers.

## Phase 6 — Activity and offline mobile experience

Build the activity timeline, current turn, event detail, unread state, cursor pagination, REST bootstrap, SSE reconciliation, IndexedDB cache, offline/stale states, notification deep links, and coherent service-worker updates.

## Phase 7 — Computer, settings, and diagnostics

Add operational laptop status, delayed test action, production-backed notification/allowance/quiet-hour/privacy/theme/retention settings, notification recovery, and a plain-language diagnostic report that is safe to copy.

## Phase 8 — Reliability, recovery, and security hardening

Exercise database backup/migration/recovery, outbox and spool restart paths, child-process recovery, network/provider faults, graceful shutdown, host/origin/CSRF controls, pairing abuse cases, security headers, redaction, secret scanning, and recovery commands.

## Phase 9 — Product design polish and accessibility

Run bounded Impeccable critique, harden, adapt, audit, and polish passes across every state at 320/375/390/430 px, light/dark/system themes, reduced motion, keyboard/focus semantics, dynamic Vietnamese copy, performance budgets, and client-copy auditing.

## Phase 10 — Windows release candidate and acceptance preparation

Build and package `1.0.0-rc.1` as a self-contained Windows x64 bundle, smoke-test clean extraction and lifecycle, preserve the private origin and Gate 0 identity during reversible cutover, leave the final process running when safe, and prepare the complete morning and seven-day acceptance checklists.

## Release boundary

Phase 10 may reach `READY_FOR_PERSONAL_ACCEPTANCE`. Stable `v1.0.0` requires the human to complete physical iPhone acceptance and the seven-day soak gate. No phase adds remote control, public exposure, accounts, cloud state, paid infrastructure, native packaging, or automatic startup.
