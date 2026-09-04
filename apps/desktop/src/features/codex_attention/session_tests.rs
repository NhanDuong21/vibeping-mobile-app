use chrono::{Duration, Utc};
use tempfile::tempdir;

use super::{ActivityStore, CodexIngress, CodexResult, CodexSignal};
use crate::infrastructure::database;

#[tokio::test]
async fn an_offline_read_does_not_read_a_later_completion_and_stop_is_not_success() {
    let temp = tempdir().unwrap();
    let store = ActivityStore::new(
        database::connect(&temp.path().join("reads.sqlite3"))
            .await
            .unwrap(),
    );
    let start = signal("one", CodexSignal::Started, 0);
    store.ingest(&start).await.unwrap();
    let id = store.list_sessions(None, 20).await.unwrap().events[0]
        .id
        .clone();
    store
        .ingest(&signal("one", CodexSignal::Stopped, 10))
        .await
        .unwrap();
    let stopped = store.session_detail(&id).await.unwrap().unwrap();
    assert_eq!(stopped.event.session.unwrap().state, "stopped");
    assert_eq!(
        stopped.timeline.last().unwrap().event_type,
        "codex.turn.stopped"
    );
    store
        .ingest(&signal("one", CodexSignal::Completed, 11))
        .await
        .unwrap();
    store
        .mark_read_through(&id, Some(start.occurred_at))
        .await
        .unwrap();
    assert_eq!(store.session_unread_count().await.unwrap(), 1);
    let completed = store.session_detail(&id).await.unwrap().unwrap();
    assert_eq!(completed.event.session.unwrap().state, "completed");
    assert_eq!(completed.timeline.len(), 2);
    assert_eq!(
        completed.timeline.last().unwrap().event_type,
        "codex.turn.completed"
    );
}

fn signal(turn: &str, kind: CodexSignal, minute: i64) -> CodexIngress {
    CodexIngress {
        session_key: "synthetic-thread".into(),
        turn_key: turn.into(),
        project_name: "sample-project".into(),
        task_label: Some("Sửa bộ lọc hoạt động".into()),
        thread_identity: None,
        result: None,
        signal: kind,
        occurred_at: Utc::now() - Duration::minutes(30) + Duration::minutes(minute),
    }
}

#[tokio::test]
async fn one_session_tracks_lifecycle_old_links_result_and_restart() {
    let temp = tempdir().unwrap();
    let path = temp.path().join("sessions.sqlite3");
    let pool = database::connect(&path).await.unwrap();
    let store = ActivityStore::new(pool.clone());
    let start = store
        .ingest(&signal("one", CodexSignal::Started, 0))
        .await
        .unwrap()
        .unwrap();
    let stable = store.list_sessions(None, 20).await.unwrap().events[0]
        .id
        .clone();
    for (minute, kind) in [
        (7, CodexSignal::TestFailed),
        (10, CodexSignal::Progressed),
        (12, CodexSignal::PermissionRequired),
        (13, CodexSignal::Progressed),
        (16, CodexSignal::TestPassed),
    ] {
        let value = signal("one", kind, minute);
        store.ingest(&value).await.unwrap();
        store.ingest(&value).await.unwrap();
    }
    store.mark_read(&stable).await.unwrap();
    let finish = store
        .ingest(&signal("one", CodexSignal::Completed, 18))
        .await
        .unwrap()
        .unwrap();
    let feed = store.list_sessions(None, 20).await.unwrap();
    assert_eq!(feed.events.len(), 1);
    assert_eq!(feed.events[0].id, stable);
    assert_eq!(feed.unread_count, 1);
    let session = feed.events[0].session.as_ref().unwrap();
    assert_eq!(session.state, "completed");
    assert_eq!(session.failed_test_count, 1);
    assert!(session.event_ids.contains(&start.id));
    assert!(session.event_ids.contains(&finish.id));
    assert_eq!(
        (session.completed_at.unwrap() - session.started_at.unwrap()).num_minutes(),
        18
    );
    store.mark_read(&start.id).await.unwrap();
    let mut late = signal("one", CodexSignal::Completed, 19);
    late.result = Some(CodexResult {
        text: "Đã sửa bộ lọc. Kiểm thử đã qua.".into(),
        truncated: false,
    });
    store.ingest(&late).await.unwrap();
    for id in [&start.id, &finish.id, &stable] {
        let detail = store.session_detail(id).await.unwrap().unwrap();
        assert_eq!(detail.event.id, stable);
        assert!(detail.event.is_read);
        assert_eq!(detail.timeline.len(), 7);
        assert_eq!(
            detail.result.unwrap().text,
            late.result.as_ref().unwrap().text
        );
    }
    assert_eq!(store.session_unread_count().await.unwrap(), 0);
    pool.close().await;
    let reopened = ActivityStore::new(database::connect(&path).await.unwrap());
    assert_eq!(
        reopened
            .session_detail(&stable)
            .await
            .unwrap()
            .unwrap()
            .timeline
            .len(),
        7
    );
}

