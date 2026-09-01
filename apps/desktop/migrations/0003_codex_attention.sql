CREATE TABLE codex_turns (
    turn_key TEXT PRIMARY KEY NOT NULL,
    session_key TEXT NOT NULL,
    project_name TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('running', 'waiting', 'completed', 'failed')),
    last_test_state TEXT NOT NULL DEFAULT 'unknown' CHECK (last_test_state IN ('unknown', 'passed', 'failed')),
    preview_ready INTEGER NOT NULL DEFAULT 0 CHECK (preview_ready IN (0, 1)),
    started_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
);
CREATE INDEX codex_turns_state_idx ON codex_turns (state, updated_at DESC);

CREATE TABLE activity_events (
    id TEXT PRIMARY KEY NOT NULL,
    dedupe_key TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    project_name TEXT NOT NULL,
    turn_key TEXT,
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
    FOREIGN KEY (turn_key) REFERENCES codex_turns(turn_key) ON DELETE SET NULL
);
CREATE INDEX activity_events_time_idx ON activity_events (occurred_at DESC, id DESC);

ALTER TABLE notification_jobs ADD COLUMN event_id TEXT REFERENCES activity_events(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX notification_jobs_event_subscription_idx
    ON notification_jobs (event_id, subscription_id)
    WHERE event_id IS NOT NULL;
