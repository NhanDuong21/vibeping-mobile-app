# Completion notifications 1.3.2

The observed premature notifications were completed child-agent turns. Conversation grouping in 1.3.1 repaired activity membership but left completion delivery unchanged. The repair uses the same persisted, explicitly verified ancestry for notification eligibility.

Known child completions and final test failures are retained as activity without queued pushes. Unknown ancestry retains a bounded pending job; each attempt waits 30 seconds for the existing host reconciliation worker, up to the original expiry. Confirmed main work remains eligible under the user's duration, privacy and scheduling preferences. Every attempt rechecks ancestry, including retries and recovered leases from older releases. Activity jobs whose retained source event has disappeared expire because their source cannot be verified.

Regression coverage exercises a running main task with multiple child answers, one final main notification, result preservation, duplicate signals, metadata timeout followed by child/root resolution, persistence across database reopen, pending/retry/expired-lease checks, unknown-source expiry, child final failure and retained permission attention. Existing notification privacy and personal-policy tests now provide explicit main-task identities.

This is a delivery-only repair. The mobile layout, copy, palette, assets and notification interaction stay unchanged; the PWA version notice advances to 1.3.2. Physical iPhone notification observation remains separate from automated queue and upgrade checks.

## Release verification

- Formatting, lint, type checks, generated contracts, Tailwind/production builds, Rust formatting/clippy, release builds, architecture, hygiene, Vietnamese copy and dependency checks passed.
- 128 mobile tests, 156 Rust workspace tests, six Gate 0 tests and 122 browser scenarios passed. All six new delivery regression tests passed.
- The final nine-file ZIP passed extraction, lifecycle, private health, REST/SSE, PWA, real Codex allowance, fixture delivery, delayed queue and restart persistence checks without a developer runtime.
- A real 1.3.1 service-worker cache received the 1.3.2 notice, activated after the update tap, and retained its local data and offline shell. The smoke assertion now allows backend releases to retain identical JavaScript assets while requiring a changed versioned manifest and the actual update interaction.
- The installed private host and PWA manifest report 1.3.2. Protected upgrade checks preserved 32 results, 113 events, 153 timeline stages, one owner, two subscriptions and one phone identity. VAPID, private Serve and Windows startup settings remained unchanged; the companion and tray resumed healthy.

Final ZIP SHA-256: `433e6990db8705b479e9ffe6bb796b3f3fe6e0d1bf02d637ddf2dd9204d314d4`.

Delivery review disposition: `ship`. No layout or asset changes require a new visual direction. Physical iPhone delivery remains unobserved; no real test notification was sent to the phone during this repair.
