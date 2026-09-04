use super::{
    ActivityStore, CodexIngress, CodexResult, CodexSignal, normalize, result_content::from_thread,
};
use crate::{features::notifications::NotificationStore, infrastructure::database};
use chrono::Utc;
use serde_json::json;

fn completed() -> CodexIngress {
    normalize("notify", &serde_json::to_vec(&json!({
        "type": "agent-turn-complete", "thread-id": "s", "turn-id": "t",
        "cwd": "sample", "last-assistant-message": "Đã sửa bộ lọc.\n\n- Kiểm thử đã qua.",
        "input-messages": ["Do not persist this prompt"], "tool_output": "Do not persist this log"
    })).unwrap()).unwrap().unwrap()
}

#[test]
fn completion_carries_only_the_answer_and_bounds_unicode_without_breaking_it() {
    let event = completed();
    let serialized = serde_json::to_string(&event).unwrap();
    assert!(!serialized.contains("Do not persist"));
    assert_eq!(
        event.result.unwrap().excerpt().as_deref(),
        Some("Đã sửa bộ lọc.")
    );
    let long = CodexResult::from_text(&"ệ".repeat(8_001)).unwrap();
    assert_eq!(long.text.chars().count(), 8_000);
    assert!(long.truncated);
    assert_eq!(
        CodexResult::from_text("\u{202e}Xong\n\tđã kiểm tra\0")
            .unwrap()
            .text,
        "Xong\n\tđã kiểm tra"
    );
    assert!(CodexResult::from_text(" \n\t").is_none());
    let raw = json!({"hook_event_name":"PostToolUse", "session_id":"s", "turn_id":"t", "last-assistant-message":"not final"});
    assert!(
        normalize("hook", &serde_json::to_vec(&raw).unwrap())
            .unwrap()
            .unwrap()
            .result
            .is_none()
    );
}

#[test]
fn thread_fallback_selects_the_exact_completed_turn_and_only_terminal_assistant_text() {
    let mut value = json!({"thread":{"turns":[
        {"id":"old","status":"completed","items":[{"type":"agentMessage","phase":"final_answer","text":"wrong turn"}]},
        {"id":"current","status":"completed","items":[
            {"type":"agentMessage","phase":"commentary","text":"still working"},
            {"type":"commandExecution","text":"private tool output"},
            {"type":"agentMessage","phase":"final_answer","text":"Đã sửa xong."}
        ]}
    ]}});
    assert_eq!(from_thread(&value, "current").unwrap().text, "Đã sửa xong.");
    assert!(from_thread(&value, "missing").is_none());
    value["thread"]["turns"][1]["status"] = json!("inProgress");
    assert!(from_thread(&value, "current").is_none());
    value["thread"]["turns"][1]["status"] = json!("completed");
    value["thread"]["turns"][1]["items"][2]["phase"] = json!(null);
    assert_eq!(from_thread(&value, "current").unwrap().text, "Đã sửa xong.");
    value["thread"]["turns"][1]["items"][2]["phase"] = json!("commentary");
    assert!(from_thread(&value, "current").is_none());
}

#[tokio::test]
async fn result_survives_restart_while_feed_and_lock_screen_obey_their_boundaries() {
    let temp = tempfile::tempdir().unwrap();
    let path = temp.path().join("result.sqlite3");
    let pool = database::connect(&path).await.unwrap();
    let store = ActivityStore::new(pool.clone());
    let event = store.ingest(&completed()).await.unwrap().unwrap();
    let feed = serde_json::to_string(&store.list_events(None, 20).await.unwrap()).unwrap();
    assert!(feed.contains("Đã sửa bộ lọc."));
    assert!(!feed.contains("Kiểm thử đã qua"));
    let preview = NotificationStore::new(pool.clone())
        .preview()
        .await
        .unwrap();
    assert!(preview.standard.body.contains("Đã sửa bộ lọc."));
    assert!(!preview.private.body.contains("bộ lọc"));
    assert!(!preview.project.body.contains("bộ lọc"));
    pool.close().await;
    let pool = database::connect(&path).await.unwrap();
    let result = ActivityStore::new(pool)
        .event_detail(&event.id)
        .await
        .unwrap()
        .unwrap()
        .result
        .unwrap();
    assert!(result.text.contains("Kiểm thử đã qua"));
    assert!(!result.truncated);
}

#[tokio::test]
async fn late_result_enriches_the_same_read_event_and_duplicate_never_overwrites_it() {
    let temp = tempfile::tempdir().unwrap();
    let pool = database::connect(&temp.path().join("late.sqlite3"))
        .await
        .unwrap();
    let store = ActivityStore::new(pool.clone());
    let mut initial = completed();
    initial.result = None;
    let event = store.ingest(&initial).await.unwrap().unwrap();
    store.mark_read(&event.id).await.unwrap();
    let update = store.ingest(&completed()).await.unwrap().unwrap();
    assert_eq!(update.id, event.id);
    assert!(update.is_read);
    assert!(update.result_excerpt.is_some());
    let mut duplicate = completed();
    duplicate.result = CodexResult::from_text("Must not replace the recorded result");
    assert!(store.ingest(&duplicate).await.unwrap().is_none());
    assert_eq!(store.snapshot().await.unwrap().events.len(), 1);
    assert_eq!(store.unread_count().await.unwrap(), 0);
    assert!(
        store
            .event_detail(&event.id)
            .await
            .unwrap()
            .unwrap()
            .result
            .unwrap()
            .text
            .starts_with("Đã sửa")
    );
}

#[tokio::test]
async fn final_failed_event_gets_answer_but_progress_does_not_store_it() {
    let temp = tempfile::tempdir().unwrap();
    let pool = database::connect(&temp.path().join("failed.sqlite3"))
        .await
        .unwrap();
    let store = ActivityStore::new(pool);
    let mut event = completed();
    event.signal = CodexSignal::Started;
    let start = store.ingest(&event).await.unwrap().unwrap();
    assert!(start.result_excerpt.is_none());
    assert!(
        store
            .event_detail(&start.id)
            .await
            .unwrap()
            .unwrap()
            .result
            .is_none()
    );
    event.signal = CodexSignal::TestFailed;
    event.occurred_at = Utc::now();
    store.ingest(&event).await.unwrap();
    event.signal = CodexSignal::Stopped;
    let failed = store.ingest(&event).await.unwrap().unwrap();
    assert!(failed.result_excerpt.is_none());
    event.signal = CodexSignal::Completed;
    let enriched = store.ingest(&event).await.unwrap().unwrap();
    assert_eq!(failed.id, enriched.id);
    assert_eq!(enriched.event_type, "codex.test.failed");
    assert!(
        store
            .event_detail(&failed.id)
            .await
            .unwrap()
            .unwrap()
            .result
            .is_some()
    );
}
