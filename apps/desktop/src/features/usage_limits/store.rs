use anyhow::{Context, Result};
use chrono::{Duration, Utc};
use sqlx::{Sqlite, SqlitePool, Transaction};
use uuid::Uuid;

use crate::features::codex_attention::ActivityEvent;

use super::model::{NormalizedLimits, NormalizedWindow, UsageLimitWindow, UsageLimitsSnapshot};

#[derive(Clone)]
pub struct UsageLimitStore {
    pool: SqlitePool,
}

pub struct SaveOutcome {
    pub snapshot: UsageLimitsSnapshot,
    pub activities: Vec<ActivityEvent>,
}

impl UsageLimitStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn save(&self, limits: &NormalizedLimits) -> Result<SaveOutcome> {
        let mut transaction = self.pool.begin().await.context("Không mở được hạn mức")?;
        sqlx::query("DELETE FROM usage_limit_windows")
            .execute(&mut *transaction)
            .await
            .context("Không làm mới được hạn mức")?;
        let mut activities = Vec::new();
        for window in &limits.windows {
            insert_window(&mut transaction, limits, window).await?;
            if let Some(event) = create_alert(&mut transaction, window, limits.read_at).await? {
                activities.push(event);
            }
        }
        sqlx::query(
            "INSERT INTO usage_limit_status \
             (id, state, last_success_at, last_attempt_at, last_error_code) \
             VALUES (1, ?, ?, ?, NULL) ON CONFLICT(id) DO UPDATE SET \
             state = excluded.state, last_success_at = excluded.last_success_at, \
             last_attempt_at = excluded.last_attempt_at, last_error_code = NULL",
        )
        .bind(if limits.windows.is_empty() {
            "no_windows"
        } else {
            "available"
        })
        .bind(limits.read_at)
        .bind(limits.read_at)
        .execute(&mut *transaction)
        .await
        .context("Không lưu được trạng thái hạn mức")?;
        transaction
            .commit()
            .await
            .context("Không chốt được hạn mức")?;
        Ok(SaveOutcome {
            snapshot: self.snapshot().await?,
            activities,
        })
    }

    pub async fn mark_failure(&self, code: &'static str) -> Result<()> {
        let last_success: Option<chrono::DateTime<Utc>> =
            sqlx::query_scalar("SELECT last_success_at FROM usage_limit_status WHERE id = 1")
                .fetch_optional(&self.pool)
                .await
                .context("Không đọc được trạng thái hạn mức")?
                .flatten();
        let state = if last_success.is_some() {
            "stale"
        } else {
            "unavailable"
        };
        sqlx::query(
            "INSERT INTO usage_limit_status \
             (id, state, last_success_at, last_attempt_at, last_error_code) \
             VALUES (1, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET \
             state = excluded.state, last_attempt_at = excluded.last_attempt_at, \
             last_error_code = excluded.last_error_code",
        )
        .bind(state)
        .bind(last_success)
        .bind(Utc::now())
        .bind(code)
        .execute(&self.pool)
        .await
        .context("Không lưu được lỗi hạn mức")?;
        Ok(())
    }

    pub async fn snapshot(&self) -> Result<UsageLimitsSnapshot> {
        let status: Option<(String, Option<chrono::DateTime<Utc>>)> =
            sqlx::query_as("SELECT state, last_success_at FROM usage_limit_status WHERE id = 1")
                .fetch_optional(&self.pool)
                .await
                .context("Không đọc được trạng thái hạn mức")?;
        let windows = sqlx::query_as::<_, UsageLimitWindow>(
            "SELECT window_key, label, window_kind, remaining_percent, duration_minutes, \
             resets_at, reached FROM usage_limit_windows ORDER BY duration_minutes, window_key",
        )
        .fetch_all(&self.pool)
        .await
        .context("Không đọc được các chu kỳ hạn mức")?;
        let (mut state, read_at) = status.unwrap_or(("unavailable".into(), None));
        if read_at.is_some_and(|read| Utc::now() - read > Duration::minutes(20)) {
            state = "stale".into();
        }
        Ok(UsageLimitsSnapshot {
            state: match state.as_str() {
                "no_windows" => "noWindows".into(),
                value => value.into(),
            },
            read_at,
            windows,
            cursor: Utc::now().timestamp_millis().to_string(),
        })
    }
}

