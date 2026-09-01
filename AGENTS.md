# Repository rules for coding agents

These rules apply to the entire repository. Implement only the current requested vertical slice; do not scaffold future phases.

## Product boundaries

- VibePing is a one-user personal-production attention tool, not a remote-control or chat product.
- All user-visible client copy is Vietnamese, plain, operational, and free of raw technical errors.
- Do not add accounts, teams, billing, analytics, remote commands, terminal access, native packaging, Windows auto-start, public hosting, or paid infrastructure.
- Never enable Tailscale Funnel. The backend binds only to localhost and is exposed privately with Tailscale Serve.
- VibePing itself starts only through an explicit user action.

## Architecture

- Rust is a feature-oriented modular monolith with explicit infrastructure adapters.
- Angular is feature-first with small standalone components. Signals own local/UI state; RxJS owns streams and asynchronous integration.
- Angular page components coordinate state and interaction only. They contain no networking, storage, or business logic.
- HTTP handlers validate, call one use case, and map the result. Business rules stay outside handlers.
- Database access stays behind a feature-owned repository/store. API DTOs are not blindly reused as domain models.
- SQLite on Windows is the source of truth. IndexedDB on iPhone is a cache only.
- A generated API contract will be the single DTO source of truth in its later phase; do not duplicate Rust and TypeScript contracts manually.
- Styling uses Tailwind utilities. No component CSS/SCSS, Sass, Tailwind CDN, or hand-edited generated CSS.
- Use the project-local Impeccable skill for every user-visible change.

## Size limits

- `main.rs`: at most 120 lines of meaningful logic.
- Normal non-generated source: target 100–300 lines, warning over 350, CI failure over 500.
- Functions: target under 40 lines, warning over 60, avoid over 80.
- Split by feature responsibility, not into catch-all files.

Forbidden filenames: `utils.ts`, `utils.rs`, `helpers.ts`, `helpers.rs`, and `common.service.ts`. Also forbidden: a monolithic `main.rs`, unrelated-domain services, cross-feature imports into private internals, business logic in templates/components or Axum handlers, manual generated-file edits, speculative abstractions, and placeholder feature scaffolding.

## Quality and security

- Every behavior change adds or updates meaningful tests.
- Run formatting, linting, tests, release builds, Tailwind build, architecture checks, and hygiene checks before handoff.
- Keep VAPID private material, push subscriptions, logs, PIDs, Tailscale snapshots, real Codex output, tokens, cookies, emails, and machine-specific paths out of Git.
- Do not read Codex credential files or log account email. Use `codex app-server` for account state and limits.
- Do not edit the sibling `vibeping-ios-push-poc` repository.

## Delivery discipline

Each task completes one working vertical slice. Preserve unrelated user changes. Do not commit or push unless the user explicitly asks.
