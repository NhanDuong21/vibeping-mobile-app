# ADR 003: Private Tailscale Serve origin

- **Status:** Accepted
- **Decision:** Terminate stable `.ts.net` HTTPS with Tailscale Serve and reverse-proxy to a localhost-only Rust process. Never use Funnel.
- **Context:** iPhone Web Push needs a secure stable origin without a domain or public cloud.
- **Alternatives:** Quick Tunnel, paid domain/VPS, LAN IP/self-signed TLS, Funnel.
- **Consequences:** Tailnet membership is required; Serve configuration must be preserved and restored without touching unrelated routes.
- **Validation needed:** Gate 0 private HTTPS, hostname stability, cellular iPhone access through Tailscale, and restart survival.
