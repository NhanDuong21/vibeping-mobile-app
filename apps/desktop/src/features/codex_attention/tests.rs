use chrono::{Duration, Utc};
use serde_json::json;
use tempfile::tempdir;

use crate::infrastructure::database;

use super::{ActivityStore, CodexIngress, CodexSignal, normalize};

fn ingress(turn: &str, signal: CodexSignal) -> CodexIngress {
    CodexIngress {
        session_key: "hashed-session".into(),
        turn_key: turn.into(),
        project_name: "vibeping".into(),
        task_label: None,
        result: None,
        signal,
        occurred_at: Utc::now(),
    }
}

fn ingress_at(turn: &str, signal: CodexSignal, offset_seconds: i64) -> CodexIngress {
    CodexIngress {
        occurred_at: Utc::now() + Duration::seconds(offset_seconds),
        ..ingress(turn, signal)
    }
}

#[test]
fn classifier_redacts_prompts_paths_and_tool_output() {
    let raw = json!({
        "hook_event_name": "UserPromptSubmit",
        "session_id": "private-session",
        "turn_id": "private-turn",
        "cwd": "C:\\private\\customer\\vibeping",
        "prompt": "secret prompt"
    });
    let value = normalize("hook", raw.to_string().as_bytes())
        .unwrap()
        .unwrap();
    let persisted = serde_json::to_string(&value).unwrap();
    assert_eq!(value.project_name, "vibeping");
    assert!(!persisted.contains("secret prompt"));
    assert!(!persisted.contains("private-session"));
    assert!(!persisted.contains("customer"));
}

#[test]
fn classifier_recognizes_documented_attention_and_test_signals() {
    let permission = json!({
        "hook_event_name": "PermissionRequest", "session_id": "s", "turn_id": "t"
    });
    assert_eq!(
        normalize("hook", permission.to_string().as_bytes())
            .unwrap()
            .unwrap()
            .signal,
        CodexSignal::PermissionRequired
    );
    let test = json!({
        "hook_event_name": "PostToolUse", "session_id": "s", "turn_id": "t",
        "tool_name": "Bash", "tool_input": {"cmd": "cargo test"},
        "tool_response": {"exit_code": 0, "output": "private output"}
    });
    assert_eq!(
        normalize("hook", test.to_string().as_bytes())
            .unwrap()
            .unwrap()
            .signal,
        CodexSignal::TestPassed
    );
    let progress = json!({
        "hook_event_name": "PostToolUse", "session_id": "s", "turn_id": "t",
        "tool_name": "apply_patch", "tool_input": {"patch": "private"},
        "tool_response": {"exit_code": 0}
    });
    assert_eq!(
        normalize("hook", progress.to_string().as_bytes())
            .unwrap()
            .unwrap()
            .signal,
        CodexSignal::Progressed
    );
}

#[tokio::test]
async fn hook_readiness_ignores_notify_only_and_accepts_any_hook_signal() {
    let temp = tempdir().unwrap();
    let pool = database::connect(&temp.path().join("hook-readiness.sqlite3"))
        .await
        .unwrap();
    let store = ActivityStore::new(pool.clone());

    store
        .ingest(&ingress("notify", CodexSignal::Completed))
        .await
        .unwrap();
    assert!(!store.has_hook_signal().await.unwrap());

    store
        .ingest(&ingress("hook", CodexSignal::Stopped))
        .await
        .unwrap();
    assert!(store.has_hook_signal().await.unwrap());
}

#[tokio::test]
async fn progress_resumes_waiting_work_without_creating_feed_noise() {
    let temp = tempdir().unwrap();
    let pool = database::connect(&temp.path().join("progress.sqlite3"))
        .await
        .unwrap();
    let store = ActivityStore::new(pool);
    store
        .ingest(&ingress("progress", CodexSignal::Started))
        .await
        .unwrap();
    store
        .ingest(&ingress("progress", CodexSignal::PermissionRequired))
        .await
        .unwrap();
    assert_eq!(
        store.current_work().await.unwrap().unwrap().state,
        "waiting"
    );

    let event = store
        .ingest(&ingress("progress", CodexSignal::Progressed))
        .await
        .unwrap();
    assert!(event.is_none());
    assert_eq!(
        store.current_work().await.unwrap().unwrap().state,
        "running"
    );
    assert_eq!(store.snapshot().await.unwrap().events.len(), 2);

    store
        .ingest(&ingress("progress", CodexSignal::Stopped))
        .await
        .unwrap();
    assert!(store.current_work().await.unwrap().is_none());
}

#[tokio::test]
async fn failed_then_fixed_turn_completes_without_failure_event() {
    let temp = tempdir().unwrap();
    let pool = database::connect(&temp.path().join("events.sqlite3"))
        .await
        .unwrap();
    let store = ActivityStore::new(pool);
    store
        .ingest(&ingress("one", CodexSignal::Started))
        .await
        .unwrap();
    store
        .ingest(&ingress("one", CodexSignal::TestFailed))
        .await
        .unwrap();
    store
        .ingest(&ingress("one", CodexSignal::TestPassed))
        .await
        .unwrap();
    store
        .ingest(&ingress("one", CodexSignal::Completed))
        .await
        .unwrap();
    let snapshot = store.snapshot().await.unwrap();
    assert!(
        snapshot
            .events
            .iter()
            .any(|event| event.event_type == "codex.turn.completed")
    );
    assert!(
        !snapshot
            .events
            .iter()
            .any(|event| event.event_type == "codex.test.failed")
    );
}