async fn insert_window(
    transaction: &mut Transaction<'_, Sqlite>,
    limits: &NormalizedLimits,
    window: &NormalizedWindow,
) -> Result<()> {
    sqlx::query(
        "INSERT INTO usage_limit_windows \
         (window_key, label, window_kind, remaining_percent, duration_minutes, resets_at, reached, observed_at) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&window.window_key)
    .bind(&window.label)
    .bind(window.window_kind)
    .bind(window.remaining_percent)
    .bind(window.duration_minutes)
    .bind(window.resets_at)
    .bind(window.reached)
    .bind(limits.read_at)
    .execute(&mut **transaction)
    .await
    .context("Không lưu được chu kỳ hạn mức")?;
    Ok(())
}

async fn create_alert(
    transaction: &mut Transaction<'_, Sqlite>,
    window: &NormalizedWindow,
    occurred_at: chrono::DateTime<Utc>,
) -> Result<Option<ActivityEvent>> {
    let Some(stage) = alert_stage(window) else {
        return Ok(None);
    };
    let previous: Option<String> = sqlx::query_scalar(
        "SELECT highest_stage FROM usage_limit_alert_states WHERE window_key = ? AND resets_at = ?",
    )
    .bind(&window.window_key)
    .bind(window.resets_at)
    .fetch_optional(&mut **transaction)
    .await
    .context("Không đọc được cảnh báo hạn mức")?;
    if previous
        .as_deref()
        .is_some_and(|value| stage_rank(value) >= stage_rank(stage))
    {
        return Ok(None);
    }
    sqlx::query(
        "INSERT INTO usage_limit_alert_states (window_key, resets_at, highest_stage, updated_at) \
         VALUES (?, ?, ?, ?) ON CONFLICT(window_key, resets_at) DO UPDATE SET \
         highest_stage = excluded.highest_stage, updated_at = excluded.updated_at",
    )
    .bind(&window.window_key)
    .bind(window.resets_at)
    .bind(stage)
    .bind(occurred_at)
    .execute(&mut **transaction)
    .await
    .context("Không lưu được cảnh báo hạn mức")?;
    insert_alert_event(transaction, window, stage, occurred_at).await
}

fn alert_stage(window: &NormalizedWindow) -> Option<&'static str> {
    if window.reached || window.remaining_percent <= 0.0 {
        Some("exhausted")
    } else if window.remaining_percent <= 5.0 {
        Some("critical")
    } else if window.remaining_percent <= 20.0 {
        Some("low")
    } else {
        None
    }
}

fn stage_rank(stage: &str) -> u8 {
    match stage {
        "low" => 1,
        "critical" => 2,
        "exhausted" => 3,
        _ => 0,
    }
}

async fn insert_alert_event(
    transaction: &mut Transaction<'_, Sqlite>,
    window: &NormalizedWindow,
    stage: &str,
    occurred_at: chrono::DateTime<Utc>,
) -> Result<Option<ActivityEvent>> {
    let (event_type, title) = match stage {
        "low" => ("codex.allowance.low", "Hạn mức Codex sắp thấp"),
        "critical" => ("codex.allowance.critical", "Hạn mức Codex gần hết"),
        _ => ("codex.allowance.exhausted", "Codex đã chạm hạn mức"),
    };
    let id = Uuid::new_v4().to_string();
    let dedupe = format!("usage:{}:{}:{stage}", window.window_key, window.resets_at);
    let summary = format!("{} còn {:.0}%.", window.label, window.remaining_percent);
    let inserted = sqlx::query(
        "INSERT OR IGNORE INTO activity_events \
         (id, dedupe_key, event_type, title, summary, project_name, occurred_at, created_at) \
         VALUES (?, ?, ?, ?, ?, 'Codex', ?, ?)",
    )
    .bind(&id)
    .bind(&dedupe)
    .bind(event_type)
    .bind(title)
    .bind(&summary)
    .bind(occurred_at)
    .bind(Utc::now())
    .execute(&mut **transaction)
    .await
    .context("Không lưu được hoạt động hạn mức")?;
    if inserted.rows_affected() == 0 {
        return Ok(None);
    }
    enqueue_pushes(transaction, &id, &dedupe, event_type, title, stage).await?;
    Ok(Some(ActivityEvent {
        id,
        event_type: event_type.into(),
        title: title.into(),
        summary,
        project_name: "Codex".into(),
        occurred_at,
    }))
}

async fn enqueue_pushes(
    transaction: &mut Transaction<'_, Sqlite>,
    event_id: &str,
    dedupe: &str,
    event_type: &str,
    title: &str,
    stage: &str,
) -> Result<()> {
    let subscriptions: Vec<String> = sqlx::query_scalar(
        "SELECT p.id FROM push_subscriptions p JOIN mobile_devices d ON d.id = p.device_id \
         WHERE p.disabled_at IS NULL AND d.owner_id = 1",
    )
    .fetch_all(&mut **transaction)
    .await
    .context("Không đọc được thiết bị nhận")?;
    for subscription in subscriptions {
        sqlx::query(
            "INSERT OR IGNORE INTO notification_jobs \
             (id, subscription_id, dedupe_key, kind, title, body, target_url, tag, state, \
              attempt_count, next_attempt_at, expires_at, created_at, event_id) \
             VALUES (?, ?, ?, 'allowance', ?, 'Mở VibePing để xem chi tiết.', '/usage-limits', \
              ?, 'pending', 0, ?, ?, ?, ?)",
        )
        .bind(Uuid::new_v4().to_string())
        .bind(subscription)
        .bind(dedupe)
        .bind(title)
        .bind(format!("vibeping-{event_type}"))
        .bind(Utc::now())
        .bind(Utc::now() + Duration::hours(if stage == "exhausted" { 12 } else { 8 }))
        .bind(Utc::now())
        .bind(event_id)
        .execute(&mut **transaction)
        .await
        .context("Không xếp được thông báo hạn mức")?;
    }
    Ok(())
}
