# Phase 9 product polish and accessibility validation

Date: 2026-09-02

## Scope

- onboarding, activity, event detail, allowance detail, computer, settings, diagnostics, update available, offline, permission denied, stale subscription, desktop stopped, and unexpected safe-error states;
- 320/375/390/430 px widths, light/dark/system themes, reduced motion, keyboard focus, heading structure, accessible names, 44 px touch targets, contrast, 125% root-text stress, long Vietnamese content, safe-area padding, and horizontal overflow;
- production bundle composition, lazy route chunks, font and library policy, cached shell, and Vietnamese client-copy audit.

## Bounded Impeccable pass

The initial audit scored 18/20. It found one WCAG contrast failure on the coral unread-count badge, repeated eyebrow labels that weakened hierarchy, Unicode arrows that did not express consistent icon semantics, a development-machine name in onboarding, and a global reduced-motion override that suppressed unrelated browser behavior.

One bounded fix round darkened the coral token to give white text a 5.08:1 contrast ratio, simplified page headings, replaced navigation glyphs with explicit SVG chevrons, removed the fake machine name, and limited reduced-motion behavior to real transitions and the loading pulse. The final audit scored 20/20. One subsequent light/dark confirmation reviewed the resulting screenshots; no second visual fix round was needed.

Ignored evidence lives under `.runtime/phase9/initial` and `.runtime/phase9/confirmation`. It includes contact sheets and individual viewport captures without production data or secrets.

## Automated evidence

- the maintained Phase 9 Playwright suite exercises all required primary and recovery states in both light and dark projects;
- Axe reports no WCAG A/AA violations after the fix; every audited page has one visible `h1`, no measured target below 44 px, and no horizontal overflow at its assigned width or after 125% root-text stress;
- a non-visual interaction test verifies system-theme resolution, reduced-motion behavior for toggles and loading feedback, and visible keyboard focus;
- the Vietnamese copy gate rejects common accidental English, raw protocol/storage/error terms, loopback addresses, and the removed fake machine name in client templates;
- the production initial bundle is 488.26 kB raw and 127.89 kB estimated transfer. Every product page is a lazy route chunk, the shell imports only the required Ionic host/router elements, fonts are local system fonts, and no decorative or external font request was introduced;
- the Angular service worker remains the sole cached application shell, with an explicit user-controlled update state.

## Manual boundary

Browser automation and desktop screenshot review cannot prove physical iPhone font rendering, real Safari browser bars, Home Screen safe-area behavior, notification permission UI, or Lock Screen display. Those remain explicit Phase 10 morning acceptance steps; Phase 9 makes no physical-device claim.
