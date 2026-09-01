CREATE TABLE owner_identity (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    tailscale_login TEXT NOT NULL UNIQUE,
    claimed_at TEXT NOT NULL
);

CREATE TABLE pairing_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    used_at TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX pairing_sessions_active_idx
    ON pairing_sessions (expires_at, used_at, created_at DESC);

CREATE TABLE mobile_devices (
    id TEXT PRIMARY KEY NOT NULL,
    owner_id INTEGER REFERENCES owner_identity(id) ON DELETE SET NULL,
    installation_id TEXT NOT NULL UNIQUE,
    display_mode TEXT NOT NULL CHECK (display_mode IN ('browser', 'standalone')),
    notification_permission TEXT NOT NULL CHECK (notification_permission IN ('default', 'granted', 'denied')),
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
);

CREATE TABLE push_subscriptions (
    id TEXT PRIMARY KEY NOT NULL,
    device_id TEXT REFERENCES mobile_devices(id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    imported_unclaimed INTEGER NOT NULL DEFAULT 0 CHECK (imported_unclaimed IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_success_at TEXT,
    failure_count INTEGER NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
    disabled_at TEXT
);
CREATE INDEX push_subscriptions_device_idx ON push_subscriptions (device_id, disabled_at);

CREATE TABLE notification_jobs (
    id TEXT PRIMARY KEY NOT NULL,
    subscription_id TEXT NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
    dedupe_key TEXT NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    target_url TEXT NOT NULL,
    tag TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('pending', 'leased', 'accepted', 'retry', 'stale', 'expired', 'failed')),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    next_attempt_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    lease_until TEXT,
    last_error_code TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    UNIQUE (dedupe_key, subscription_id)
);
CREATE INDEX notification_jobs_due_idx ON notification_jobs (state, next_attempt_at, lease_until);

CREATE TABLE notification_attempts (
    id TEXT PRIMARY KEY NOT NULL,
    job_id TEXT NOT NULL REFERENCES notification_jobs(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
    outcome TEXT NOT NULL,
    provider_status INTEGER,
    stable_error_code TEXT,
    attempted_at TEXT NOT NULL,
    UNIQUE (job_id, attempt_number)
);

CREATE TABLE api_rate_limits (
    scope TEXT NOT NULL,
    identity_key TEXT NOT NULL,
    window_started_at TEXT NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
    PRIMARY KEY (scope, identity_key)
);
