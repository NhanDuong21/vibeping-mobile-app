use super::delivery;
use anyhow::Result;
use chrono::{DateTime, Duration, Utc};
use sqlx::SqlitePool;
use uuid::Uuid;

/// Exactly one durable reminder per turn and subscription, including after a host restart.
pub async fn enqueue_due(pool: &SqlitePool, now: DateTime<Utc>) -> Result<()> {
    let mut transaction = pool.begin().await?;
    let waiting: Vec<(String, String, String, DateTime<Utc>)> = sqlx::query_as(
        "SELECT t.turn_key, t.project_name, e.id, MAX(s.occurred_at) FROM codex_turns t \
        JOIN activity_events e ON e.turn_key = t.turn_key AND e.event_type = 'codex.attention.permission_required' \
        JOIN work_session_stages s ON s.turn_key = t.turn_key AND s.event_type = 'codex.attention.permission_required' \
        WHERE t.state = 'waiting' GROUP BY t.turn_key, t.project_name, e.id"
    ).fetch_all(&mut *transaction).await?;
    for (turn, project, event, since) in waiting {
        let (policy, rules) = delivery::policy_for(&mut transaction, &project).await?;
        if rules.waiting_reminder_minutes == 0
            || now < since + Duration::minutes(i64::from(rules.waiting_reminder_minutes))
        {
            continue;
        }
        let Some(due) = policy.scheduled_at("codex.attention.permission_required", now) else {
            continue;
        };
        let subscriptions: Vec<String> = sqlx::query_scalar("SELECT p.id FROM push_subscriptions p JOIN mobile_devices d ON d.id = p.device_id WHERE p.disabled_at IS NULL AND d.owner_id = 1")
            .fetch_all(&mut *transaction).await?;
        for subscription in subscriptions {
            sqlx::query("INSERT OR IGNORE INTO notification_jobs (id, subscription_id, dedupe_key, kind, title, body, target_url, tag, state, attempt_count, next_attempt_at, expires_at, created_at, event_id, is_waiting_reminder) \
            VALUES (?, ?, ?, 'activity', 'Codex vẫn đang chờ bạn', 'Bạn có một công việc đang chờ.', ?, 'vibeping-waiting-reminder', 'pending', 0, ?, ?, ?, ?, 1)")
                .bind(Uuid::new_v4().to_string()).bind(subscription).bind(format!("{turn}:waiting-reminder"))
                .bind(format!("/activity/events/{event}")).bind(due).bind(due + Duration::hours(2)).bind(now).bind(&event)
                .execute(&mut *transaction).await?;
        }
    }
    transaction.commit().await?;
    Ok(())
}
