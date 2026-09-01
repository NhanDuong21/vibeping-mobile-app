# Phase 4: durable Codex attention

- **Scope:** supported Codex notify/hooks, safe configuration merge, private ingestion, normalized state, activity SSE, and eligible push jobs
- **Result:** automated implementation PASS; real hook trust and physical iPhone display remain manual
- **Codex boundary:** official user-level `notify`, `hooks.json`, lifecycle event JSON, and `/hooks` trust review only
- **Privacy:** no transcript read; no prompt, assistant message, tool input, tool output, full path, credential, account email, or subscription material stored in tracked evidence
- **Coexistence:** existing hook groups remain; a previous notify command is forwarded; install/repair is idempotent; remove targets only VibePing-owned entries
- **Recovery:** explicit Stop discards later signals cleanly; unexpected enabled-process loss writes only normalized bounded records to an atomic spool and drains them once

## Automated evidence

- Rust unit suite covers redaction, documented classifier signals, intermediate fail-then-pass, unresolved final failure, hook/notify deduplication, executable compatibility selection, hook coexistence, token-authenticated IPC, explicit-stop behavior, and one-time spool drain.
- Isolated CLI exercise completed `install`, `status`, `repair`, and `remove` against the discovered compatible Codex executable without touching the real user configuration.
- OpenAPI and generated TypeScript include the current-work/recent-activity snapshot.
- Angular unit coverage verifies current work and SSE-triggered refresh; lint, typecheck, and production build pass.

## Manual boundary

After the final release executable is installed, open Codex, run `/hooks`, review the VibePing entries, and trust their exact definitions. Only then run the real start, permission, fail/fix/pass, final-failure, preview, completion, and duplicate scenarios. Provider acceptance is not evidence that the physical iPhone displayed a notification.
