CREATE TABLE preferences (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    notify_completion INTEGER NOT NULL CHECK (notify_completion IN (0, 1)),
    notify_permission INTEGER NOT NULL CHECK (notify_permission IN (0, 1)),
    notify_preview INTEGER NOT NULL CHECK (notify_preview IN (0, 1)),
    notify_final_failure INTEGER NOT NULL CHECK (notify_final_failure IN (0, 1)),
    notify_allowance INTEGER NOT NULL CHECK (notify_allowance IN (0, 1)),
    allowance_threshold_percent INTEGER NOT NULL CHECK (allowance_threshold_percent BETWEEN 1 AND 50),
    critical_allowance_notifications INTEGER NOT NULL CHECK (critical_allowance_notifications IN (0, 1)),
    quiet_hours_enabled INTEGER NOT NULL CHECK (quiet_hours_enabled IN (0, 1)),
    quiet_start_minutes INTEGER NOT NULL CHECK (quiet_start_minutes BETWEEN 0 AND 1439),
    quiet_end_minutes INTEGER NOT NULL CHECK (quiet_end_minutes BETWEEN 0 AND 1439),
    timezone_offset_minutes INTEGER NOT NULL CHECK (timezone_offset_minutes BETWEEN -720 AND 840),
    quiet_allow_urgent INTEGER NOT NULL CHECK (quiet_allow_urgent IN (0, 1)),
    privacy_mode TEXT NOT NULL CHECK (privacy_mode IN ('standard', 'private')),
    theme TEXT NOT NULL CHECK (theme IN ('system', 'light', 'dark')),
    retention_days INTEGER NOT NULL CHECK (retention_days BETWEEN 7 AND 365),
    updated_at TEXT NOT NULL
);

INSERT INTO preferences (
    id, notify_completion, notify_permission, notify_preview, notify_final_failure,
    notify_allowance, allowance_threshold_percent, critical_allowance_notifications,
    quiet_hours_enabled, quiet_start_minutes, quiet_end_minutes,
    timezone_offset_minutes, quiet_allow_urgent, privacy_mode, theme, retention_days, updated_at
) VALUES (1, 1, 1, 1, 1, 1, 20, 1, 0, 1320, 420, 420, 1, 'standard', 'system', 30, CURRENT_TIMESTAMP);
