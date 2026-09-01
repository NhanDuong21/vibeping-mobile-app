# Gate 1: Codex rate limits

- **Objective:** Prove a Rust process reads real signed-in account allowance windows through the official Codex App Server interface without reading credentials or scraping UI.
- **Current status:** PASS
- **Date:** 2026-09-02
- **Codex version:** `codex-cli 0.151.0-alpha.7.2`
- **Transport:** default stdio JSONL/JSON-RPC
- **Methods:** `initialize`, `initialized`, `account/read`, `account/rateLimits/read`

## Validation record

- **Account state:** signed-in ChatGPT account; no email recorded
- **Observed shape:** three normalized windows across dynamic limit data, including primary and secondary windows
- **Fixture/unit result:** 14 Gate 1 Rust tests passed, covering framing, interleaved notifications, timeout, malformed data, signed-out/API-key behavior, clamping, labels, time formatting, multi-bucket preference, and redaction
- **Real-account result:** `account/rateLimits/read` returned at least one window and the CLI printed remaining percentage, duration, and local reset time in Vietnamese
- **Sanitization:** the ignored runtime JSON contained no email, bearer-token, or `sk-` token pattern; tracked evidence omits actual percentages and private identifiers
- **Credential handling:** no Codex auth file, cookie, auth header, or access token was read or printed

## Pass condition

Satisfied on 2026-09-02. API-key-only/unsupported auth remains covered by explicit failure behavior rather than fabricated values.
