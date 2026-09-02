PRAGMA foreign_keys = ON;

CREATE TABLE app_metadata (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE runtime_state (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

INSERT INTO app_metadata (key, value, updated_at)
VALUES ('schema_owner', 'vibeping', CURRENT_TIMESTAMP);
