CREATE TABLE preferences_refined (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    notify_completion INTEGER NOT NULL CHECK (notify_completion IN (0, 1)),
    notify_permission INTEGER NOT NULL CHECK (notify_permission IN (0, 1)),
    notify_preview INTEGER NOT NULL CHECK (notify_preview IN (0, 1)),
    notify_final_failure INTEGER NOT NULL CHECK (notify_final_failure IN (0, 1)),
    notify_allowance INTEGER NOT NULL CHECK (notify_allowance IN (0, 1)),
    allowance_threshold_percent INTEGER NOT NULL CHECK (allowance_threshold_percent IN (10, 15, 20, 25, 30)),
    critical_allowance_notifications INTEGER NOT NULL CHECK (critical_allowance_notifications IN (0, 1)),
    quiet_hours_enabled INTEGER NOT NULL CHECK (quiet_hours_enabled IN (0, 1)),
    quiet_start_minutes INTEGER NOT NULL CHECK (quiet_start_minutes BETWEEN 0 AND 1439),
    quiet_end_minutes INTEGER NOT NULL CHECK (quiet_end_minutes BETWEEN 0 AND 1439),
    timezone_offset_minutes INTEGER NOT NULL CHECK (timezone_offset_minutes BETWEEN -720 AND 840),
    quiet_allow_urgent INTEGER NOT NULL CHECK (quiet_allow_urgent IN (0, 1)),
    privacy_mode TEXT NOT NULL CHECK (privacy_mode IN ('standard', 'project', 'private')),
    theme TEXT NOT NULL CHECK (theme IN ('system', 'light', 'dark')),
    retention_days INTEGER NOT NULL CHECK (retention_days IN (7, 14, 30, 60, 90)),
    updated_at TEXT NOT NULL
);

INSERT INTO preferences_refined (
    id, notify_completion, notify_permission, notify_preview, notify_final_failure,
    notify_allowance, allowance_threshold_percent, critical_allowance_notifications,
    quiet_hours_enabled, quiet_start_minutes, quiet_end_minutes,
    timezone_offset_minutes, quiet_allow_urgent, privacy_mode, theme, retention_days, updated_at
)
SELECT
    id, notify_completion, notify_permission, notify_preview, notify_final_failure,
    notify_allowance,
    CASE
        WHEN allowance_threshold_percent <= 12 THEN 10
        WHEN allowance_threshold_percent <= 17 THEN 15
        WHEN allowance_threshold_percent <= 22 THEN 20
        WHEN allowance_threshold_percent <= 27 THEN 25
        ELSE 30
    END,
    critical_allowance_notifications, quiet_hours_enabled, quiet_start_minutes, quiet_end_minutes,
    timezone_offset_minutes, quiet_allow_urgent, privacy_mode, theme,
    CASE
        WHEN retention_days <= 7 THEN 7
        WHEN retention_days <= 14 THEN 14
        WHEN retention_days <= 30 THEN 30
        WHEN retention_days <= 60 THEN 60
        ELSE 90
    END,
    updated_at
FROM preferences;

DROP TABLE preferences;
ALTER TABLE preferences_refined RENAME TO preferences;