#[tokio::test]
async fn distinct_failed_attempts_are_counted_but_retries_are_not() {
    let temp = tempdir().unwrap();
    let store = ActivityStore::new(
        database::connect(&temp.path().join("attempts.sqlite3"))
            .await
            .unwrap(),
    );
    store
        .ingest(&signal("one", CodexSignal::Started, 0))
        .await
        .unwrap();
    for minute in [2, 5] {
        let failed = signal("one", CodexSignal::TestFailed, minute);
        store.ingest(&failed).await.unwrap();
        store.ingest(&failed).await.unwrap();
    }
    let feed = store.list_sessions(None, 20).await.unwrap();
    assert_eq!(
        feed.events[0].session.as_ref().unwrap().failed_test_count,
        2
    );
}

#[tokio::test]
async fn turns_and_projects_stay_separate_and_cursor_survives_live_updates() {
    let temp = tempdir().unwrap();
    let store = ActivityStore::new(
        database::connect(&temp.path().join("pages.sqlite3"))
            .await
            .unwrap(),
    );
    for (minute, turn) in [(1, "one"), (2, "two"), (3, "three")] {
        store
            .ingest(&signal(turn, CodexSignal::Started, minute))
            .await
            .unwrap();
    }
    let first = store.list_sessions(None, 2).await.unwrap();
    assert_eq!(first.events.len(), 2);
    let last = first.events.last().unwrap();
    let mut updated = signal("two", CodexSignal::Completed, 29);
    updated.project_name = "other-project".into();
    store.ingest(&updated).await.unwrap();
    assert!(
        store
            .session_detail(&last.id)
            .await
            .unwrap()
            .unwrap()
            .event
            .session
            .unwrap()
            .completed_at
            .is_some()
    );
    let page = store
        .list_sessions(first.next_cursor.as_deref(), 2)
        .await
        .unwrap();
    assert_eq!(page.events.len(), 1);
    assert!(
        !first
            .events
            .iter()
            .any(|event| event.id == page.events[0].id)
    );
    assert_eq!(store.list_sessions(None, 20).await.unwrap().events.len(), 3);
    assert!(store.list_sessions(Some("bad-cursor"), 20).await.is_err());
}

#[tokio::test]
async fn completion_without_start_has_no_invented_duration_and_retention_cleans_stages() {
    let temp = tempdir().unwrap();
    let pool = database::connect(&temp.path().join("retention.sqlite3"))
        .await
        .unwrap();
    let store = ActivityStore::new(pool.clone());
    store
        .ingest(&signal("one", CodexSignal::Completed, 0))
        .await
        .unwrap();
    let event = store
        .list_sessions(None, 20)
        .await
        .unwrap()
        .events
        .remove(0);
    assert!(event.session.unwrap().started_at.is_none());
    sqlx::query("DELETE FROM activity_events")
        .execute(&pool)
        .await
        .unwrap();
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM work_session_stages")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 0);
    assert!(store.session_detail(&event.id).await.unwrap().is_none());
}
