use chrono::{Duration, TimeZone, Utc};
use tempfile::tempdir;

use crate::features::codex_attention::{ActivityStore, CodexIngress, CodexSignal};
use crate::infrastructure::database;

use super::{PreferenceStore, policy};

#[tokio::test]
async fn preferences_validate_persist_and_apply_retention() {
    let temp = tempdir().unwrap();
    let pool = database::connect(&temp.path().join("preferences.sqlite3"))
        .await
        .unwrap();
    let store = PreferenceStore::new(pool.clone());
    let mut value = store.get().await.unwrap();
    assert_eq!(value.theme, "light");
    value.theme = "dark".into();
    value.retention_days = 7;
    value.allowance_threshold_percent = 25;
    let now = Utc::now();
    for (id, occurred_at) in [("old", now - Duration::days(8)), ("new", now)] {
        sqlx::query(
            "INSERT INTO activity_events (id, dedupe_key, event_type, title, summary, \
             project_name, occurred_at, created_at) VALUES (?, ?, 'codex.turn.started', \
             'Tín hiệu', 'Tóm tắt', 'VibePing', ?, ?)",
        )
        .bind(id)
        .bind(id)
        .bind(occurred_at)
        .bind(occurred_at)
        .execute(&pool)
        .await
        .unwrap();
    }
    let saved = store.save(&value).await.unwrap();
    assert_eq!(saved.theme, "dark");
    assert_eq!(saved.allowance_threshold_percent, 25);
    value.privacy_mode = "project".into();
    assert!(value.validate());
    let remaining: Vec<String> = sqlx::query_scalar("SELECT id FROM activity_events ORDER BY id")
        .fetch_all(&pool)
        .await
        .unwrap();
    assert_eq!(remaining, vec!["new"]);

    value.quiet_hours.start = "25:00".into();
    assert!(!value.validate());
    value.quiet_hours.start = value.quiet_hours.end.clone();
    value.quiet_hours.enabled = true;
    assert!(!value.validate());
    value.quiet_hours.enabled = false;
    value.allowance_threshold_percent = 27;
    assert!(!value.validate());
    value.allowance_threshold_percent = 20;
    value.retention_days = 365;
    assert!(!value.validate());
    value.retention_days = 30;
    value.privacy_mode = "unknown".into();
    assert!(!value.validate());
}

#[tokio::test]
async fn quiet_hours_cross_midnight_and_urgent_events_can_bypass() {
    let temp = tempdir().unwrap();
    let pool = database::connect(&temp.path().join("policy.sqlite3"))
        .await
        .unwrap();
    let mut transaction = pool.begin().await.unwrap();
    sqlx::query(
        "UPDATE preferences SET quiet_hours_enabled = 1, quiet_start_minutes = 1320, \
         quiet_end_minutes = 420, timezone_offset_minutes = 0, quiet_allow_urgent = 1",
    )
    .execute(&mut *transaction)
    .await
    .unwrap();
    let policy = policy::load(&mut transaction).await.unwrap();
    let at_2300 = Utc.with_ymd_and_hms(2026, 9, 2, 23, 0, 0).unwrap();
    let at_0800 = Utc.with_ymd_and_hms(2026, 9, 2, 8, 0, 0).unwrap();
    assert!(
        policy
            .scheduled_at("codex.turn.completed", at_2300)
            .unwrap()
            > at_2300
    );
    assert_eq!(
        policy.scheduled_at("codex.attention.permission_required", at_2300),
        Some(at_2300)
    );
    assert_eq!(
        policy.scheduled_at("codex.turn.completed", at_0800),
        Some(at_0800)
    );
    assert!(policy::inside_interval(23 * 60, 22 * 60, 7 * 60));
    assert!(policy::inside_interval(6 * 60, 22 * 60, 7 * 60));
    assert!(!policy::inside_interval(8 * 60, 22 * 60, 7 * 60));
}

#[tokio::test]
async fn notification_toggles_and_private_mode_change_real_delivery() {
    let temp = tempdir().unwrap();
    let pool = database::connect(&temp.path().join("delivery.sqlite3"))
        .await
        .unwrap();
    let preferences = PreferenceStore::new(pool.clone());
    seed_owned_subscription(&pool).await;

    let mut value = preferences.get().await.unwrap();
    value.notifications.completion = false;
    preferences.save(&value).await.unwrap();
    complete_turn(&pool, "disabled").await;
    let event_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM activity_events WHERE event_type = 'codex.turn.completed'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    let job_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM notification_jobs")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!((event_count, job_count), (1, 0));

    value.notifications.completion = true;
    value.privacy_mode = "private".into();
    preferences.save(&value).await.unwrap();
    complete_turn(&pool, "private").await;
    let body: String = sqlx::query_scalar("SELECT body FROM notification_jobs LIMIT 1")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(body, "Mở VibePing để xem chi tiết.");
    assert!(!body.contains("Dự án riêng"));

    value.privacy_mode = "project".into();
    preferences.save(&value).await.unwrap();
    complete_turn(&pool, "project").await;
    let project_body: String = sqlx::query_scalar(
        "SELECT body FROM notification_jobs WHERE dedupe_key = 'project:codex.turn.completed'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(project_body, "Dự án riêng · Mở VibePing để xem chi tiết.");
}

#[tokio::test]
async fn startup_retention_cleanup_removes_expired_activity() {
    let temp = tempdir().unwrap();
    let pool = database::connect(&temp.path().join("startup-retention.sqlite3"))
        .await
        .unwrap();
    let old = Utc::now() - Duration::days(31);
    sqlx::query(
        "INSERT INTO activity_events (id, dedupe_key, event_type, title, summary, project_name, \
         occurred_at, created_at) VALUES ('old', 'old', 'codex.turn.started', 'Cũ', 'Cũ', \
         'VibePing', ?, ?)",
    )
    .bind(old)
    .bind(old)
    .execute(&pool)
    .await
    .unwrap();
    let deleted = PreferenceStore::new(pool.clone())
        .cleanup_retention()
        .await
        .unwrap();
    assert_eq!(deleted, 1);
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM activity_events")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 0);
}

async fn seed_owned_subscription(pool: &sqlx::SqlitePool) {
    let now = Utc::now();
    sqlx::query("INSERT INTO owner_identity (id, tailscale_login, claimed_at) VALUES (1, 'owner@example.test', ?)")
        .bind(now)
        .execute(pool)
        .await
        .unwrap();
    sqlx::query("INSERT INTO mobile_devices (id, owner_id, installation_id, display_mode, notification_permission, created_at, last_seen_at) VALUES ('device', 1, 'phone', 'standalone', 'granted', ?, ?)")
        .bind(now)
        .bind(now)
        .execute(pool)
        .await
        .unwrap();
    sqlx::query("INSERT INTO push_subscriptions (id, device_id, endpoint, p256dh, auth, created_at, updated_at) VALUES ('subscription', 'device', 'https://push.example.test/device', 'key', 'auth', ?, ?)")
        .bind(now)
        .bind(now)
        .execute(pool)
        .await
        .unwrap();
}

async fn complete_turn(pool: &sqlx::SqlitePool, turn: &str) {
    let store = ActivityStore::new(pool.clone());
    for signal in [CodexSignal::Started, CodexSignal::Completed] {
        store
            .ingest(&CodexIngress {
                session_key: "session".into(),
                turn_key: turn.into(),
                project_name: "Dự án riêng".into(),
                signal,
                occurred_at: Utc::now(),
            })
            .await
            .unwrap();
    }
}
