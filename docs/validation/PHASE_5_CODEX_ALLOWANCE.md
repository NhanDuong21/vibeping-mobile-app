# Phase 5: production Codex allowance

- **Scope:** supervised official App Server reader, dynamic normalization, persistence, threshold alerts, REST/SSE, and mobile summary/detail
- **Result:** automated and real-account production read PASS; physical iPhone display remains manual
- **Methods:** `initialize`, `initialized`, `account/read`, `account/rateLimits/read`, and `account/rateLimits/updated`
- **Refresh paths:** process start, relevant completion, App Server update, explicit client action, and ten-minute fallback poll
- **Recovery:** serialized reads, last-good stale projection, and bounded 1/5/20/60-second child restart backoff

## Automated evidence

- Account fixtures cover signed out, supported signed in, and unsupported API-key mode without returning identity fields.
- Normalization covers one/multiple buckets, primary/secondary windows, unknown durations, null/unsafe names, out-of-range percentages, and exhausted state.
- Persistence covers low, critical, and exhausted progression once per reset cycle, a new reset cycle, stale last-good data, and transactional activity/outbox creation.
- Protocol coverage preserves interleaved update notifications, rejects malformed JSONL, observes child EOF, bounds request timeout, batches concurrent refresh requests, and bounds restart delay.
- Angular coverage verifies dynamic summaries, state labels, local reset copy, and SSE refresh; production UI uses an accessible restrained progress bar and never estimates prompt counts.

## Real signed-in read

The production release executable started on an alternate loopback port and reached `available` against the current signed-in Codex account. It returned three normalized windows with human-safe labels. The process stopped gracefully; a scan of its ignored SQLite evidence found no email, bearer-token, or OpenAI secret-key pattern. Actual percentages, reset timestamps, account identity, internal bucket identifiers, and executable paths are intentionally absent from tracked evidence.
