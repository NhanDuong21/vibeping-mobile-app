# Architecture

This document describes the V1 target and its current production foundation. Gate 0 and Gate 1 remain isolated regression spikes; `apps/mobile` and `apps/desktop` contain the generated-contract PWA and loopback-only Rust/SQLite host.

## System context

```text
iPhone Home Screen PWA
  ├─ REST: commands and snapshots while open
  ├─ SSE: live foreground updates
  ├─ Web Push: background attention signals
  └─ IndexedDB: replaceable local cache
          │ private HTTPS inside one tailnet
          ▼
Tailscale Serve (.ts.net, never Funnel)
          │ reverse proxy to 127.0.0.1 only
          ▼
Rust modular monolith on Windows
  ├─ activity and notification use cases
  ├─ durable push outbox and retries
  ├─ Codex integration adapters
  ├─ REST/SSE/Web Push adapters
  └─ SQLite source of truth
          │ child stdio, JSONL/JSON-RPC
          ▼
codex app-server → signed-in Codex services
```

## Trust boundaries

1. The iPhone PWA is less trusted than Windows state. It receives minimum data and cannot execute commands.
2. Tailscale authenticates tailnet membership and terminates HTTPS. It does not make arbitrary local callers trusted.
3. The Rust process is the application boundary. It validates requests and owns persistence.
4. `codex app-server` owns Codex authentication. VibePing handles protocol messages, never credentials.
5. Web Push providers relay encrypted payloads. Subscription material is sensitive local state even though it is not an account credential.

## Component responsibilities

- **Mobile shell:** present Vietnamese operational state, request notification permission after a tap, cache recent reads, and reconnect.
- **Application use cases:** derive events, attention severity, allowance state, retry policy, and API results.
- **SQLite stores:** own bootstrap/runtime metadata, pairing sessions, owner/device state, push subscriptions, activity events, Codex turn state, notification jobs, delivery attempts, and rate-limit windows through feature-owned stores. Later phases add settings.
- **Codex adapters:** supported user-level notify and reviewed hooks normalize attention signals; Gate 1 separately proves dynamic allowance windows through App Server.
- **Delivery adapters:** serve REST/SSE and encrypt Web Push without leaking provider details into domain code.
- **Runtime host:** explicit start/run/stop/restart/status/doctor/open commands, single-instance file lock, durable user intent, token-authenticated control listener on a separate loopback-only ephemeral port, localhost API binding, Tailscale verification, rotating logs, crash-spool staging, and graceful shutdown.

## Data flow

### Foreground

The PWA loads a REST snapshot from Windows, replaces stale IndexedDB cache entries, then subscribes to SSE. Reconnect uses backoff and fetches a new snapshot before resuming live events. REST is for bounded request/response work; SSE is for transient live updates, not durable storage.

### Background notification

A domain event creates a durable outbox record in the same transaction as its source state. A worker encrypts a minimal Vietnamese payload and sends Web Push. Phase 3 leases due rows, records every attempt, retries network/429/5xx outcomes at 5 seconds, 20 seconds, 1 minute, 5 minutes, and 15 minutes within a TTL, and disables subscriptions on 404/410. Provider acceptance is explicitly not proof that iPhone displayed the notification.

### Codex allowance

The supervised Rust adapter spawns the persisted compatible Codex executable as `app-server`, completes `initialize`/`initialized`, verifies supported account state through `account/read`, and calls `account/rateLimits/read`. It retains a long-lived JSONL session, reacts to `account/rateLimits/updated`, refreshes after relevant Codex completion, accepts serialized manual refresh, polls every ten minutes, and restarts an unexpectedly exited child with bounded backoff. No Codex thread or turn is needed.

Normalization accepts any available primary/secondary windows, hashes internal bucket identifiers, clamps remaining percentage, derives safe Vietnamese duration labels when a returned name is unsafe, and never estimates prompts remaining. SQLite keeps the last successful projection through reader failures. Low, critical, and exhausted transitions are recorded at most once per window/reset cycle; each transaction writes the alert state, activity, and eligible push jobs together.

### Codex attention

The installer merges a user-level `notify` command and VibePing-owned `UserPromptSubmit`, `PermissionRequest`, selected `PostToolUse`, and `Stop` handlers while preserving other hook sources and the previous notifier. Codex requires the user to review their exact hashes through `/hooks`; VibePing does not bypass trust.

The hook process classifies its bounded JSON input in memory and immediately discards raw prompts, tool inputs, tool outputs, transcript paths, and full working paths. Only hashed session/turn keys, the project directory name, a closed signal type, and a timestamp cross the token-authenticated loopback control channel. A transaction updates turn state, inserts one deduplicated activity, and creates one eligible push job per active owner subscription. SSE publishes the committed projection.

When enabled VibePing is unexpectedly unavailable, the already-sanitized record enters a bounded atomic spool and drains exactly once on restart. Explicit Stop disables intent first, so later hook invocations exit successfully without creating a spool backlog.

### Mobile activity reconciliation

`GET /api/v1/bootstrap` returns current work, normalized allowance, and the unread total. The paginated event feed uses an event identifier as a stable cursor, while exact event reads and idempotent read/read-all mutations remain owner-bound. SSE is an invalidation and low-latency delivery channel; every reconnect can reconcile against REST, and duplicate event identifiers collapse in the client projection.

IndexedDB keeps at most 100 privacy-safe activity projections, bootstrap summary state, pagination metadata, and pending read intents. It is never authoritative. A cached launch renders immediately with a stale label, then replaces or merges data after REST succeeds. Offline read intents retry after reconnection. Service-worker versions are activated only after a visible user action, avoiding an unexpected in-session reload.

## Storage model

SQLite on Windows is authoritative. IndexedDB stores only replaceable mobile projections plus sync metadata. VAPID private material stays in the ignored production data directory and subscriptions remain in SQLite. A one-time importer backs up and copies only Gate 0's known VAPID/subscription files, leaves the source intact, and keeps the imported subscription unclaimed until owner pairing succeeds.

Owner pairing requires a short-lived, single-use code stored only as a hash. The application accepts Tailscale identity headers only on the stable `.ts.net` host, requires same-origin JSON plus a per-run CSRF token for mutations, rejects direct spoofed localhost headers, and allows only subscription readiness and test-push behavior before the first claim.

## Production folder shape

```text
apps/
  desktop/
    src/<feature>/{domain,application,infrastructure,http}/
  mobile/
    src/app/<feature>/{data,state,ui}/
contracts/
  openapi/             # exported OpenAPI contract authority
  generated/           # generated Rust/TypeScript artifacts
  scripts/             # generation and freshness checks
```

Feature internals remain private. `main.rs` composes adapters and lifecycle only. Angular pages coordinate state and interactions only. Generated contracts are never edited by hand.

## Availability and recovery

The PWA renders cached state immediately but labels it as saved data until a fresh snapshot arrives. The Windows process survives phone/network interruption through persisted state and queued work. Tailscale or HTTPS failure produces a private-connection recovery message, never a public fallback.

The background process is created without inheriting console or pipe handles, so `start` returns while the host remains alive and no permanent console window appears. Status trusts a live authenticated application health response rather than a PID file alone. Explicit stop records disabled user intent before requesting bounded graceful shutdown; crash recovery preserves enabled intent and stale metadata is never treated as proof that the process is running.
