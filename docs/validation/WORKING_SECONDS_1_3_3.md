# Working seconds 1.3.3

The home work card now formats fresh running time with seconds, including the first minute and hour boundaries. The fallback home status uses the same Vietnamese format. Historical/detail durations retain their existing precision. The shared foreground display clock ticks once per second while the network reconciliation interval stays at 15 seconds. Background, offline and teardown unsubscribe the display clock; foreground return takes a fresh wall-clock reading. Unconfirmed work keeps its last-signal duration and completed work remains fixed.

Timer text uses tabular numerals with `role="timer"` and `aria-live="off"`, preserving status announcements without announcing every second. No new layout, assets or notification behavior is introduced.

## Verification

- Formatting, lint, type checks, generated contracts, Tailwind/production builds, Rust formatting/clippy and release builds passed.
- 130 mobile tests, 156 Rust workspace tests and six Gate 0 tests passed. Coverage includes seconds/minute/hour boundaries, invalid/future values, stale/completed work, 1-second rendering versus 15-second network cadence, background/offline resume and timer teardown.
- The 122 existing browser scenarios passed. Both new light/dark seconds scenarios passed after correcting the test harness to freeze wall time without blocking Angular startup timers. They check 59 → 60 → 61 seconds, long work, timer semantics, completion, and layout at 320/390/1024 px.
- Architecture, repository hygiene, Vietnamese client copy and dependency checks passed. All four shipping PNGs retain provenance.
- The real 1.3.2 service-worker cache received the 1.3.3 notice, activated after the update tap and retained local data and the offline shell.
- The final nine-file package passed clean extraction, lifecycle, private health, PWA, REST/SSE, real Codex allowance, synthetic attention, delayed queue and restart persistence without a developer runtime.
- The independent finish review returned `ship` with no material fixes after inspecting all six captures and the timer/freshness/cadence implementation. Screen-reader behavior was assessed from ARIA semantics, not physical audio observation.

## Installed host

The existing private Windows installation now serves 1.3.3, with matching package/PWA hashes and a healthy companion and tray. Protected upgrade checks preserved 34 results, 116 events, 157 timeline stages, one owner, two subscriptions and one phone identity. Private Serve, VAPID and opted-in Windows startup remain unchanged; Funnel stays off.

The existing live browser received the 1.3.3 notice, activated successfully, and displayed an advancing minute/second timer for the current real work. Physical iPhone observation remains the owner's final device check.

Final ZIP SHA-256: `f654b8579edf4808c9dec53cdf0ee9c03c0e102647ad9b72a65ecc965e6e583d`.
