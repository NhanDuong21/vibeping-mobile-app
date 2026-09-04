use chrono::{DateTime, Duration, Utc};
use serde_json::json;
use tempfile::TempDir;

use super::{ActivityStore, CodexIngress, CodexSignal, normalize};
use crate::infrastructure::database;

async fn setup() -> (TempDir, ActivityStore) {
    let temp = tempfile::tempdir().unwrap();
    let pool = database::connect(&temp.path().join("turns.sqlite3"))
        .await
        .unwrap();
    (temp, ActivityStore::new(pool))
}

fn signal(turn: &str, kind: CodexSignal, at: DateTime<Utc>) -> CodexIngress {
    CodexIngress {
        session_key: "parent-session".into(),
        turn_key: turn.into(),
        project_name: "VibePing".into(),
        signal: kind,
        occurred_at: at,
    }
}

#[tokio::test]
async fn tool_only_child_turns_never_become_foreground_work() {
    let (_temp, store) = setup().await;
    let now = Utc::now();
    for kind in [
        CodexSignal::Progressed,
        CodexSignal::TestPassed,
        CodexSignal::TestFailed,
        CodexSignal::PreviewReady,
        CodexSignal::PermissionRequired,
    ] {
        store.ingest(&signal("child", kind, now)).await.unwrap();
        assert!(store.current_work().await.unwrap().is_none());
        assert!(store.snapshot().await.unwrap().current_work.is_none());
    }
    store
        .ingest(&signal("parent", CodexSignal::Started, now))
        .await
        .unwrap();
    store
        .ingest(&signal(
            "child",
            CodexSignal::Progressed,
            now + Duration::seconds(1),
        ))
        .await
        .unwrap();
    assert_eq!(store.current_work().await.unwrap().unwrap().started_at, now);
    store
        .ingest(&signal(
            "parent",
            CodexSignal::Completed,
            now + Duration::seconds(2),
        ))
        .await
        .unwrap();
    assert!(store.current_work().await.unwrap().is_none());
}

#[tokio::test]
async fn terminal_turns_cannot_be_reopened_by_late_or_duplicate_hooks() {
    let (_temp, store) = setup().await;
    let now = Utc::now();
    for terminal in [CodexSignal::Stopped, CodexSignal::Completed] {
        let turn = format!("{terminal:?}");
        store
            .ingest(&signal(&turn, CodexSignal::Started, now))
            .await
            .unwrap();
        store
            .ingest(&signal(&turn, terminal, now + Duration::seconds(1)))
            .await
            .unwrap();
        let count = store.snapshot().await.unwrap().events.len();
        for kind in [
            CodexSignal::Started,
            CodexSignal::Progressed,
            CodexSignal::PermissionRequired,
            CodexSignal::TestFailed,
            CodexSignal::TestPassed,
            CodexSignal::PreviewReady,
        ] {
            assert!(
                store
                    .ingest(&signal(&turn, kind, now + Duration::seconds(2)))
                    .await
                    .unwrap()
                    .is_none()
            );
            assert!(store.current_work().await.unwrap().is_none());
        }
        assert_eq!(store.snapshot().await.unwrap().events.len(), count);
    }
}

#[tokio::test]
async fn older_spooled_progress_cannot_undo_waiting_or_final_state() {
    let (_temp, store) = setup().await;
    let now = Utc::now();
    store
        .ingest(&signal("turn", CodexSignal::Started, now))
        .await
        .unwrap();
    store
        .ingest(&signal(
            "turn",
            CodexSignal::PermissionRequired,
            now + Duration::seconds(10),
        ))
        .await
        .unwrap();
    store
        .ingest(&signal(
            "turn",
            CodexSignal::TestFailed,
            now + Duration::seconds(5),
        ))
        .await
        .unwrap();
    let work = store.current_work().await.unwrap().unwrap();
    assert_eq!(work.state, "waiting");
    assert_eq!(work.last_test_state, "unknown");
    assert_eq!(work.updated_at, now + Duration::seconds(10));
    // A late-delivered ending still closes the turn, without moving its clock backwards.
    store
        .ingest(&signal(
            "turn",
            CodexSignal::Stopped,
            now + Duration::seconds(8),
        ))
        .await
        .unwrap();
    assert!(store.current_work().await.unwrap().is_none());
}

