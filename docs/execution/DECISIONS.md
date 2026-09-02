# Execution decisions

## 2026-09-02 — Preserve the verified baseline

The campaign starts from clean commit `388c723`, which contains legitimate work after `6139525`. Gate 0 and Gate 1 remain PASS. Spike source and evidence stay intact and production code will port proven behavior rather than call spike code at runtime.

## 2026-09-02 — Keep Gate 0 live during early phases

Gate 0 owns `127.0.0.1:8787` and the stable private Serve root. Production development uses a non-conflicting local port until Phase 10 has a reversible cutover plan and the final server has passed alternate-port smoke tests.

## 2026-09-02 — Infer the Impeccable shape from the authorized brief

The user explicitly requested an unattended run and supplied the audience, job, copy, states, widths, visual direction, platform, accessibility bar, and anti-goals. No optional design interview is needed. “Quiet signal” remains the established visual authority; production surfaces use Operate mode, restrained color, familiar mobile affordances, sparse containers, and no decorative assets.

## 2026-09-02 — Official Codex boundaries

Use the documented stdio JSONL App Server protocol. Account and allowance state come from `account/read`, `account/rateLimits/read`, and `account/rateLimits/updated`. Final completion uses the documented user-level `notify` command and its `agent-turn-complete` payload. Never consume a rate-limit reset, read credential files, or depend on undocumented transcript formats.

## 2026-09-02 — Phase commit hashes in the ledger

Because a commit cannot embed its own hash, the next phase finalizes the previous row. After Phase 10, one documentation-only bookkeeping commit records the exact Phase 10 release checkpoint while leaving the product history and ten requested phase commits intact.

## 2026-09-02 — Production web asset and CSP compatibility

The Angular production build emits root-relative asset URLs so SPA refreshes remain valid even under a strict `base-uri` policy. Critical CSS inlining is disabled because its generated inline load handler conflicts with `script-src 'self'`. The CSP keeps scripts self-only and permits inline styles because Ionic web components apply runtime styles; browser tests fail on any resulting console error and Phase 8 will re-audit the policy.

The Rust build fingerprints every generated web asset before embedding it. This prevents Cargo from reusing a stale embedded PWA when only Angular output changes.

## 2026-09-02 — Private lifecycle control without a public shutdown route

The production host uses a second ephemeral loopback listener for shutdown control. Its address and per-run random token live only in the ignored local runtime directory; Tailscale Serve proxies only the application port, so the control channel is not reachable through the private web origin. A file lock remains held for the host lifetime. `status` verifies the application health contract and treats unreadable or unreachable PID metadata as stale.

Windows background creation uses `CreateProcessW` with handle inheritance disabled and no console window. This is required so `start` returns even when invoked through a pipe or test harness; the child writes directly to rotating local logs. Normal stop never force-kills the process.

## 2026-09-02 — Production owner and push trust boundary

The first owner claim uses an eight-character, ten-minute, single-use code whose database representation is SHA-256 only. Tailscale identity headers are trusted only when Serve presents a `.ts.net` Host; direct localhost spoofing is rejected. Mutations require JSON, the matching private HTTPS Origin, and a per-run CSRF token. Before a claim, only subscription readiness and a rate-limited test are allowed.

Gate 0 migration is deliberately copy-only. Production creates a timestamped backup, reuses the proven VAPID identity and subscription, leaves the original directory untouched, and attaches the imported unclaimed subscription only after pairing. Angular's service worker is the sole push/click handler; the wrapper worker only imports `ngsw-worker.js`, and push payloads use Angular's `navigateLastFocusedOrOpen` contract.

## 2026-09-02 — Reviewed Codex hooks plus documented notify

Completion comes from the documented user-level `notify` array. Current work, permission attention, final test state, and reliable preview evidence come from documented lifecycle hooks. VibePing merges only its owned user-level handlers, forwards a pre-existing notifier, leaves project/plugin hooks such as Impeccable untouched, and requires the normal `/hooks` review. It never passes the trust-bypass flag.

Hook payloads are normalized before they reach IPC. The durable schema contains hashed session/turn keys, the sanitized project leaf, a closed signal, and time only. Transcript files are never opened and raw prompt/tool content is never stored. Post-tool test classification is advisory turn state: an intermediate failure never notifies; only an unresolved failure at Stop/completion becomes an attention event.

