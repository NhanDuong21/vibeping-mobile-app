use super::{ActivityStore, CodexIngress, CodexResult, CodexSignal};
use crate::infrastructure::database;
use chrono::{Duration, TimeZone, Utc};

fn signal(thread: &str, turn: &str, kind: CodexSignal, minute: i64) -> CodexIngress {
    CodexIngress {
        session_key: thread.into(),
        turn_key: format!("{thread}:{turn}"),
        project_name: "same-repository".into(),
        task_label: Some("Hoàn thiện hoạt động".into()),
        thread_identity: None,
        result: None,
        signal: kind,
        occurred_at: Utc.with_ymd_and_hms(2026, 9, 4, 1, 0, 0).unwrap() + Duration::minutes(minute),
    }
}

#[tokio::test]
async fn many_same_project_threads_keep_exact_totals_across_feed_pages() {
    let temp = tempfile::tempdir().unwrap();
    let pool = database::connect(&temp.path().join("many.sqlite3"))
        .await
        .unwrap();
    let store = ActivityStore::new(pool);
    for thread in 0..40 {
        for turn in 1..=3 {
            store
                .ingest(&signal(
                    &format!("thread-{thread}"),
                    &turn.to_string(),
                    CodexSignal::Completed,
                    thread * 10 + turn,
                ))
                .await
                .unwrap();
        }
    }
    let first = store.list_threads(None, 20).await.unwrap();
    let second = store
        .list_threads(first.next_cursor.as_deref(), 20)
        .await
        .unwrap();
    assert_eq!((first.events.len(), second.events.len()), (20, 20));
    assert!(second.next_cursor.is_none());
    let mut identities = std::collections::HashSet::new();
    for event in first.events.into_iter().chain(second.events) {
        let context = event.session.unwrap().thread.unwrap();
        assert!(identities.insert(context.id));
        assert_eq!((context.turn_count, context.turn_number), (3, 3));
        assert_eq!(context.turn_ids.len(), 3);
        assert_eq!(context.turn_ids.last(), Some(&context.latest_turn_id));
    }
}

#[tokio::test]
async fn thread_pages_count_all_turns_keep_identity_order_and_notification_targets() {
    let temp = tempfile::tempdir().unwrap();
    let path = temp.path().join("threads.sqlite3");
    let pool = database::connect(&path).await.unwrap();
    let store = ActivityStore::new(pool.clone());
    assert!(
        store
            .list_threads(None, 20)
            .await
            .unwrap()
            .events
            .is_empty()
    );
    let mut notification = None;
    for number in 1..=24 {
        let turn = number.to_string();
        let start = signal("thread-a", &turn, CodexSignal::Started, number * 3);
        let event = store.ingest(&start).await.unwrap();
        if number == 5 {
            notification = event;
        }
        let done = signal("thread-a", &turn, CodexSignal::Completed, number * 3 + 2);
        store.ingest(&done).await.unwrap();
        store.ingest(&done).await.unwrap();
    }
    store
        .ingest(&signal("thread-b", "one", CodexSignal::Completed, 80))
        .await
        .unwrap();
    let first = store.list_threads(None, 1).await.unwrap();
    assert_eq!(first.events.len(), 1);
    assert_eq!(
        first.events[0]
            .session
            .as_ref()
            .unwrap()
            .thread
            .as_ref()
            .unwrap()
            .id,
        "thread-b"
    );
    let second = store
        .list_threads(first.next_cursor.as_deref(), 1)
        .await
        .unwrap();
    let context = second.events[0]
        .session
        .as_ref()
        .unwrap()
        .thread
        .as_ref()
        .unwrap();
    assert_eq!(context.id, "thread-a");
    assert_eq!((context.turn_count, context.turn_number), (24, 24));
    assert!(second.next_cursor.is_none());
    let mut page = store.list_thread_turns("thread-a", None, 10).await.unwrap();
    let mut ids = Vec::new();
    loop {
        ids.extend(page.events.iter().map(|event| event.id.clone()));
        let Some(cursor) = page.next_cursor else {
            break;
        };
        page = store
            .list_thread_turns("thread-a", Some(&cursor), 10)
            .await
            .unwrap();
    }
    assert_eq!(ids.len(), 24);
    assert_eq!(
        context.turn_ids,
        ids.iter().rev().cloned().collect::<Vec<_>>()
    );
    let unique = ids.iter().collect::<std::collections::HashSet<_>>();
    assert_eq!(unique.len(), 24);
    let notification = notification.unwrap();
    let detail = store
        .session_detail(&notification.id)
        .await
        .unwrap()
        .unwrap();
    let context = detail.event.session.unwrap().thread.unwrap();
    assert_eq!(context.turn_number, 5);
    assert_eq!(context.previous_turn_id.as_ref(), Some(&ids[20]));
    assert_eq!(context.next_turn_id.as_ref(), Some(&ids[18]));
    store
        .ingest(&signal("thread-a", "25", CodexSignal::Started, 85))
        .await
        .unwrap();
    let feed = store.list_threads(None, 20).await.unwrap();
    assert_eq!(feed.events.len(), 2);
    let latest = feed.events[0]
        .session
        .as_ref()
        .unwrap()
        .thread
        .as_ref()
        .unwrap();
    assert_eq!((latest.id.as_str(), latest.turn_count), ("thread-a", 25));
    pool.close().await;
    let reopened = ActivityStore::new(database::connect(&path).await.unwrap());
    assert_eq!(
        reopened.list_threads(None, 20).await.unwrap().events.len(),
        2
    );
}

