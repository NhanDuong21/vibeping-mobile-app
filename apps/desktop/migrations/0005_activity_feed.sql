CREATE INDEX activity_events_unread_time_idx
    ON activity_events (is_read, occurred_at DESC, id DESC);
