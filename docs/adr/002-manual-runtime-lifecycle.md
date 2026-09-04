# ADR 002: Manual runtime lifecycle

- **Status:** Superseded in part by ADR 011, following the owner's explicit 1.1.1 request.
- **Decision:** Manual Start, Stop and Restart remain. Windows sign-in startup and local recovery are now an explicit opt-in; Stop blocks automatic recovery until Start or the next opted-in sign-in.
- **Context:** Personal utility operation should remain visible and reversible.
- **Alternatives:** Windows service, Startup folder, scheduled task.
- **Consequences:** The phone may show that the laptop side is off; lifecycle scripts must be frictionless and restart-safe.
- **Validation needed:** Gate 0 single-instance, graceful stop, and same-origin restart checks.
