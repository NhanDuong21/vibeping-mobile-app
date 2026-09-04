# Personal + Always ready 1.1.1 validation

## Scope and data

Migration 0013 adds feature-owned project profiles and personal rules, plus a discriminator for the one durable waiting reminder in the existing outbox. Existing session identities, stages, final Codex answers, owner pairing and push subscriptions are retained. Profile identity uses only the already-screened folder basename; repositories with the same basename share a profile.

Global notification switches remain master controls. A successful completion defaults to two observed minutes; an unknown start still permits delivery and final failed tests are not suppressed by duration. Reminders default to five minutes, are deduplicated per turn/subscription, and cancel on resumption. Queued delivery rechecks current rules, waiting state, quiet hours and privacy, including custom project display names.

The small daily summary is derived from retained session evidence in the phone's local-day range. Overlapping observed intervals count once. It is not CPU time, analytics or a productivity score. SQLite remains authoritative; IndexedDB holds replaceable profiles, rules and daily projections. Sessions and final-result behavior remain covered by the existing regression suite.

## Automated gates — 2026-09-04

- Rust workspace: **142 tests passed**; Rust formatting and Clippy with warnings denied passed.
- Angular: **103 tests in 32 files passed**, covering profile save races, cache fallback, history filtering, day boundaries, mascot motion and Windows freshness. Foreground, page return and thirty-second visible refresh invalidate an old ready claim; stale/failed reads show the previous check time.
- Production Playwright: **108 scenarios passed** across light/dark phone projects. After the two reviewer fixes, the four affected scenarios passed again against the final executable, including stale Windows status and the Vietnamese accent selector. The 16 final captures include both themes, 320/390/1024 px project layouts, project history, Settings, stale Settings, activity and today's summary. These are Chromium device emulations, not physical iPhone evidence.
- Formatting, Angular lint/type checking, generated-contract freshness, Vietnamese-copy checks, architecture (339 source files), repository hygiene, Gate 0 JavaScript/PWA checks and six browser-helper tests passed. Existing file-size warnings remain below the 500-line failure limit.
- Tailwind, production Angular and Windows release builds passed. Initial bundle: **559.38 kB**, above the existing 491 kB warning and below the 700 kB failure budget.
- Dependency audits passed. The npm audit initially retried a network timeout and then completed with no known vulnerabilities. RustSec passed with the existing reviewed `RUSTSEC-2023-0071` exception; ES256-only operations and the transitive dependency path were checked. No dependency versions changed.
- Real Windows smoke: GUI-subsystem launcher, actual tray registration, single companion, actual host crash/recovery, explicit Stop remaining stopped across two health ticks, and clean companion disable passed. The smoke uses an isolated data root and does not register startup for a test installation.
- A real service-worker upgrade from **1.1.0 → 1.1.1**, explicit user activation and the new offline shell passed with local data retained, including a repeat against the final executable.
- Final extracted ZIP smoke passed: lifecycle, private health, PWA, REST, SSE, allowance, synthetic attention, delayed outbox and restart persistence without a developer runtime.
- Impeccable finish review scored both material fixes **resolved**, with `disposition: ship` at that fix-list scope. All 16 final captures were valid. Detector findings were empty; all three existing rasters retained provenance, with no new mascot asset.

## Artifact and installed-host boundary

Package: `VibePing-Windows-x64-v1.1.1.zip`.

SHA-256: `c98568b1c86aad87236c7b93c612d98437ac8685e3853a0734d3dae9c51a0107`.

The existing 1.1.0 executable and guide were backed up, and its recovery command created a protected data bundle after a graceful stop. Installation initially encountered an automatic approval block. Following the owner's explicit authorization, version 1.1.1 was installed at the existing path and started successfully. Local health, private HTTPS health and the service-worker manifest all report 1.1.1.

Always ready is enabled on the installed host. Its live status confirms a healthy host, an active tray and sign-in startup enabled. The owned HKCU Run entry was checked against the GUI-subsystem launcher at the stable installation path. This verifies the configured startup target, not a physical Windows sign-out/sign-in.

Read-only SHA-256 checks after startup verified all seven stored final answers (including excerpts and truncation flags), the owner record, two subscription identities and the VAPID identity unchanged. Installed release files match the published 1.1.1 package. Private Tailscale Serve configuration is unchanged and Funnel remains off. Protected backups and runtime evidence stay outside Git.

## Acceptance boundary

The Windows companion uses a stable installed path, one owned HKCU Run value, authenticated local lifecycle operations and a single-instance lock. It never kills an arbitrary PID or exposes runtime controls to the phone. Private Tailscale Serve remains the only network exposure; Funnel is forbidden.

Physical Windows sign-out/sign-in, native tray appearance/menu clicks, physical iPhone rendering and Lock Screen delivery, and long-running soak are not asserted by browser or desktop automation. The real native smoke establishes tray registration and recovery behavior; it does not substitute for those physical checks.
