-- Thread identity already exists as a one-way hash. Keep every turn/event intact.
CREATE INDEX codex_turns_thread_order ON codex_turns(session_key, started_at, work_session_id);

CREATE VIEW work_thread_turns AS
SELECT f.*, t.session_key AS thread_id, t.started_at AS first_signal_at,
    CASE WHEN t.start_observed THEN t.started_at END AS observed_start,
    t.task_label,
    ROW_NUMBER() OVER thread_order AS turn_number,
    LAG(f.id) OVER thread_order AS previous_turn_id,
    LEAD(f.id) OVER thread_order AS next_turn_id
FROM work_session_feed f JOIN codex_turns t ON t.turn_key = f.turn_key
WHERE t.session_key <> ''
WINDOW thread_order AS (PARTITION BY t.session_key ORDER BY t.started_at, t.rowid);

CREATE VIEW work_thread_feed AS
SELECT thread_id AS id, MAX(occurred_at) AS updated_at,
    MIN(first_signal_at) AS first_signal_at,
    (SELECT x.observed_start FROM work_thread_turns x WHERE x.thread_id = m.thread_id
        ORDER BY x.turn_number LIMIT 1) AS started_at,
    COUNT(*) AS turn_count, MIN(is_read) AS is_read,
    (SELECT x.id FROM work_thread_turns x WHERE x.thread_id = m.thread_id
        ORDER BY x.turn_number DESC LIMIT 1) AS latest_turn_id,
    (SELECT x.task_label FROM work_thread_turns x WHERE x.thread_id = m.thread_id
        AND x.task_label IS NOT NULL AND trim(x.task_label) <> ''
        ORDER BY x.turn_number DESC LIMIT 1) AS title,
    (SELECT COUNT(*) FROM work_session_stages s JOIN work_thread_turns x ON x.turn_key = s.turn_key
        WHERE x.thread_id = m.thread_id AND s.event_type = 'codex.test.failed') AS failed_test_count
FROM work_thread_turns m GROUP BY thread_id;
