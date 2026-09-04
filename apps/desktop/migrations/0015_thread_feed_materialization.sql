-- Materialize the retained turn order once, rather than rebuilding its windows
-- inside every correlated thread summary and detail query.
DROP VIEW work_thread_feed;
CREATE VIEW work_thread_feed AS
WITH turns AS MATERIALIZED (SELECT * FROM work_thread_turns),
failures AS MATERIALIZED (
    SELECT t.session_key AS thread_id, COUNT(*) AS total
    FROM codex_turns t JOIN work_session_stages s ON s.turn_key = t.turn_key
    WHERE s.event_type = 'codex.test.failed'
    GROUP BY t.session_key
)
SELECT thread_id AS id, MAX(occurred_at) AS updated_at,
    MIN(first_signal_at) AS first_signal_at,
    (SELECT x.observed_start FROM turns x WHERE x.thread_id = m.thread_id
        ORDER BY x.turn_number LIMIT 1) AS started_at,
    COUNT(*) AS turn_count, MIN(is_read) AS is_read,
    (SELECT x.id FROM turns x WHERE x.thread_id = m.thread_id
        ORDER BY x.turn_number DESC LIMIT 1) AS latest_turn_id,
    (SELECT x.task_label FROM turns x WHERE x.thread_id = m.thread_id
        AND x.task_label IS NOT NULL AND trim(x.task_label) <> ''
        ORDER BY x.turn_number DESC LIMIT 1) AS title,
    COALESCE((SELECT total FROM failures WHERE failures.thread_id = m.thread_id), 0)
        AS failed_test_count
FROM turns m GROUP BY thread_id;
