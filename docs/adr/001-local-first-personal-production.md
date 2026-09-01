# ADR 001: Local-first personal-production scope

- **Status:** Accepted
- **Decision:** Build for one user, Windows laptop, iPhone, Codex account, and personal tailnet. Windows owns durable state; no hosted service is introduced.
- **Context:** The product is an attention bridge for one person's Codex workflow under a 0 VND constraint.
- **Alternatives:** Multi-user cloud service; phone-owned state; native iOS app.
- **Consequences:** Simple trust model and offline durability, but no team sync or access outside the tailnet.
- **Validation needed:** Gate 0 private delivery and later SQLite recovery tests.
