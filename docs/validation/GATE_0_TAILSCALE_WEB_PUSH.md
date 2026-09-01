# Gate 0: Tailscale Web Push

- **Objective:** Prove a Home Screen PWA from one stable private `.ts.net` HTTPS origin receives encrypted Web Push on a physical iPhone and survives a local Rust restart without reinstalling or resubscribing.
- **Current status:** PASS
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
| Foreground | Not rerun; covered by the prior Quick Tunnel PoC and not part of the permanent-origin revalidation |
| Background | PASS — the Home Screen app was not foregrounded during Lock Screen delivery |
| Locked | PASS — the human observed the first notification on the physical iPhone Lock Screen |
| Removed from app switcher | Not rerun; covered by the prior Quick Tunnel PoC |
| Phone cellular / laptop Wi-Fi | Not rerun; covered by the prior Quick Tunnel PoC |
| Offline then online | Not rerun; covered by the prior Quick Tunnel PoC |
| Notification tap opens/focuses | Not rerun; covered by the prior Quick Tunnel PoC |
| Rust restart, same origin/subscription | PASS — the phone registration remained ready and the human observed a second Lock Screen notification after restart |

## Evidence and uncertainty

The sibling Quick Tunnel PoC is prior evidence for the basic Web Push matrix only. Its tracked server and Quick Tunnel were stopped to release port 8787; its source and durable push data were not changed.

On 2026-09-02, the physical iPhone registered from the private Home Screen PWA and received the first Lock Screen notification. The Rust Gate 0 process was then restarted. The private origin, sender identity, and stored phone registration remained ready without reinstalling or resubscribing, and the human observed the second Lock Screen notification. Provider acceptance was treated only as intermediate evidence; both deliveries were declared by the human. This satisfies the permanent-origin and restart-survival acceptance condition, so Gate 0 is PASS.
