use chrono::{Duration, Utc};
use sqlx::SqlitePool;

use super::{ActivityStore, CodexIngress, CodexResult, CodexSignal, ThreadIdentity};
use crate::{features::notifications::NotificationStore, infrastructure::database};

async fn fixture() -> (
    tempfile::TempDir,
    SqlitePool,
    ActivityStore,
    NotificationStore,
) {
    let temp = tempfile::tempdir().unwrap();
    let pool = database::connect(&temp.path().join("delivery.sqlite3"))
        .await
        .unwrap();
    sqlx::raw_sql("UPDATE personal_rules SET completion_min_minutes = 0;
        INSERT INTO owner_identity VALUES (1, 'fixture', '2026-01-01');
        INSERT INTO mobile_devices VALUES ('device', 1, 'install', 'standalone', 'granted', '2026-01-01', '2026-01-01');
        INSERT INTO push_subscriptions(id,device_id,endpoint,p256dh,auth,created_at,updated_at)
        VALUES ('push','device','https://push.example.test/fixture','fixture','fixture','2026-01-01','2026-01-01');")
        .execute(&pool).await.unwrap();
    (
        temp,
        pool.clone(),
        ActivityStore::new(pool.clone()),
        NotificationStore::new(pool),
    )
}

fn signal(thread: &str, kind: CodexSignal, root: Option<&str>) -> CodexIngress {
    CodexIngress {
        session_key: thread.into(),
        turn_key: format!("turn-{thread}"),
        project_name: "sample".into(),
        task_label: None,
        thread_identity: root.map(|root| ThreadIdentity {
            root_key: root.into(),
            title: None,
        }),
        result: (kind == CodexSignal::Completed)
            .then(|| CodexResult::from_text("Kết quả đầy đủ đã được lưu.").unwrap()),
        signal: kind,
        occurred_at: Utc::now(),
    }
}

async fn state(pool: &SqlitePool) -> String {
    sqlx::query_scalar("SELECT state FROM notification_jobs")
        .fetch_one(pool)
        .await
        .unwrap()
}

async fn make_due(pool: &SqlitePool) {
    sqlx::query("UPDATE notification_jobs SET next_attempt_at = ?, lease_until = NULL")
        .bind(Utc::now())
        .execute(pool)
        .await
        .unwrap();
}

async fn remember(store: &ActivityStore, source: &str, root: &str) {
    store
        .remember_identities(&[(
            source.into(),
            ThreadIdentity {
                root_key: root.into(),
                title: None,
            },
        )])
        .await
        .unwrap();
}

#[tokio::test]
async fn child_answers_stay_readable_without_push_while_main_keeps_working() {
    let (_temp, pool, activity, notifications) = fixture().await;
    activity
        .ingest(&signal("main", CodexSignal::Started, Some("main")))
        .await
        .unwrap();
    for child in ["child", "nested-child"] {
        let value = signal(child, CodexSignal::Completed, Some("main"));
        let event = activity.ingest(&value).await.unwrap().unwrap();
        assert!(activity.ingest(&value).await.unwrap().is_none());
        let detail = activity.event_detail(&event.id).await.unwrap().unwrap();
        assert_eq!(
            detail.result.as_ref().map(|result| result.text.as_str()),
            Some("Kết quả đầy đủ đã được lưu.")
        );
    }
    assert_eq!(
        activity.current_work().await.unwrap().unwrap().state,
        "running"
    );
    let jobs: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM notification_jobs")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(jobs, 0);
    assert!(notifications.claim_due().await.unwrap().is_none());
    let final_answer = signal("main", CodexSignal::Completed, None);
    activity.ingest(&final_answer).await.unwrap();
    activity.ingest(&final_answer).await.unwrap();
    let job = notifications.claim_due().await.unwrap().unwrap();
    notifications
        .finish(&job, "accepted", Some(201))
        .await
        .unwrap();
    assert!(notifications.claim_due().await.unwrap().is_none());
    assert_eq!(state(&pool).await, "accepted");
}

#[tokio::test]
async fn unknown_source_waits_without_delivery_attempt_then_child_is_cancelled() {
    let (temp, pool, activity, notifications) = fixture().await;
    activity
        .ingest(&signal("unknown", CodexSignal::Completed, None))
        .await
        .unwrap();
    assert!(notifications.claim_due().await.unwrap().is_none());
    assert_eq!(state(&pool).await, "pending");
    let (attempts, deferred): (i64, bool) =
        sqlx::query_as("SELECT attempt_count, next_attempt_at > ? FROM notification_jobs")
            .bind(Utc::now())
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(attempts, 0);
    assert!(deferred);
    remember(&activity, "unknown", "main").await;
    // Restart/reopen retains the evidence and rechecks the old queued job.
    pool.close().await;
    let reopened = database::connect(&temp.path().join("delivery.sqlite3"))
        .await
        .unwrap();
    make_due(&reopened).await;
    assert!(
        NotificationStore::new(reopened.clone())
            .claim_due()
            .await
            .unwrap()
            .is_none()
    );
    assert_eq!(state(&reopened).await, "expired");
}

#[tokio::test]
async fn late_main_identity_releases_one_completion_even_without_observed_start() {
    let (_temp, pool, activity, notifications) = fixture().await;
    let value = signal("main", CodexSignal::Completed, None);
    activity.ingest(&value).await.unwrap();
    assert!(notifications.claim_due().await.unwrap().is_none());
    remember(&activity, "main", "main").await;
    make_due(&pool).await;
    let job = notifications.claim_due().await.unwrap().unwrap();
    notifications
        .finish(&job, "accepted", Some(201))
        .await
        .unwrap();
    activity.ingest(&value).await.unwrap();
    assert!(notifications.claim_due().await.unwrap().is_none());
    assert_eq!(state(&pool).await, "accepted");
}

#[tokio::test]
async fn retry_and_recovered_lease_recheck_new_child_metadata() {
    for old_state in ["retry", "leased", "pending"] {
        let (_temp, pool, activity, notifications) = fixture().await;
        activity
            .ingest(&signal("child", CodexSignal::Completed, None))
            .await
            .unwrap();
        sqlx::query("UPDATE notification_jobs SET state = ?, lease_until = ?")
            .bind(old_state)
            .bind(Utc::now() - Duration::seconds(1))
            .execute(&pool)
            .await
            .unwrap();
        remember(&activity, "child", "main").await;
        assert!(notifications.claim_due().await.unwrap().is_none());
        assert_eq!(state(&pool).await, "expired");
        let attempts: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM notification_attempts")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(attempts, 0);
    }
}

#[tokio::test]
async fn unresolved_expired_completion_is_not_deferred_forever() {
    let (_temp, pool, activity, notifications) = fixture().await;
    activity
        .ingest(&signal("unknown", CodexSignal::Completed, None))
        .await
        .unwrap();
    sqlx::query("UPDATE notification_jobs SET expires_at = ?")
        .bind(Utc::now() - Duration::seconds(1))
        .execute(&pool)
        .await
        .unwrap();
    assert!(notifications.claim_due().await.unwrap().is_none());
    assert_eq!(state(&pool).await, "expired");
}

#[tokio::test]
async fn child_final_failure_is_silent_but_permission_still_requests_attention() {
    let (_temp, pool, activity, notifications) = fixture().await;
    for kind in [
        CodexSignal::TestFailed,
        CodexSignal::Stopped,
        CodexSignal::Completed,
    ] {
        activity
            .ingest(&signal("child", kind, Some("main")))
            .await
            .unwrap();
    }
    assert!(notifications.claim_due().await.unwrap().is_none());
    let events = activity.snapshot().await.unwrap().events;
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].event_type, "codex.test.failed");
    let attention = activity
        .ingest(&signal(
            "other-child",
            CodexSignal::PermissionRequired,
            Some("main"),
        ))
        .await
        .unwrap()
        .unwrap();
    let job = notifications.claim_due().await.unwrap().unwrap();
    assert!(job.target_url.ends_with(&attention.id));
    assert_eq!(state(&pool).await, "leased");
}
