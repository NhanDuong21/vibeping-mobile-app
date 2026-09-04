use super::{
    NotificationStore,
    tests::{fixture, registration},
};
use crate::{
    features::{
        codex_attention::{ActivityStore, CodexIngress, CodexSignal},
        preferences::PreferenceStore,
    },
    infrastructure::database,
};
use chrono::{Duration, Utc};

#[tokio::test]
async fn latest_real_activity_replaces_sample_and_task_survives_database_reopen() {
    let temp = tempfile::tempdir().unwrap();
    let path = temp.path().join("preview.sqlite3");
    let pool = database::connect(&path).await.unwrap();
    let store = NotificationStore::new(pool.clone());
    let sample = store.preview().await.unwrap();
    assert_eq!(sample.source, "sample");
    assert_eq!(
        sample.standard.body,
        "Hoàn thiện màn Hoạt động · vibeping-mobile-app"
    );
    let mut ingress = CodexIngress {
        session_key: "session".into(),
        turn_key: "turn".into(),
        project_name: "project".into(),
        task_label: Some("Sửa màn Cài đặt".into()),
        thread_identity: None,
        result: None,
        signal: CodexSignal::Started,
        occurred_at: Utc::now(),
    };
    ActivityStore::new(pool.clone())
        .ingest(&ingress)
        .await
        .unwrap();
    assert_eq!(store.preview().await.unwrap().source, "sample");
    pool.close().await;
    let pool = database::connect(&path).await.unwrap();
    ingress.signal = CodexSignal::Completed;
    ingress.task_label = None;
    ingress.occurred_at += Duration::seconds(1);
    let event = ActivityStore::new(pool.clone())
        .ingest(&ingress)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(event.summary, "Sửa màn Cài đặt");
    let preview = NotificationStore::new(pool).preview().await.unwrap();
    assert_eq!(preview.source, "activity");
    assert_eq!(preview.standard.body, "Sửa màn Cài đặt · project");
    assert_eq!(preview.project.body, "project");
    assert_eq!(preview.private.body, "Mở Codex trên laptop để xem kết quả.");
}

#[tokio::test]
async fn queued_and_retry_jobs_use_latest_privacy_and_match_preview() {
    let (_temp, store, pool) = fixture().await;
    sqlx::query("INSERT INTO owner_identity (id, tailscale_login, claimed_at) VALUES (1, 'owner@example.test', ?)")
        .bind(Utc::now()).execute(&pool).await.unwrap();
    store
        .register(&registration(uuid::Uuid::new_v4().to_string()), Some(1))
        .await
        .unwrap();
    let preferences = PreferenceStore::new(pool.clone());
    let mut prefs = preferences.get().await.unwrap();
    prefs.privacy_mode = "standard".into();
    preferences.save(&prefs).await.unwrap();
    let ingress = CodexIngress {
        session_key: "session".into(),
        turn_key: "turn".into(),
        project_name: "project".into(),
        task_label: Some("Sửa màn Cài đặt".into()),
        thread_identity: None,
        result: crate::features::codex_attention::CodexResult::from_text(
            "Đã sửa bộ lọc hoạt động.\nKiểm thử đã qua.",
        ),
        signal: CodexSignal::Completed,
        occurred_at: Utc::now(),
    };
    ActivityStore::new(pool.clone())
        .ingest(&ingress)
        .await
        .unwrap();
    let body: String = sqlx::query_scalar("SELECT body FROM notification_jobs LIMIT 1")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(body, "Đã sửa bộ lọc hoạt động. · project");
    for mode in ["private", "project", "standard"] {
        prefs.privacy_mode = mode.into();
        preferences.save(&prefs).await.unwrap();
        sqlx::query("UPDATE notification_jobs SET next_attempt_at = ?, lease_until = NULL")
            .bind(Utc::now())
            .execute(&pool)
            .await
            .unwrap();
        let job = store.claim_due().await.unwrap().unwrap();
        let preview = store.preview().await.unwrap();
        let expected = match mode {
            "private" => preview.private,
            "project" => preview.project,
            _ => preview.standard,
        };
        assert_eq!(
            (job.title.clone(), job.body.clone()),
            (expected.title, expected.body)
        );
        store.finish(&job, "retry", Some(503)).await.unwrap();
    }
    // If retention has removed the event, never send an old unrestricted body.
    sqlx::query(
        "UPDATE notification_jobs SET event_id = NULL, next_attempt_at = ?, lease_until = NULL",
    )
    .bind(Utc::now())
    .execute(&pool)
    .await
    .unwrap();
    assert_eq!(
        store.claim_due().await.unwrap().unwrap().body,
        "Mở VibePing để xem chi tiết."
    );
}

#[tokio::test]
async fn historical_and_damaged_context_does_not_leak_stored_output() {
    let (_temp, store, pool) = fixture().await;
    for context in [None, Some("not-json")] {
        sqlx::query("DELETE FROM activity_events")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("INSERT INTO activity_events (id, dedupe_key, event_type, title, summary, project_name, occurred_at, created_at, notification_context) VALUES ('old', 'old', 'codex.test.failed', 'Old title', 'raw output should not be reused', 'project', ?, ?, ?)")
            .bind(Utc::now()).bind(Utc::now()).bind(context).execute(&pool).await.unwrap();
        let preview = store.preview().await.unwrap();
        assert_eq!(preview.source, "activity");
        assert_eq!(preview.standard.title, "Kiểm thử mã nguồn chưa đạt");
        assert_eq!(
            preview.standard.body,
            "Lần kiểm thử Codex ghi nhận chưa đạt; xem lại trên laptop · project"
        );
    }
}
