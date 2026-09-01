# Gate 1 — Codex rate limits

This Rust CLI starts the locally installed `codex app-server` over its default stdio transport, completes the stable initialization handshake, reads sanitized account state, requests `account/rateLimits/read`, and normalizes every available primary/secondary window. It never reads Codex auth files, browser cookies, tokens, or UI output.

```powershell
cargo run -p vibeping-gate1 -- read
cargo run -p vibeping-gate1 -- read --json
cargo run -p vibeping-gate1 -- doctor
```

Real results are written only to ignored `.runtime/gate1/last-read.json`. Human output is Vietnamese and duration-based; machine JSON preserves normalized bucket identifiers but contains no email or credential material.