## 2026-09-02 — Supervised allowance through the official App Server

Production ports Gate 1's documented `initialize`, `initialized`, `account/read`, and `account/rateLimits/read` flow into one long-lived supervised child. Update notifications, completion refresh, serialized manual refresh, and a ten-minute fallback poll share one reader. Unexpected exits use 1/5/20/60-second bounded backoff; stale last-good data remains visible and activity/push ingestion continues independently.

Internal limit IDs are SHA-256 keys only. A returned human label is accepted only when bounded and free of identifier/credential patterns; otherwise the duration supplies the Vietnamese label. Alert state is keyed by hashed window plus reset timestamp, so low, critical, and exhausted advance once per cycle without altering the real account for tests.

## 2026-09-02 — Offline activity is a replaceable projection

SQLite remains the only activity source of truth. The PWA caches a bounded 100-event projection with current-work, allowance-summary, pagination, last-sync, and pending read metadata. It labels any cache-only view, retries read intents after reconnect, reconciles SSE through REST, and collapses duplicate IDs. Notification links target exact event detail routes; a missing or expired event produces a calm return path rather than a raw API error.

The common owner guard now covers private bootstrap, activity, allowance, and foreground stream reads after pairing. Before the first claim these reads remain available only to support local setup; every read-state mutation requires the claimed owner plus the existing same-origin JSON/CSRF boundary.

Angular's service worker remains the sole offline shell. A ready version produces an explicit Vietnamese update banner and reloads only after the user taps Update. There is no background forced refresh that could discard in-progress reading state.

## 2026-09-02 — Preferences govern delivery without erasing activity

Notification-type toggles suppress only the corresponding push job; the authoritative activity event is still committed and remains visible in the owner-bound feed. Quiet hours store local `HH:MM` boundaries with the phone offset at edit time, and a start later than the end crosses midnight. Permission-required, unresolved final-failure, critical, and exhausted signals may bypass quiet hours only when the explicit urgent exception is enabled.

The low allowance threshold is user-configurable from 1–50 percent, while critical and exhausted alerts have a separate enable switch. Private mode changes lock-screen body copy to a generic instruction. The explicit delayed test notification bypasses ordinary preference filters because it is a direct diagnostic action rather than a product event.

## 2026-09-02 — Diagnostics are a closed sanitized projection

The Computer page aggregates only operational readiness already owned by the Rust process. Diagnostics derive plain-language checks and recovery actions from those stable values and local database health. The copyable technical report is deliberately constructed from version, enum states, counts, and timestamps; it never serializes an error object, filesystem path, Tailscale identity, Codex account field, endpoint, or key. Notification recovery remains an explicit iPhone action and never edits iOS permissions remotely.

## 2026-09-02 — Recovery is explicit, validated, and owner-protected

SQLite is checked before and after migrations. An existing database receives a checkpointed, retained pre-migration copy; migration failure closes the pool and restores the exact prior bytes before returning operational Vietnamese copy. Restore accepts only a bounded, checksummed VibePing bundle with SQLite identity, requires `--confirm`, requires the app to be stopped, takes a pre-restore database copy, validates the restored database through the normal connector, and rolls back on failure. Notification reset has the same stop and confirmation boundary and does not replace the owner or VAPID identity.

The Windows data root uses an inheritance-free ACL for the current user SID and Local System. This is the chosen Windows protection for persistent VAPID, SQLite, control metadata, logs, and local backups: it preserves the exact imported sender identity and supports unattended background use without placing decryption material in the process environment. The app refuses to apply recursive ACL changes to a filesystem root, the user profile root, or the working directory. Manual backup bundles remain sensitive if copied outside this protected location.

## 2026-09-02 — Finish the interface with one bounded polish round

Phase 9 keeps the established Quiet Signal direction and product architecture. The initial Impeccable audit found one real WCAG contrast failure on the unread badge, excessive repeated eyebrow labels, ambiguous Unicode arrows, a development-machine name in onboarding, and an over-broad reduced-motion reset. One bounded fix round corrected those issues, added explicit motion handling only where movement exists, and introduced maintained accessibility and Vietnamese-copy gates. A single light/dark screenshot confirmation then closed the visual loop; later non-visual tests do not reopen it.
