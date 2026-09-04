CREATE TABLE personal_rules (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    completion_min_minutes INTEGER NOT NULL DEFAULT 2 CHECK (completion_min_minutes IN (0, 2, 5)),
    waiting_reminder_minutes INTEGER NOT NULL DEFAULT 5 CHECK (waiting_reminder_minutes IN (0, 5, 10))
);
INSERT INTO personal_rules(id) VALUES (1);
CREATE TABLE project_profiles (
    project_name TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    icon TEXT NOT NULL,
    accent TEXT NOT NULL,
    notify_completion INTEGER NOT NULL,
    notify_permission INTEGER NOT NULL,
    notify_preview INTEGER NOT NULL,
    notify_final_failure INTEGER NOT NULL,
    completion_min_minutes INTEGER CHECK (completion_min_minutes IN (0, 2, 5)),
    waiting_reminder_minutes INTEGER CHECK (waiting_reminder_minutes IN (0, 5, 10))
);
ALTER TABLE notification_jobs ADD COLUMN is_waiting_reminder INTEGER NOT NULL DEFAULT 0;
DROP INDEX notification_jobs_event_subscription_idx;
CREATE UNIQUE INDEX notification_jobs_event_subscription_idx ON notification_jobs(event_id, subscription_id, is_waiting_reminder) WHERE event_id IS NOT NULL;