#[tokio::test]
async fn failures_read_state_missing_starts_and_legacy_are_preserved() {
    let temp = tempfile::tempdir().unwrap();
    let pool = database::connect(&temp.path().join("history.sqlite3"))
        .await
        .unwrap();
    let store = ActivityStore::new(pool.clone());
    store
        .ingest(&signal("a", "one", CodexSignal::Started, 1))
        .await
        .unwrap();
    for (at, kind) in [
        (2, CodexSignal::TestFailed),
        (3, CodexSignal::TestFailed),
        (4, CodexSignal::TestPassed),
    ] {
        let event = signal("a", "one", kind, at);
        store.ingest(&event).await.unwrap();
        store.ingest(&event).await.unwrap();
    }
    let mut done = signal("a", "one", CodexSignal::Completed, 5);
    done.result = Some(CodexResult {
        text: "Kết quả đầy đủ.\n\n- Đã sửa lỗi.\n- Đã kiểm thử.".into(),
        truncated: false,
    });
    store.ingest(&done).await.unwrap();
    let feed = store.list_threads(None, 20).await.unwrap();
    let first_id = feed.events[0].id.clone();
    let turn = feed.events[0].session.as_ref().unwrap();
    assert_eq!(turn.state, "completed");
    assert_eq!(turn.last_test_state.as_deref(), Some("passed"));
    assert_eq!(turn.thread.as_ref().unwrap().failed_test_count, 2);
    store.mark_read(&first_id).await.unwrap();
    assert!(
        store.list_threads(None, 20).await.unwrap().events[0]
            .session
            .as_ref()
            .unwrap()
            .thread
            .as_ref()
            .unwrap()
            .is_read
    );
    store
        .ingest(&signal("a", "two", CodexSignal::Completed, 6))
        .await
        .unwrap();
    let latest = store.list_threads(None, 20).await.unwrap().events.remove(0);
    let turn = latest.session.unwrap();
    assert!(turn.started_at.is_none());
    assert_eq!(turn.thread.as_ref().unwrap().turn_count, 2);
    assert!(!turn.thread.unwrap().is_read);
    let retained = store.session_detail(&first_id).await.unwrap().unwrap();
    assert_eq!(retained.result.unwrap().text, done.result.unwrap().text);
    assert_eq!(retained.timeline.len(), 5);
    sqlx::query("INSERT INTO activity_events (id, dedupe_key, event_type, title, summary, project_name, occurred_at, created_at, is_read) VALUES ('legacy', 'legacy', 'codex.turn.completed', 'Hoạt động cũ', 'Cũ', 'same-repository', '2026-09-04T01:10:00Z', '2026-09-04T01:10:00Z', 1)")
        .execute(&pool).await.unwrap();
    let legacy = store.list_threads(None, 20).await.unwrap();
    assert_eq!(legacy.events.len(), 2);
    assert!(
        legacy
            .events
            .iter()
            .find(|e| e.id == "legacy")
            .unwrap()
            .session
            .is_none()
    );
    assert!(store.session_detail("legacy").await.unwrap().is_some());
    assert!(store.list_threads(Some("bad"), 20).await.is_err());
    assert!(store.list_thread_turns("a", Some("bad"), 10).await.is_err());
    assert!(store.list_thread_turns("a", None, 0).await.is_err());
}
