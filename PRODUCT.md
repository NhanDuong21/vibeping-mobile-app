# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

The V1 mobile client is a Home Screen PWA built with Angular 22, Ionic Angular 9, Tailwind CSS, Angular Signals, and RxJS; IndexedDB is introduced only as a replaceable cache. The Windows source-of-truth process is a Rust 1.98 modular monolith backed by SQLite. The production applications build on the preserved Gate 0 and Gate 1 spikes, which remain regression evidence for the two riskiest integrations.

## Audience and operating context

One person uses Codex on one Windows x64 laptop and carries one iPhone connected through the same personal Tailscale tailnet. They manually start and stop VibePing and need reliable attention signals while away from the laptop, including on cellular data or with the phone locked.

## Problem and jobs to be done

Codex work can finish, need attention, leave tests failing, expose a preview, or consume an allowance while the user is elsewhere. VibePing must:

- notify the iPhone at those operational moments;
- show Codex allowance windows and make low capacity understandable;
- remain useful through temporary laptop, phone, or network interruption;
- provide quiet confidence without turning the phone into a remote terminal or chat client.

## Product purpose and positioning

VibePing is a local-first attention bridge, not another Codex client. The Windows process owns durable state and sends standards-based Web Push over a stable private Tailscale origin. ChatGPT/Codex remains the place for remote interaction.

## V1 scope

- Manual Windows start, stop, and restart.
- Activity signals for completed work, return-needed states, failed final tests, ready previews, and low Codex allowance.
- In 1.1, group signals from the same Codex request into one work session. The card retains its identity from live work to completion, with a real timeline, observed duration, and failed-test count. Separate requests stay separate even within the same Codex task or project; historical data never gains invented stages or start times.
- Read the completed turn's assistant answer in activity detail, with a short excerpt in the feed and in the optional standard Lock Screen mode. This is a read-only result, not a conversation or command surface.
- REST and SSE while the PWA is open; Web Push in the background.
- Codex rate-limit data through `codex app-server` only.
- Light, dark, and system themes; all client copy in Vietnamese.
- SQLite as Windows source of truth and IndexedDB only as a mobile cache.

## Non-goals

V1 has no reply or approval from the phone, terminal, command execution, remote desktop, chat, accounts, teams, billing, analytics dashboard, native Capacitor package, Windows auto-start, or automatic executable updates. It has no Apple distribution, paid domain, public tunnel, hosted backend, hosted database, or VPS.

## Product principles

1. **Attention, not control.** Signal the moment and return the user to Codex for action.
2. **Private and local by default.** Keep state on Windows and traffic inside the tailnet.
3. **Durable before clever.** Persist notification identity, subscriptions, events, and retries across restarts.
4. **Operational language.** Explain what the user can do next; never lead with implementation jargon.
5. **One proven vertical slice at a time.** Validate risky integrations before product expansion.

## Evidence on hand

The read-only sibling repository `../vibeping-ios-push-poc` previously proved standards-based iPhone Web Push, including Lock Screen/background delivery, cellular use, app-switcher removal, and offline catch-up through a temporary Quick Tunnel. Gate 0 validates the permanent private origin and restart behavior; it does not invent new claims.

## V1 acceptance criteria

- A manually started Windows executable exposes the same private `.ts.net` PWA origin after restart.
- The installed Home Screen PWA receives relevant Lock Screen/background notifications without reinstalling or recreating its subscription.
- The mobile activity and allowance views recover after offline periods from Windows-owned state.
- Real Codex allowance windows are read through the signed-in App Server session without handling credentials.
- User-visible copy remains Vietnamese, accessible, calm, and free of raw technical errors.

## Accessibility and inclusion

Touch targets are at least 44×44 px, content supports 320–430 px widths, contrast is strong in light and dark themes, safe areas are respected, permission is user-initiated, focus is visible, and reduced-motion preferences are honored.
