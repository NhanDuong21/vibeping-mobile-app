use chrono::Utc;
use tempfile::tempdir;

use crate::{
    features::codex_attention::{ActivityStore, CodexIngress, CodexSignal},
    infrastructure::database,
};

use super::ComputerStore;

#[tokio::test]
async fn status_and_diagnostics_expose_only_stable_sanitized_facts() {
    let temp = tempdir().unwrap();
    let private_dir = temp.path().join("private@example.test");
    std::fs::create_dir(&private_dir).unwrap();
    let pool = database::connect(&private_dir.join("diagnostics.sqlite3"))
        .await
        .unwrap();
    let store = ComputerStore::new(pool, private_dir.clone());
    let status = store.status(true, Utc::now()).await.unwrap();
    assert_eq!(status.desktop, "running");
    assert_eq!(status.private_connection, "ready");
    assert_eq!(status.notifications, "needsAttention");

    let report = store.diagnostics(&status).await.unwrap();
    assert!(report.checks.iter().any(|item| item.key == "database"));
    assert!(report.checks.iter().any(|item| item.action.is_some()));
    for secret in [
        "private@example.test",
        "Bearer",
        "token",
        "diagnostics.sqlite3",
    ] {
        assert!(!report.technical_report.contains(secret));
    }
    assert!(
        !report
            .technical_report
            .contains(&private_dir.display().to_string())
    );
}

#[tokio::test]
async fn configured_codex_stays_in_review_until_a_real_hook_signal_arrives() {
    let temp = tempdir().unwrap();
    let data_dir = temp.path().join("data");
    std::fs::create_dir(&data_dir).unwrap();
    std::fs::write(data_dir.join("codex-integration.json"), "{}").unwrap();
    let pool = database::connect(&data_dir.join("status.sqlite3"))
        .await
        .unwrap();
    let store = ComputerStore::new(pool.clone(), data_dir);
    assert_eq!(
        store.status(true, Utc::now()).await.unwrap().codex,
        "needsReview"
    );

    ActivityStore::new(pool)
        .ingest(&CodexIngress {
            session_key: "session".into(),
            turn_key: "turn".into(),
            project_name: "project".into(),
            task_label: None,
            result: None,
            signal: CodexSignal::Progressed,
            occurred_at: Utc::now(),
        })
        .await
        .unwrap();
    assert_ne!(
        store.status(true, Utc::now()).await.unwrap().codex,
        "needsReview"
    );
}