#[tokio::test]
async fn current_work_exposes_real_test_and_preview_state() {
    let temp = tempdir().unwrap();
    let pool = database::connect(&temp.path().join("live-state.sqlite3"))
        .await
        .unwrap();
    let store = ActivityStore::new(pool);
    store
        .ingest(&ingress_at("live", CodexSignal::Started, 0))
        .await
        .unwrap();
    store
        .ingest(&ingress_at("live", CodexSignal::TestFailed, 1))
        .await
        .unwrap();
    let failed = store.current_work().await.unwrap().unwrap();
    assert_eq!(failed.last_test_state, "failed");
    assert!(!failed.preview_ready);

    store
        .ingest(&ingress_at("live", CodexSignal::TestPassed, 2))
        .await
        .unwrap();
    store
        .ingest(&ingress_at("live", CodexSignal::PreviewReady, 3))
        .await
        .unwrap();
    let preview = store.current_work().await.unwrap().unwrap();
    assert_eq!(preview.last_test_state, "passed");
    assert!(preview.preview_ready);
}

#[tokio::test]
async fn activity_detail_timeline_contains_only_stored_stages() {
    let temp = tempdir().unwrap();
    let pool = database::connect(&temp.path().join("timeline.sqlite3"))
        .await
        .unwrap();
    let store = ActivityStore::new(pool.clone());
    for (offset, signal) in [
        (0, CodexSignal::Started),
        (1, CodexSignal::Progressed),
        (2, CodexSignal::PermissionRequired),
        (3, CodexSignal::PreviewReady),
    ] {
        store
            .ingest(&ingress_at("timeline", signal, offset))
            .await
            .unwrap();
    }
    let completed = store
        .ingest(&ingress_at("timeline", CodexSignal::Completed, 4))
        .await
        .unwrap()
        .unwrap();
    let detail = store.event_detail(&completed.id).await.unwrap().unwrap();
    let stages: Vec<&str> = detail
        .timeline
        .iter()
        .map(|stage| stage.event_type.as_str())
        .collect();
    assert_eq!(
        stages,
        vec![
            "codex.turn.started",
            "codex.attention.permission_required",
            "codex.preview.ready",
            "codex.turn.completed"
        ]
    );

    sqlx::query(
        "INSERT INTO activity_events (id, dedupe_key, event_type, title, summary, project_name, \
         occurred_at, created_at) VALUES ('standalone', 'standalone', 'codex.allowance.low', \
         'Hạn mức thấp', 'Mở VibePing để xem.', 'VibePing', ?, ?)",
    )
    .bind(Utc::now())
    .bind(Utc::now())
    .execute(&pool)
    .await
    .unwrap();
    let standalone = store.event_detail("standalone").await.unwrap().unwrap();
    assert!(standalone.timeline.is_empty());
}

#[tokio::test]
async fn final_failure_and_duplicates_create_one_attention_event_each() {
    let temp = tempdir().unwrap();
    let pool = database::connect(&temp.path().join("events.sqlite3"))
        .await
        .unwrap();
    let store = ActivityStore::new(pool);
    for signal in [
        CodexSignal::Started,
        CodexSignal::PermissionRequired,
        CodexSignal::PermissionRequired,
        CodexSignal::TestFailed,
        CodexSignal::Stopped,
        CodexSignal::Completed,
    ] {
        store.ingest(&ingress("two", signal)).await.unwrap();
    }
    let snapshot = store.snapshot().await.unwrap();
    assert_eq!(
        snapshot
            .events
            .iter()
            .filter(|event| event.event_type == "codex.attention.permission_required")
            .count(),
        1
    );
    assert_eq!(
        snapshot
            .events
            .iter()
            .filter(|event| event.event_type == "codex.test.failed")
            .count(),
        1
    );
    assert!(
        !snapshot
            .events
            .iter()
            .any(|event| event.event_type == "codex.turn.completed")
    );
}

#[tokio::test]
async fn activity_feed_handles_empty_history_pagination_and_read_state() {
    let temp = tempdir().unwrap();
    let pool = database::connect(&temp.path().join("feed.sqlite3"))
        .await
        .unwrap();
    let store = ActivityStore::new(pool);
    let empty = store.list_events(None, 20).await.unwrap();
    assert!(empty.events.is_empty());
    assert_eq!(empty.unread_count, 0);

    for turn in ["one", "two", "three"] {
        store
            .ingest(&ingress(turn, CodexSignal::Started))
            .await
            .unwrap();
    }
    let first = store.list_events(None, 2).await.unwrap();
    assert_eq!(first.events.len(), 2);
    assert_eq!(first.unread_count, 3);
    let second = store
        .list_events(first.next_cursor.as_deref(), 2)
        .await
        .unwrap();
    assert_eq!(second.events.len(), 1);
    assert!(second.next_cursor.is_none());

    let id = first.events[0].id.clone();
    let state = store.mark_read(&id).await.unwrap().unwrap();
    assert_eq!(state.unread_count, 2);
    assert!(
        store
            .event_detail(&id)
            .await
            .unwrap()
            .unwrap()
            .event
            .is_read
    );
    assert!(store.mark_read("missing").await.unwrap().is_none());
    assert_eq!(store.mark_all_read().await.unwrap().unread_count, 0);
}

#[tokio::test]
async fn activity_feed_rejects_unknown_cursor_and_oversized_page() {
    let temp = tempdir().unwrap();
    let pool = database::connect(&temp.path().join("cursor.sqlite3"))
        .await
        .unwrap();
    let store = ActivityStore::new(pool);

    assert!(store.list_events(Some("missing"), 20).await.is_err());
    assert!(store.list_events(None, 51).await.is_err());
}
