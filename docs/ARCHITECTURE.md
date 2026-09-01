# Architecture

This document describes the V1 target. The current repository contains only Gate 0 and Gate 1 spikes; `apps/mobile` and `apps/desktop` do not exist yet.

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
- **SQLite stores:** own durable activities, device state, notification outbox, delivery attempts, settings, and migrations in later phases.
- **Codex adapters:** accept explicit event sources later and read dynamic allowance windows through App Server.
- **Delivery adapters:** serve REST/SSE and encrypt Web Push without leaking provider details into domain code.
- **Runtime host:** manual lifecycle, localhost binding, Tailscale verification, logs, and graceful shutdown.

## Data flow

### Foreground

The PWA loads a REST snapshot from Windows, replaces stale IndexedDB cache entries, then subscribes to SSE. Reconnect uses backoff and fetches a new snapshot before resuming live events. REST is for bounded request/response work; SSE is for transient live updates, not durable storage.

### Background notification

A domain event creates a durable outbox record in the same transaction as its source state. A worker encrypts a minimal Vietnamese payload and sends Web Push. Success marks the attempt; retryable failures schedule backoff; 404/410 invalidates the device subscription and asks the user to enable notifications again. The outbox is a future production responsibility; Gate 0 validates encryption, identity persistence, and restart behavior only.

### Codex allowance

The Rust adapter spawns `codex app-server`, completes `initialize`/`initialized`, reads `account/read`, calls `account/rateLimits/read`, and normalizes every returned primary/secondary window. Notifications such as `account/rateLimits/updated` will feed the same normalization path later. No Codex thread or turn is needed.

## Storage model

SQLite on Windows is authoritative. IndexedDB stores only replaceable mobile projections plus sync metadata. VAPID private material and the push subscription are local encrypted-delivery state outside source control. Production secrets should use Windows file ACLs and, where justified, DPAPI; Gate 0 limits itself to a single-user local app-data directory.

## Target folder shape for later phases

```text
apps/
  desktop/
    src/<feature>/{domain,application,infrastructure,http}/
  mobile/
    src/app/<feature>/{data,state,ui}/
contracts/
  source/              # one API contract authority
  generated/           # generated Rust/TypeScript artifacts
```

Feature internals remain private. `main.rs` composes adapters and lifecycle only. Angular pages coordinate state and interactions only. Generated contracts are never edited by hand.

## Availability and recovery

The PWA renders cached state immediately but labels it "Chưa đồng bộ với laptop" until a fresh snapshot arrives. The Windows process survives phone/network interruption through persisted state and queued work. Tailscale or HTTPS failure produces a private-connection recovery message, never a public fallback.
