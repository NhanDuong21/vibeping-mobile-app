# Conversation identity 1.3.1 validation

## Delivered repair

Verified delegated-agent ancestry now groups retained requests under their conversation root. The projection preserves source thread/turn hashes, public request IDs, result records and notification targets. It does not infer identity from a shared project, a user fork or `sessionId` alone.

Hook metadata follows explicit parent links with a bounded optional budget. A stalled ancestry lookup retains any answer already fetched. A host-owned reconciliation worker reads metadata at startup and retries unresolved history while the explicitly started host runs. It stores hashed identity and safe titles only; reconciliation itself emits no completion event or push notification.

The latest main request remains primary even when child requests have later ordinals. Pagination includes that request on the first page, including a one-item page, and retains every child request on subsequent pages. Phone caches reconcile using server-owned membership. Old child-work URLs become canonical URLs with their exact request query preserved, including offline reload after resolution.

The installed Codex app-server was checked through metadata-only reads and its ancestor filter. This corresponds to the documented [app-server thread metadata and listing APIs](https://learn.chatgpt.com/docs/app-server). No Codex credentials or account email were read.

## Verification

- Formatting, lint, type checking, generated-contract freshness, Tailwind/production builds, Rust formatting/clippy and release builds passed.
- 128 mobile tests, 150 Rust workspace tests, six Gate 0 tests and all 122 browser scenarios passed. New regressions cover nested ancestry, independent forks, invalid/cyclic metadata, backfilled results and notification IDs, paging, foreground identity, old phone caches, old URLs and offline answers.
- All eight new light/dark, 320 px/1024 px feed/detail captures passed the bounded finish review. Its two findings—optional ancestry timing out an already-fetched answer and old URLs retaining detached offline data—were corrected and verified. Final disposition: `ship`.
- The final ZIP passed clean extraction, lifecycle, private health, PWA, REST, SSE, real Codex allowance, synthetic attention, delayed queue and restart persistence without a developer runtime.
- The real 1.3.0 service worker upgraded to 1.3.1 after a versioned notice and explicit activation, retaining its local data and offline shell.

## Installed host

The final package replaced the existing installation after protected executable/data backups. Local and private health, all installed package files and PWA manifest hashes match 1.3.1. The companion, tray and opted-in Windows startup are healthy. Private Serve configuration and VAPID identity are unchanged; Funnel remains off.

Integrity checks preserved 31 stored final results, 111 activity records, 146 timeline stages, one owner, two subscriptions and one phone identity. Actual Codex metadata confirmed three child threads of one retained parent; the new projection presents those four source identities as one work with 12 retained requests at verification time. Its representative request comes from the parent. Live app QA confirmed the 1.3.1 notice, the single parent work and an original child result expanding within that work.

Final ZIP SHA-256: `49f177c3cf2d4c3bd6226caeb7aa7cbd848c3add9f50431a8a14444f5aa07c42`.

Physical iPhone observation remains the owner's acceptance step: open the Home Screen app on its private connection and tap **Cập nhật** when **Phiên bản 1.3.1** appears. No reinstall or subscription reset is required.
