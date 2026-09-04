# Sessions 1.1 validation

## Data and compatibility

Migration 0012 adds an opaque public work-session identity per hashed Codex turn and a feature-owned stage table. It backfills only retained event evidence. No full thread, prompt, or tool output is introduced. Existing RC8 result text remains on its original event.

The grouped feed is requested with `GET /api/v1/events?grouped=true`; the ungrouped feed remains available. Event-detail routes accept both public session identifiers and original notification identifiers. The generated OpenAPI/TypeScript schema carries the session summary. Feed results contain excerpts and the last three stages; detail contains the full retained timeline and final answer.

Individual session-read requests may carry the last viewed timestamp. Opening a session offline cannot mark a later completion read. The existing explicit read-all action remains separate. New signals update one keyed card; a late answer enriches the retained result. Cursor time is captured at pagination, so an updated cursor row does not move the page boundary.

Opaque original-event aliases let the phone reassociate viewed RC8 answers and timelines with their session. Viewed answers belonging to a later page remain in a bounded cache reserve until that page arrives. Both old notification links and canonical session links resolve from the cache when offline; the feed displays one card.

## Verification record

- Rust session coverage: lifecycle grouping, real stages, retries, separate turns, stable pagination, unknown start, stop versus completion, bounded read acknowledgment, old links, retained answer, restart, and stage retention.
- Angular coverage: elapsed/frozen/unknown duration, stale state, same-card reconciliation and unread changes; existing RC8 answer/cache/race tests retained.
- Browser coverage: stable DOM identity through completion, history without duplicate live card, full timeline before result, light/dark mobile widths and desktop, WCAG A/AA, overflow, reduced motion, offline reload and retained result.
- `smoke-work-sessions.mjs` exercises an RC8 database through upgrade with synthetic executable hook/notify ingress, old links, final answer and restart. No real push recipient is registered.

## Final release gates — 2026-09-04

- Formatting, Angular lint/type checking, generated-contract freshness, Rust formatting and Clippy with warnings denied: passed.
- Rust workspace: 129 tests passed. Angular: 91 tests across 29 files passed. Gate 0 browser helpers: 6 tests passed.
- Production Playwright: 104 scenarios passed across light/dark phone projects. Sessions captures additionally passed at 320, 375, 430 and 1024 px where applicable; all 16 final captures were inspected. These are Chromium device emulations, not physical iPhone evidence.
- Tailwind builds, PWA checks, architecture (296 source files), repository hygiene and Vietnamese-copy checks: passed. Existing source-size warnings remain below the 500-line failure limit.
- Production Angular and Windows release builds: passed. Initial bundle is 558.70 kB, above the existing 491 kB warning and below the 700 kB failure budget.
- Dependency audit: RustSec passed with the existing reviewed `RUSTSEC-2023-0071` exception; the ES256-only source and `web-push-native` dependency path were rechecked. The legacy `pnpm audit` endpoint timed out/returned HTTP 500, so the exact 25 runtime package versions from the recursive production dependency tree were checked through npm's bulk advisory endpoint using Windows HTTP. The response contained no advisories. No dependency versions changed in this release.
- Executable smoke tests: RC8 database migration, complete session lifecycle, legacy links, final-answer delivery/enrichment and restart passed. The extracted ZIP passed lifecycle, REST, SSE, PWA, delayed queue and persistence checks without a developer runtime.
- Real service-worker upgrade in an isolated browser: RC8 cache → explicit 1.1.0 update → new offline shell passed, retaining local data.
- Impeccable finish review: the one material RC8 cache finding was scored **resolved**, with `disposition: ship` for that fix. The 16 recaptures were valid; the existing Quiet signal design was preserved.
- Existing icon origins are recorded in PNG metadata; all image-data hashes stayed unchanged. The release was rebuilt and package/PWA checks repeated after this metadata-only addition.

## Installed host and artifact

The installed host was backed up using the RC8 recovery command before migration. Version 1.1.0 now runs through the existing launcher path. Local/private health and the PWA update manifest report 1.1.0; private Tailscale Serve configuration is unchanged and Funnel is off. SHA-256 comparisons verified that all three previously stored final answers, their excerpts and truncation flags were unchanged. Runtime evidence and the protected backup remain outside Git.

Package: `VibePing-Windows-x64-v1.1.0.zip`.

SHA-256: `4d19e9b5f8106d72b4e50a0d742a834bdb57200dadbc258020b3c21ccf4d42b3`.

Physical iPhone rendering, Lock Screen delivery for this build and long-running soak are not asserted by desktop automation.