#[tokio::test]
async fn a_newer_prompt_supersedes_an_orphan_without_hiding_other_sessions() {
    let (_temp, store) = setup().await;
    let now = Utc::now();
    store
        .ingest(&signal("old", CodexSignal::Started, now))
        .await
        .unwrap();
    store
        .ingest(&signal(
            "new",
            CodexSignal::Started,
            now + Duration::seconds(1),
        ))
        .await
        .unwrap();
    store
        .ingest(&signal(
            "new",
            CodexSignal::Completed,
            now + Duration::seconds(2),
        ))
        .await
        .unwrap();
    assert!(store.current_work().await.unwrap().is_none());
    let mut separate = signal("separate", CodexSignal::Started, now);
    separate.session_key = "another-session".into();
    store.ingest(&separate).await.unwrap();
    assert!(store.current_work().await.unwrap().is_some());
    let state: String = sqlx::query_scalar("SELECT state FROM codex_turns WHERE turn_key = 'old'")
        .fetch_one(&store.pool)
        .await
        .unwrap();
    assert_eq!(state, "running", "projection must not invent a completion");
}

#[tokio::test]
async fn missing_stop_expires_to_unconfirmed_and_new_evidence_restores_it() {
    let (_temp, store) = setup().await;
    let now = Utc::now();
    store
        .ingest(&signal("turn", CodexSignal::Started, now))
        .await
        .unwrap();
    let fresh = store.current_work_at(now).await.unwrap().unwrap();
    assert_eq!(fresh.state, "running");
    let expired = store
        .current_work_at(fresh.fresh_until)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(expired.state, "unconfirmed");
    assert_eq!(store.snapshot().await.unwrap().events.len(), 1);
    store
        .ingest(&signal("turn", CodexSignal::Progressed, fresh.fresh_until))
        .await
        .unwrap();
    assert_eq!(
        store
            .current_work_at(fresh.fresh_until)
            .await
            .unwrap()
            .unwrap()
            .state,
        "running"
    );
}

#[tokio::test]
async fn observed_provenance_survives_retention_and_database_reopen() {
    let (temp, store) = setup().await;
    let now = Utc::now();
    store
        .ingest(&signal("turn", CodexSignal::Started, now))
        .await
        .unwrap();
    sqlx::query("DELETE FROM activity_events")
        .execute(&store.pool)
        .await
        .unwrap();
    store.pool.close().await;
    let reopened = ActivityStore::new(
        database::connect(&temp.path().join("turns.sqlite3"))
            .await
            .unwrap(),
    );
    assert_eq!(
        reopened
            .current_work_at(now + Duration::minutes(3))
            .await
            .unwrap()
            .unwrap()
            .state,
        "unconfirmed"
    );
}

#[test]
fn unidentified_hooks_are_ignored_and_interrupt_closes_only_its_own_turn() {
    for missing in ["session_id", "turn_id"] {
        for bad in [json!(null), json!(""), json!("  "), json!("bad\nidentity")] {
            let mut value = json!({"hook_event_name":"UserPromptSubmit", "session_id":"session", "turn_id":"turn"});
            value[missing] = bad;
            assert!(
                normalize("hook", value.to_string().as_bytes())
                    .unwrap()
                    .is_none()
            );
        }
    }
    let stop = json!({"hook_event_name":"Interrupt", "session_id":"session", "turn_id":"turn"});
    assert_eq!(
        normalize("hook", stop.to_string().as_bytes())
            .unwrap()
            .unwrap()
            .signal,
        CodexSignal::Stopped
    );
    let child_stop = json!({"hook_event_name":"SubagentStop", "session_id":"session", "turn_id":"turn", "agent_id":"child"});
    assert!(
        normalize("hook", child_stop.to_string().as_bytes())
            .unwrap()
            .is_none()
    );
}
