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
