# Gate 0: Tailscale Web Push

- **Objective:** Prove a Home Screen PWA from one stable private `.ts.net` HTTPS origin receives encrypted Web Push on a physical iPhone and survives a local Rust restart without reinstalling or resubscribing.
- **Current status:** READY_FOR_IPHONE_TEST
- **Date:** 2026-09-02

## Environment

- Windows x64, Rust 1.98.0, Node.js 24.15.0, pnpm 10.15.1, Tailwind CSS 4.3.3
- Tailscale 1.102.3, Serve only, Funnel disabled
- Rust backend target: `127.0.0.1:8787`
- Stable origin: `https://<device>.<tailnet>.ts.net` (the working private hostname is intentionally redacted from tracked evidence)

## Desktop validation

Both `http://127.0.0.1:8787` and the private HTTPS origin returned the correct Gate 0 service identity. The private origin passed health/status/public-key checks, manifest identity and icons, secure-context detection, service-worker registration at `/` with `updateViaCache: none`, and explicit cache versioning. The public browser key is the required uncompressed P-256 form.

The final private build rendered in light and dark modes at 320/375/390/430 px without horizontal overflow. Primary and disclosure controls measured 44–48 px; focus was visible; row/details padding measured 12/16 px; the technical report contained no subscription endpoint or key names. Browser inspection found no application console warnings, runtime exceptions, or failed network requests. One rejected inline-style message came from the browser inspection overlay itself and had no page URL; the page CSP correctly blocked it.

Tailscale CLI reported `(tailnet only)`, the Serve root proxies only to `127.0.0.1:8787`, and no `(Funnel on)` or public-internet state was present. A real Stop/Start restart produced a new Rust PID while preserving the exact `.ts.net` origin and VAPID public key. Unit tests cover safe copy, unsupported/denied capability handling, push payload fallback, sender identity persistence, uncompressed browser-key encoding, and subscription file persistence.

The source completed Impeccable shape, two independent critique assessments, harden, and adapt. Full-parser detector warnings about zero padding and mixed light/dark hover colors were checked against computed browser styles and treated as false positives: actual bordered-row padding was 12 px, details padding was 16 px, and both rendered themes retained their intended colors.

## Manual iPhone matrix

| Case | Result |
| --- | --- |
| Foreground | Pending |
| Background | Pending |
| Locked | Pending |
| Removed from app switcher | Pending |
| Phone cellular / laptop Wi-Fi | Pending |
| Offline then online | Pending |
| Notification tap opens/focuses | Pending |
| Rust restart, same origin/subscription | Pending |

## Evidence and uncertainty

The sibling Quick Tunnel PoC is prior evidence for basic iPhone Web Push only. Its tracked server and Quick Tunnel were stopped to release port 8787; its source and durable push data were not changed. Gate 0 is ready, but it cannot pass until the human observes the physical Lock Screen/background push and then verifies delivery again after a Rust restart without reinstalling or recreating the subscription.
