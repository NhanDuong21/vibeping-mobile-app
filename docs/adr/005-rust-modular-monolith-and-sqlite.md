# ADR 005: Rust modular monolith and SQLite

- **Status:** Accepted for future V1
- **Decision:** Ship one Rust 1.98 Windows executable, organized by feature with explicit adapters, using SQLite as source of truth.
- **Context:** One-user local operation needs durability and simple distribution, not services.
- **Alternatives:** Node backend, multiple processes/services, phone-owned IndexedDB, hosted database.
- **Consequences:** One lifecycle and transaction boundary; strict module/file rules prevent a monolithic `main.rs`. IndexedDB remains disposable cache.
- **Validation needed:** Later migration, crash recovery, concurrency, backup, and vertical-slice tests.
