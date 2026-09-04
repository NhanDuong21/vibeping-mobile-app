ALTER TABLE activity_events ADD COLUMN result_excerpt TEXT;
ALTER TABLE activity_events ADD COLUMN result_text TEXT;
ALTER TABLE activity_events ADD COLUMN result_truncated INTEGER NOT NULL DEFAULT 0 CHECK (result_truncated IN (0, 1));
