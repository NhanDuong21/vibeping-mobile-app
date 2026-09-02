# Phase 7 computer, settings, and diagnostics validation

Date: 2026-09-02

## Scope

- owner-safe laptop, Codex, allowance-reader, notification, private-connection, and last-signal status;
- explicit delayed notification test and diagnostic launch;
- per-type notification controls, configurable allowance threshold, critical alerts, quiet hours including overnight intervals, and urgent exceptions;
- lock-screen privacy, system/light/dark theme, activity retention, and explicit subscription re-registration;
- plain diagnostic checks, actionable recovery, and a clipboard-ready sanitized technical report.

## Automated evidence

- 42 Rust tests cover the existing product plus preference validation/persistence, actual retention deletion, disabled delivery with retained activity, private push body, cross-midnight quiet policy, urgent bypass, configured allowance threshold, status aggregation, and diagnostic sanitization;
- 14 Angular tests cover the existing mobile state plus theme behavior, complete preference save, computer availability, and fresh diagnostic mutation;
- generated OpenAPI and TypeScript contracts include all Phase 7 endpoints and are fresh;
- Angular lint, strict typecheck, production build, Rust formatting, Clippy with warnings denied, Rust release build, architecture, hygiene, and diff checks pass;
- 36 Playwright checks run in light and dark iPhone projects. Phase 7 scenarios verify readiness labels, CSRF-bound delayed tests, the complete preferences payload, 23:00–06:30 overnight hours, denied-permission recovery, diagnostic actions, clipboard output, and WCAG 2 A/AA rules.

## Impeccable review

The established “Quiet signal” system continues through sparse rules, restrained semantic dots, clear state copy, and a three-destination mobile navigation. A 390×844 light/dark screenshot pass reviewed Computer, Settings, and Diagnostics. It led to a reusable 44 px switch target with an unambiguous enabled track, smaller diagnostic check headings, removal of duplicate failure copy, a non-overlapping save action, and recovery text that inherits the high-contrast primary foreground in both themes. Every failure state tells the user what to do without exposing raw technical errors.

## Manual boundary

No physical iPhone result is claimed. The morning matrix must still confirm Settings persistence after a real Home Screen relaunch, denied/re-enabled notification behavior through iOS Settings, delayed Lock Screen display, private lock-screen content, theme/safe-area rendering, diagnostic copy, and continued subscription delivery after production cutover.
