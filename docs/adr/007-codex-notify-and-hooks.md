# ADR 007: Codex notify and hooks for future attention events

- **Status:** Proposed for a later phase
- **Decision:** Prefer explicit supported Codex notify/hooks event paths and normalize them into VibePing domain events. Do not scrape UI or terminal output.
- **Context:** Completion and return-needed signals need a reliable integration boundary.
- **Alternatives:** OCR, polling the Codex UI, parsing console presentation, filesystem heuristics.
- **Consequences:** Integration follows documented payloads and may need version compatibility; no implementation is scaffolded in Phase 0.
- **Validation needed:** A later vertical slice must prove real events, deduplication, restart recovery, and safe failure mapping.
