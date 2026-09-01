# Threat model

## Assets

Assets include activity history, Codex allowance state, SQLite data, VAPID private material, the phone subscription (endpoint and encryption keys), private tailnet hostname/configuration, sanitized logs, and the user's attention.

## Boundaries and threats

- **Public exposure:** Funnel, public tunnels, or non-loopback binding would expose the control surface. Mitigation: forbid Funnel, bind `127.0.0.1`, verify Serve, and preserve the private tailnet boundary.
- **Malicious local process:** another Windows process under the user can call localhost, read weakly protected files, or tamper with runtime state. Mitigation: single-user app-data directory, strict file validation/size limits, no command-execution endpoints, future DPAPI/ACL review, and narrow API capabilities.
- **Compromised tailnet peer:** a permitted peer can reach Serve. Mitigation: one personal tailnet/ACL scope, one owner claim bound to the trusted Tailscale Serve login header, same-origin JSON mutations, per-run CSRF tokens, rate limits, minimal data, and no remote commands.
- **Stolen subscription material:** it reveals a provider endpoint and encryption keys. Mitigation: never log/commit/export it, store locally, and invalidate on 404/410.
- **VAPID key disclosure:** it would let an attacker impersonate this application server to its subscriptions. Mitigation: persist outside the repository, never print it, redact logs, and require explicit deletion.
- **Codex credential disclosure:** reading auth files or copying tokens would expand trust. Mitigation: use App Server stdio only; never read credentials, cookies, email, or auth headers.
- **Codex content disclosure:** hook payloads may contain prompts, tool arguments, tool output, transcript paths, and full working paths. Mitigation: classify bounded input in memory at the hook boundary; persist and spool only hashes, a project leaf name, closed signal types, and timestamps; never parse transcript files.
- **Codex account metadata disclosure:** App Server responses or stderr may contain identity and provider details. Mitigation: parse only account mode plus documented limit fields in memory, discard bounded stderr, hash bucket identifiers, reject suspicious labels, persist no email/account identifier/token/raw response, and expose only normalized windows.
- **Hook configuration takeover:** replacing user hooks or notify commands could break other integrations. Mitigation: timestamped local backups, formatting-preserving TOML merge, owned JSON hook entries, idempotent install/repair, previous-notify forwarding, and ownership-checked removal. Codex `/hooks` review remains mandatory.
- **Local IPC forgery:** a local caller could attempt to inject attention events. Mitigation: ephemeral loopback-only control address, per-run random token, 64 KiB JSON bound, closed normalized schema, and no HTTP ingestion route. Same-user malware remains a residual local risk.
- **Notification abuse:** repeated or deceptive pushes erode trust. Mitigation: stable tags, minimal payloads, deduplication/quiet policy later, explicit test action, and no claim of device display from provider acceptance.
- **Mobile cache disclosure or drift:** IndexedDB can expose recent privacy-safe summaries to someone with device access and can lag behind Windows. Mitigation: cache only the bounded projection already shown in the PWA, never prompt/output/account identity or push secrets, mark cached data stale, deduplicate by server event ID, reconcile through owner-bound REST, and keep SQLite authoritative.
- **Unauthorized activity reads:** a tailnet peer or direct localhost caller could request personal activity. Mitigation: after the first claim, bootstrap, event feed/detail, allowance, and SSE reads require the exact Serve-provided owner identity; read mutations additionally require same-origin JSON and the per-run CSRF token.
- **Log leakage:** errors may contain endpoints, keys, email, or paths. Mitigation: stable error codes, structured redaction, bounded stderr capture, and sanitized export only.

## Availability

Laptop sleep, Tailscale disconnection, iPhone offline state, provider throttling, stale subscriptions, Codex timeouts/child exit, and a crashed VibePing process are expected failures. Push retry, App Server restart backoff, fallback polling, last-good allowance data, and the sanitized Codex crash spool are bounded and visible. No failure opens a public route or deletes durable identity automatically.

## Residual risk

Gate 0 stores sensitive push state for one Windows user but is not the final secret-storage design. Physical access or same-user malware remains out of scope for complete prevention and must be revisited before V1 hardening.
