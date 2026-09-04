use super::{PersonalRules, PersonalStore, delivery, reminders};
use crate::{
    features::{
        codex_attention::{ActivityStore, CodexIngress, CodexSignal},
        notifications::NotificationStore,
    },
    infrastructure::database,
};
use chrono::{Duration, Utc};
use sqlx::SqlitePool;

pub(super) async fn fixture() -> (tempfile::TempDir, SqlitePool, ActivityStore) {
    let temp = tempfile::tempdir().unwrap();
    let pool = database::connect(&temp.path().join("personal.sqlite3"))
        .await
        .unwrap();
    sqlx::raw_sql("INSERT INTO owner_identity VALUES (1, 'fixture', '2026-01-01');
        INSERT INTO mobile_devices VALUES ('device', 1, 'install', 'standalone', 'granted', '2026-01-01', '2026-01-01');
        INSERT INTO push_subscriptions(id,device_id,endpoint,p256dh,auth,created_at,updated_at) VALUES ('push','device','https://push.example.test/fixture','fixture','fixture','2026-01-01','2026-01-01');")
        .execute(&pool).await.unwrap();
    let activity = ActivityStore::new(pool.clone());
    (temp, pool, activity)
}
pub(super) fn signal(turn: &str, kind: CodexSignal, at: chrono::DateTime<Utc>) -> CodexIngress {
    CodexIngress {
        session_key: format!("session-{turn}"),
        turn_key: turn.into(),
        project_name: "vibeping".into(),
        task_label: None,
        result: None,
        signal: kind,
        occurred_at: at,
    }
}
async fn count(pool: &SqlitePool, where_clause: &'static str) -> i64 {
    sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM notification_jobs WHERE {where_clause}"
    )))
    .fetch_one(pool)
    .await
    .unwrap()
}

#[test]
fn completion_thresholds_include_the_boundary_and_unknown_starts() {
    let end = Utc::now();
    assert!(!delivery::completion_eligible(
        Some(end - Duration::seconds(119)),
        end,
        2
    ));
    assert!(delivery::completion_eligible(
        Some(end - Duration::seconds(120)),
        end,
        2
    ));
    assert!(!delivery::completion_eligible(
        Some(end - Duration::seconds(299)),
        end,
        5
    ));
    assert!(delivery::completion_eligible(Some(end), end, 0));
    assert!(delivery::completion_eligible(None, end, 5));
}

#[tokio::test]
async fn profiles_persist_validate_and_narrow_global_delivery() {
    let (_temp, pool, activity) = fixture().await;
    activity
        .ingest(&signal("profile", CodexSignal::Started, Utc::now()))
        .await
        .unwrap();
    let store = PersonalStore::new(pool.clone());
    let mut profile = store.projects().await.unwrap().remove(0);
    profile.display_name = "  Mèo canh việc  ".into();
    profile.icon = "heart".into();
    profile.accent = "blue".into();
    profile.notify_preview = false;
    profile.completion_min_minutes = Some(5);
    assert_eq!(
        store.save_project(&profile).await.unwrap().display_name,
        "Mèo canh việc"
    );
    sqlx::query("UPDATE preferences SET notify_completion = 0")
        .execute(&pool)
        .await
        .unwrap();
    let mut tx = pool.begin().await.unwrap();
    let (policy, rules) = delivery::policy_for(&mut tx, "vibeping").await.unwrap();
    assert!(!policy.notify_completion);
    assert!(!policy.notify_preview);
    assert_eq!(rules.completion_min_minutes, 5);
    assert_eq!(rules.waiting_reminder_minutes, 5);
    tx.commit().await.unwrap();
    profile.display_name = "C:\\private\\secret".into();
    assert!(store.save_project(&profile).await.is_err());
    assert!(
        store
            .save_rules(&PersonalRules {
                completion_min_minutes: 3,
                waiting_reminder_minutes: 5
            })
            .await
            .is_err()
    );
}

#[tokio::test]
async fn short_completions_remain_in_history_and_final_test_failures_still_notify() {
    let (_temp, pool, activity) = fixture().await;
    let at = Utc::now() - Duration::minutes(10);
    for (turn, seconds) in [("short", 119), ("long", 120)] {
        activity
            .ingest(&signal(turn, CodexSignal::Started, at))
            .await
            .unwrap();
        activity
            .ingest(&signal(
                turn,
                CodexSignal::Completed,
                at + Duration::seconds(seconds),
            ))
            .await
            .unwrap();
    }
    assert_eq!(count(&pool, "1=1").await, 1);
    assert_eq!(
        activity.list_sessions(None, 20).await.unwrap().events.len(),
        2
    );
    activity
        .ingest(&signal("fail", CodexSignal::Started, at))
        .await
        .unwrap();
    activity
        .ingest(&signal(
            "fail",
            CodexSignal::TestFailed,
            at + Duration::seconds(20),
        ))
        .await
        .unwrap();
    activity
        .ingest(&signal(
            "fail",
            CodexSignal::Completed,
            at + Duration::seconds(30),
        ))
        .await
        .unwrap();
    assert_eq!(count(&pool, "1=1").await, 2);
    let today = activity
        .daily_summary(at - Duration::hours(1), at + Duration::hours(1))
        .await
        .unwrap();
    assert_eq!(today.sessions, 3);
    assert_eq!(today.completed, 2);
    assert_eq!(today.failed_tests, 1);
    assert_eq!(today.observed_seconds, 120);
}

