use super::{
    PersonalRules, PersonalStore, reminders,
    tests::{fixture, signal},
};
use crate::features::{codex_attention::CodexSignal, notifications::NotificationStore};
use chrono::{Duration, Utc};

#[tokio::test]
async fn actual_reminder_uses_the_current_profile_and_current_privacy_on_retry() {
    let (_temp, pool, activity) = fixture().await;
    let at = Utc::now() - Duration::minutes(6);
    activity
        .ingest(&signal("waiting-copy", CodexSignal::PermissionRequired, at))
        .await
        .unwrap();
    reminders::enqueue_due(&pool, Utc::now()).await.unwrap();
    sqlx::query("UPDATE notification_jobs SET state='accepted' WHERE is_waiting_reminder=0")
        .execute(&pool)
        .await
        .unwrap();
    let personal = PersonalStore::new(pool.clone());
    let mut profile = personal.projects().await.unwrap().remove(0);
    profile.display_name = "Mèo canh việc".into();
    personal.save_project(&profile).await.unwrap();
    sqlx::query("UPDATE preferences SET privacy_mode='project'")
        .execute(&pool)
        .await
        .unwrap();
    let notifications = NotificationStore::new(pool.clone());
    let job = notifications.claim_due().await.unwrap().unwrap();
    assert_eq!(job.title, "Codex vẫn đang chờ bạn");
    assert_eq!(job.body, "Mèo canh việc");
    notifications
        .finish(&job, "retry", Some(503))
        .await
        .unwrap();
    sqlx::query("UPDATE preferences SET privacy_mode='private'")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("UPDATE notification_jobs SET next_attempt_at=? WHERE is_waiting_reminder=1")
        .bind(Utc::now())
        .execute(&pool)
        .await
        .unwrap();
    let retry = notifications.claim_due().await.unwrap().unwrap();
    assert!(!retry.body.contains("Mèo"));
    assert!(!retry.body.contains("vibeping"));
}

#[tokio::test]
async fn raising_the_duration_threshold_cancels_an_already_queued_short_completion() {
    let (_temp, pool, activity) = fixture().await;
    let personal = PersonalStore::new(pool.clone());
    personal
        .save_rules(&PersonalRules {
            completion_min_minutes: 0,
            waiting_reminder_minutes: 5,
        })
        .await
        .unwrap();
    let at = Utc::now() - Duration::minutes(5);
    activity
        .ingest(&signal("short-pending", CodexSignal::Started, at))
        .await
        .unwrap();
    activity
        .ingest(&signal(
            "short-pending",
            CodexSignal::Completed,
            at + Duration::seconds(30),
        ))
        .await
        .unwrap();
    personal
        .save_rules(&PersonalRules {
            completion_min_minutes: 2,
            waiting_reminder_minutes: 5,
        })
        .await
        .unwrap();
    assert!(
        NotificationStore::new(pool.clone())
            .claim_due()
            .await
            .unwrap()
            .is_none()
    );
    let state: String = sqlx::query_scalar("SELECT state FROM notification_jobs")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(state, "expired");
    assert_eq!(
        activity.list_sessions(None, 20).await.unwrap().events.len(),
        1
    );
}
