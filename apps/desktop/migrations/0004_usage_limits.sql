CREATE TABLE usage_limit_status (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    state TEXT NOT NULL CHECK (state IN ('available', 'stale', 'unavailable', 'no_windows')),
    last_success_at TEXT,
    last_attempt_at TEXT NOT NULL,
    last_error_code TEXT
);

CREATE TABLE usage_limit_windows (
    window_key TEXT PRIMARY KEY NOT NULL,
    label TEXT NOT NULL,
    window_kind TEXT NOT NULL CHECK (window_kind IN ('primary', 'secondary')),
    remaining_percent REAL NOT NULL CHECK (remaining_percent >= 0 AND remaining_percent <= 100),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    resets_at INTEGER NOT NULL,
    reached INTEGER NOT NULL CHECK (reached IN (0, 1)),
    observed_at TEXT NOT NULL
);
CREATE INDEX usage_limit_windows_duration_idx ON usage_limit_windows (duration_minutes, window_key);

CREATE TABLE usage_limit_alert_states (
    window_key TEXT NOT NULL,
    resets_at INTEGER NOT NULL,
    highest_stage TEXT NOT NULL CHECK (highest_stage IN ('low', 'critical', 'exhausted')),
    updated_at TEXT NOT NULL,
    PRIMARY KEY (window_key, resets_at)
);