#[tokio::test]
async fn waiting_reminder_is_durable_once_and_cancelled_when_work_resumes() {
    let (_temp, pool, activity) = fixture().await;
    let at = Utc::now() - Duration::minutes(10);
    activity
        .ingest(&signal("wait", CodexSignal::PermissionRequired, at))
        .await
        .unwrap();
    reminders::enqueue_due(&pool, at + Duration::minutes(4))
        .await
        .unwrap();
    assert_eq!(count(&pool, "is_waiting_reminder=1").await, 0);
    reminders::enqueue_due(&pool, at + Duration::minutes(5))
        .await
        .unwrap();
    reminders::enqueue_due(&pool, Utc::now()).await.unwrap();
    assert_eq!(count(&pool, "is_waiting_reminder=1").await, 1);
    assert_eq!(count(&pool, "is_waiting_reminder=0").await, 1);
    sqlx::query("UPDATE notification_jobs SET state='accepted' WHERE is_waiting_reminder=0")
        .execute(&pool)
        .await
        .unwrap();
    activity
        .ingest(&signal(
            "wait",
            CodexSignal::Progressed,
            at + Duration::minutes(6),
        ))
        .await
        .unwrap();
    assert!(
        NotificationStore::new(pool.clone())
            .claim_due()
            .await
            .unwrap()
            .is_none()
    );
    assert_eq!(
        count(&pool, "is_waiting_reminder=1 AND state='expired'").await,
        1
    );
    activity
        .ingest(&signal(
            "wait",
            CodexSignal::PermissionRequired,
            at + Duration::minutes(7),
        ))
        .await
        .unwrap();
    reminders::enqueue_due(&pool, at + Duration::minutes(20))
        .await
        .unwrap();
    assert_eq!(count(&pool, "is_waiting_reminder=1").await, 1);
}

#[tokio::test]
async fn pending_delivery_rechecks_new_rules_and_quiet_hours() {
    let (_temp, pool, activity) = fixture().await;
    let at = Utc::now() - Duration::minutes(20);
    activity
        .ingest(&signal("wait", CodexSignal::PermissionRequired, at))
        .await
        .unwrap();
    reminders::enqueue_due(&pool, Utc::now()).await.unwrap();
    sqlx::query("UPDATE notification_jobs SET state='accepted' WHERE is_waiting_reminder=0")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("UPDATE personal_rules SET waiting_reminder_minutes=0")
        .execute(&pool)
        .await
        .unwrap();
    assert!(
        NotificationStore::new(pool.clone())
            .claim_due()
            .await
            .unwrap()
            .is_none()
    );
    assert_eq!(
        count(&pool, "is_waiting_reminder=1 AND state='expired'").await,
        1
    );
    sqlx::query("UPDATE preferences SET quiet_hours_enabled=1,quiet_start_minutes=0,quiet_end_minutes=1439,quiet_allow_urgent=0,timezone_offset_minutes=0").execute(&pool).await.unwrap();
    let mut tx = pool.begin().await.unwrap();
    let (policy, _) = delivery::policy_for(&mut tx, "vibeping").await.unwrap();
    let noon = chrono::DateTime::parse_from_rfc3339("2026-09-04T12:00:00Z")
        .unwrap()
        .with_timezone(&Utc);
    assert!(
        policy
            .scheduled_at("codex.attention.permission_required", noon)
            .unwrap()
            > noon
    );
}

#[tokio::test]
async fn project_history_filters_before_pagination() {
    let (_temp, _pool, activity) = fixture().await;
    for (turn, project) in [("a", "vibeping"), ("b", "other"), ("c", "vibeping")] {
        let mut value = signal(turn, CodexSignal::Started, Utc::now());
        value.project_name = project.into();
        activity.ingest(&value).await.unwrap();
    }
    let first = activity
        .list_sessions_for_project(None, 1, Some("vibeping"))
        .await
        .unwrap();
    let second = activity
        .list_sessions_for_project(first.next_cursor.as_deref(), 1, Some("vibeping"))
        .await
        .unwrap();
    assert_eq!(first.events.len(), 1);
    assert_eq!(second.events.len(), 1);
    assert_ne!(first.events[0].id, second.events[0].id);
    assert!(second.next_cursor.is_none());
    assert_eq!(second.events[0].project_name, "vibeping");
}
