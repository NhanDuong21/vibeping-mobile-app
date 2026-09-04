ALTER TABLE codex_turns ADD COLUMN work_session_id TEXT;
UPDATE codex_turns SET work_session_id = COALESCE(
    (SELECT id FROM activity_events e WHERE e.turn_key = codex_turns.turn_key ORDER BY e.rowid LIMIT 1),
    lower(hex(randomblob(16)))
);
CREATE UNIQUE INDEX codex_work_session_id ON codex_turns(work_session_id);

CREATE TABLE work_session_stages (
    id INTEGER PRIMARY KEY,
    turn_key TEXT NOT NULL REFERENCES codex_turns(turn_key) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    UNIQUE(turn_key, event_type, occurred_at)
);
CREATE INDEX work_session_stages_turn ON work_session_stages(turn_key, occurred_at, id);
INSERT OR IGNORE INTO work_session_stages(turn_key, event_type, occurred_at)
    SELECT turn_key, event_type, occurred_at FROM activity_events WHERE turn_key IS NOT NULL;

-- One row per observed turn; standalone allowance signals remain independent.
CREATE VIEW work_session_feed AS
SELECT COALESCE(t.work_session_id, e.id) AS id, e.id AS event_id, e.turn_key,
    COALESCE(t.updated_at, e.occurred_at) AS occurred_at,
    CASE WHEN e.turn_key IS NULL THEN e.is_read ELSE
        (SELECT MIN(r.is_read) FROM activity_events r WHERE r.turn_key = e.turn_key) END AS is_read
FROM activity_events e LEFT JOIN codex_turns t ON t.turn_key = e.turn_key
WHERE e.turn_key IS NULL OR e.rowid = (
    SELECT latest.rowid FROM activity_events latest WHERE latest.turn_key = e.turn_key
    ORDER BY latest.occurred_at DESC, latest.rowid DESC LIMIT 1
);

-- Timeline retention follows the same cutoff as activity, including legacy rows.
CREATE TRIGGER work_session_retention AFTER DELETE ON activity_events
WHEN OLD.turn_key IS NOT NULL BEGIN
    DELETE FROM work_session_stages WHERE turn_key = OLD.turn_key AND occurred_at <= OLD.occurred_at;
    DELETE FROM work_session_stages WHERE turn_key = OLD.turn_key
        AND NOT EXISTS (SELECT 1 FROM activity_events WHERE turn_key = OLD.turn_key);
END;
