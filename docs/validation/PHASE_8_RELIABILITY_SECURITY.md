# Phase 8 reliability, recovery, and security validation

Date: 2026-09-02

## Scope

- verified SQLite WAL, foreign keys, busy timeout, empty and prior-schema migrations, automatic pre-migration backup, exact rollback after a failed migration, startup retention, and operational database failure copy;
- explicit `doctor`, `backup`, confirmed `restore`, and confirmed notification reset commands, with rollback validation and no normal forced termination;
- bounded recovery for stale lifecycle state, abrupt termination, active SSE shutdown, spool and outbox replay, expired leases, App Server failure, temporary network loss, push provider outcomes, expired jobs, and stale subscriptions;
- loopback and private-host enforcement, Funnel fail-closed detection, origin/CSRF/owner boundaries, security headers, literal rendering, redacted logs/diagnostics, dependency and secret scans, and Windows owner/SYSTEM ACLs;
- Codex integration merge, repair, removal, executable selection, missing/unsupported executable handling, and a source gate forbidding credential-file access.

## Automated evidence

- 57 production Rust unit tests plus CLI and HTTP integration tests cover database snapshots and rollback, lifecycle faults, recovery commands, ACLs, headers, Tailscale loss, push classification, lease deduplication, TTL, stale subscription recovery, Codex boundaries, and redaction;
- 15 Angular tests include corrupted IndexedDB projection rejection while preserving SQLite as authority;
- 40 light/dark Playwright checks include corrupted-cache replacement and executable-markup rejection in addition to the prior product flows;
- generated contract freshness, Angular lint/typecheck/build, Rust format/Clippy/tests/release, architecture and hygiene checks pass;
- `pnpm audit --prod --audit-level high` reports no known production JavaScript vulnerabilities. `cargo audit --deny warnings` passes with one explicit reviewed exception: `RUSTSEC-2023-0071` is a no-fix RSA timing advisory in the pure-Rust backend selected transitively by `web-push-native`; both VibePing paths use ES256 VAPID only and a source gate fails on any RSA operation.

## Windows protection decision

The local data root has inheritance removed once and grants full control only to the current Windows SID and Local System, recursively. This protects SQLite, VAPID material, control metadata, logs, and locally retained backups without changing the established VAPID bytes. Manual backup bundles contain the sender identity and are therefore sensitive; VibePing creates them only inside the protected data root and never prints their contents. Same-user malware and copied backup files remain residual risks.

## Manual boundary

No physical iPhone result is claimed. Phase 10 must still exercise the final package, stable private origin, existing browser subscription recovery where automation permits, delayed Lock Screen delivery, and rollback path. The seven-day soak remains after release-candidate cutover.
