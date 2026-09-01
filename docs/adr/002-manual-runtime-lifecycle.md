# ADR 002: Manual runtime lifecycle

- **Status:** Accepted
- **Decision:** VibePing never registers Windows auto-start. The user explicitly runs Start, Stop, or Restart.
- **Context:** Personal utility operation should remain visible and reversible.
- **Alternatives:** Windows service, Startup folder, scheduled task.
- **Consequences:** The phone may show that the laptop side is off; lifecycle scripts must be frictionless and restart-safe.
- **Validation needed:** Gate 0 single-instance, graceful stop, and same-origin restart checks.
