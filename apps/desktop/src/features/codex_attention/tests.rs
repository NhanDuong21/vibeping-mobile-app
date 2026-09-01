use chrono::Utc;
use serde_json::json;
use tempfile::tempdir;

use crate::infrastructure::database;

use super::{ActivityStore, CodexIngress, CodexSignal, normalize};

fn ingress(turn: &str, signal: CodexSignal) -> CodexIngress {
    CodexIngress {
        session_key: "hashed-session".into(),
        turn_key: turn.into(),
        project_name: "vibeping".into(),
        signal,
        occurred_at: Utc::now(),
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
