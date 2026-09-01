# ADR 008: Codex rate limits through App Server

- **Status:** Accepted; Gate 1 validates
- **Decision:** Spawn the signed-in `codex app-server` and use stable stdio JSONL methods `account/read` and `account/rateLimits/read`; later consume `account/rateLimits/updated`.
- **Context:** The product needs real ChatGPT/Codex allowance windows without owning authentication.
- **Alternatives:** Read credential files, scrape `/status`, call undocumented endpoints, estimate usage locally.
- **Consequences:** VibePing normalizes dynamic buckets and auth modes, handles protocol noise/timeouts, and never prints email or tokens.
- **Validation needed:** Gate 1 fixtures plus at least one real signed-in window.
