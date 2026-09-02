# Phase 6 activity and offline validation

Date: 2026-09-02

## Scope

- owner-bound REST bootstrap, cursor activity feed, exact event detail, read, and read-all;
- current Codex state, allowance summary, unread badge, bottom navigation, pagination, and push deep links;
- SSE merge/reconnect with duplicate suppression;
- bounded IndexedDB projection, cache-only stale state, offline shell, pending read intent, and schema version upgrade;
- missing-event recovery and deliberate service-worker update banner.

## Automated evidence

- 37 Rust unit tests cover the existing product plus empty feed, pagination, invalid cursor/limit, detail lookup, idempotent read state, and read-all;
- 9 Angular tests cover connectivity, allowance, cache-first activity, stale fallback, duplicate SSE merge, optimistic reads, and ready service-worker versions;
- generated OpenAPI and TypeScript contracts are fresh;
- Angular lint, strict typecheck, production build, Rust formatting, Clippy with warnings denied, Rust release build, architecture, hygiene, and diff checks pass;
- 30 Playwright checks run in 390 px light and dark projects and cover 320–430 px overflow, activity states, long names, pagination, exact detail, unread state, duplicate SSE reconnect delivery, missing deep links, cached offline launch, IndexedDB v1→v2 upgrade, PWA shell, onboarding, and allowance.

## Impeccable review

The established “Quiet signal” direction stays sparse: typography and rules establish hierarchy, semantic color marks only state, and the fixed navigation uses familiar mobile labels. A bounded 390×844 light/dark screenshot pass found Ionic's default blue link color and an unscrollable long feed inside the router outlet. Both were corrected with explicit Tailwind color authority and an internal safe-area-aware scroll viewport. Long names wrap without horizontal overflow, tap targets remain at least 44 px, and reduced-motion handling remains global.

## Manual boundary

No physical iPhone result is claimed. Offline Home Screen launch, notification-to-detail navigation, safe-area behavior, and visible update activation remain in the final morning acceptance matrix after the production cutover.
