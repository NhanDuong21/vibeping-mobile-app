ALTER TABLE codex_turns ADD COLUMN start_observed INTEGER NOT NULL DEFAULT 0
    CHECK (start_observed IN (0, 1));

-- Recover only evidence we actually retained. Tool-only legacy rows must never
-- become foreground work, and no completion event is invented during repair.
UPDATE codex_turns SET start_observed = 1 WHERE EXISTS (
    SELECT 1 FROM activity_events e
    WHERE e.turn_key = codex_turns.turn_key AND e.event_type = 'codex.turn.started'
);

CREATE INDEX codex_turns_session_start ON codex_turns (session_key, start_observed, started_at);
