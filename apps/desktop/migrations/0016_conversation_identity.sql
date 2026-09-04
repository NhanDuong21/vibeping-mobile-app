-- Preserve source thread/turn keys, result records and notification targets.
-- Only verified Codex subagent ancestry changes the work-level projection.
CREATE TABLE codex_thread_identity (
    thread_key TEXT PRIMARY KEY NOT NULL,
    root_key TEXT NOT NULL,
    title TEXT
);
CREATE INDEX codex_thread_identity_root ON codex_thread_identity(root_key);

DROP VIEW work_thread_feed;
DROP VIEW work_thread_turns;

CREATE VIEW work_thread_turns AS
WITH resolved AS (
    SELECT f.*, COALESCE(i.root_key, t.session_key) AS thread_id,
        t.session_key AS source_thread_key, t.started_at AS first_signal_at,
        CASE WHEN t.start_observed THEN t.started_at END AS observed_start,
        t.task_label, t.rowid AS source_order
    FROM work_session_feed f JOIN codex_turns t ON t.turn_key = f.turn_key
    LEFT JOIN codex_thread_identity i ON i.thread_key = t.session_key
    WHERE t.session_key <> ''
)
SELECT *, ROW_NUMBER() OVER thread_order AS turn_number,
    LAG(id) OVER thread_order AS previous_turn_id,
    LEAD(id) OVER thread_order AS next_turn_id
FROM resolved
WINDOW thread_order AS (PARTITION BY thread_id ORDER BY first_signal_at, source_order);

CREATE VIEW work_thread_feed AS
WITH turns AS MATERIALIZED (SELECT * FROM work_thread_turns),
failures AS MATERIALIZED (
    SELECT t.thread_id, COUNT(*) AS total FROM turns t
    JOIN work_session_stages s ON s.turn_key = t.turn_key
    WHERE s.event_type = 'codex.test.failed' GROUP BY t.thread_id
)
SELECT thread_id AS id, MAX(occurred_at) AS updated_at,
    MIN(first_signal_at) AS first_signal_at,
    (SELECT x.observed_start FROM turns x WHERE x.thread_id = m.thread_id
        ORDER BY x.turn_number LIMIT 1) AS started_at,
    COUNT(*) AS turn_count, MIN(is_read) AS is_read,
    (SELECT x.id FROM turns x WHERE x.thread_id = m.thread_id
        ORDER BY (x.source_thread_key = x.thread_id) DESC, x.turn_number DESC LIMIT 1) AS latest_turn_id,
    COALESCE(
        (SELECT i.title FROM codex_thread_identity i WHERE i.root_key = m.thread_id AND i.title IS NOT NULL
            ORDER BY (i.thread_key = i.root_key) DESC LIMIT 1),
        (SELECT x.task_label FROM turns x WHERE x.thread_id = m.thread_id
            AND x.source_thread_key = x.thread_id AND x.task_label IS NOT NULL
            AND trim(x.task_label) <> '' ORDER BY x.turn_number DESC LIMIT 1)
    ) AS title,
    COALESCE((SELECT total FROM failures WHERE failures.thread_id = m.thread_id), 0) AS failed_test_count
FROM turns m GROUP BY thread_id;
