use anyhow::{Context, Result};
use chrono::{Duration, Utc};
use sqlx::{Sqlite, SqlitePool, Transaction};
use uuid::Uuid;

use crate::features::preferences::policy::{self, DeliveryPolicy};

use super::model::{ActivityEvent, ActivitySnapshot, CodexIngress, CodexSignal, CurrentWork};

#[derive(Clone)]
pub struct ActivityStore {
    pub(super) pool: SqlitePool,
}

impl ActivityStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn ingest(&self, ingress: &CodexIngress) -> Result<Option<ActivityEvent>> {
        let mut transaction = self
            .pool
            .begin()
            .await
            .context("Không mở được sự kiện Codex")?;
        ensure_turn(&mut transaction, ingress).await?;
        let policy = policy::load(&mut transaction).await?;
        let event = match ingress.signal {
            CodexSignal::Started => event_for(ingress, "codex.turn.started"),
            CodexSignal::Progressed => {
                set_state(&mut transaction, ingress, "running").await?;
                None
            }
            CodexSignal::PermissionRequired => {
                set_state(&mut transaction, ingress, "waiting").await?;
                event_for(ingress, "codex.attention.permission_required")
            }
            CodexSignal::TestPassed => {
                set_test(&mut transaction, ingress, "passed").await?;
                None
            }
            CodexSignal::TestFailed => {
                set_test(&mut transaction, ingress, "failed").await?;
                None
            }
            CodexSignal::PreviewReady => {
                set_state(&mut transaction, ingress, "running").await?;
                event_for(ingress, "codex.preview.ready")
            }
            CodexSignal::Stopped | CodexSignal::Completed => {
                finish_turn(&mut transaction, ingress).await?
            }
        };
        let inserted = if let Some(event) = event {
            insert_event(&mut transaction, ingress, event, &policy).await?
        } else {
            None
        };
        transaction
            .commit()
            .await
            .context("Không chốt được sự kiện Codex")?;
        Ok(inserted)
    }

    pub async fn snapshot(&self) -> Result<ActivitySnapshot> {
        let current_work = sqlx::query_as::<_, CurrentWork>(
            "SELECT project_name, state, started_at, updated_at FROM codex_turns \
             WHERE state IN ('running', 'waiting') ORDER BY updated_at DESC LIMIT 1",
        )
        .fetch_optional(&self.pool)
        .await
        .context("Không đọc được công việc hiện tại")?;
        let events = sqlx::query_as::<_, ActivityEvent>(
            "SELECT id, event_type, title, summary, project_name, occurred_at, is_read \
             FROM activity_events ORDER BY occurred_at DESC, id DESC LIMIT 50",
        )
        .fetch_all(&self.pool)
        .await
        .context("Không đọc được hoạt động gần đây")?;
        Ok(ActivitySnapshot {
            current_work,
            events,
            cursor: Utc::now().timestamp_millis().to_string(),
        })
    }
}

async fn ensure_turn(
    transaction: &mut Transaction<'_, Sqlite>,
    value: &CodexIngress,
) -> Result<()> {
    sqlx::query(
        "INSERT INTO codex_turns (turn_key, session_key, project_name, state, started_at, updated_at) \
         VALUES (?, ?, ?, 'running', ?, ?) ON CONFLICT(turn_key) DO UPDATE SET \
         project_name = excluded.project_name, updated_at = excluded.updated_at",
    )
    .bind(&value.turn_key)
    .bind(&value.session_key)
    .bind(&value.project_name)
    .bind(value.occurred_at)
    .bind(value.occurred_at)
    .execute(&mut **transaction)
    .await
    .context("Không lưu được lượt Codex")?;
    Ok(())
}

async fn set_state(
    transaction: &mut Transaction<'_, Sqlite>,
    value: &CodexIngress,
    state: &str,
) -> Result<()> {
    sqlx::query("UPDATE codex_turns SET state = ?, updated_at = ? WHERE turn_key = ?")
        .bind(state)
        .bind(value.occurred_at)
        .bind(&value.turn_key)
        .execute(&mut **transaction)
        .await
        .context("Không cập nhật được trạng thái Codex")?;
    Ok(())
}

async fn set_test(
    transaction: &mut Transaction<'_, Sqlite>,
    value: &CodexIngress,
    state: &str,
) -> Result<()> {
    sqlx::query(
        "UPDATE codex_turns SET last_test_state = ?, state = 'running', updated_at = ? WHERE turn_key = ?",
    )
        .bind(state)
        .bind(value.occurred_at)
        .bind(&value.turn_key)
        .execute(&mut **transaction)
        .await
        .context("Không cập nhật được kết quả kiểm tra")?;
    Ok(())
}

async fn finish_turn(
    transaction: &mut Transaction<'_, Sqlite>,
    value: &CodexIngress,
) -> Result<Option<EventCopy>> {
    let test: String =
        sqlx::query_scalar("SELECT last_test_state FROM codex_turns WHERE turn_key = ?")
            .bind(&value.turn_key)
            .fetch_one(&mut **transaction)
            .await
            .context("Không đọc được kết quả cuối")?;
    let event_type = if test == "failed" {
        Some("codex.test.failed")
    } else if value.signal == CodexSignal::Completed {
        Some("codex.turn.completed")
    } else {
        None
    };
    let state = if test == "failed" {
        "failed"
    } else {
        "completed"
    };
    sqlx::query(
        "UPDATE codex_turns SET state = ?, updated_at = ?, completed_at = ? WHERE turn_key = ?",
    )
    .bind(state)
    .bind(value.occurred_at)
    .bind(value.occurred_at)
    .bind(&value.turn_key)
    .execute(&mut **transaction)
    .await
    .context("Không hoàn tất được lượt Codex")?;
    Ok(event_type.and_then(|kind| event_for(value, kind)))
}

#[derive(Clone, Copy)]
struct EventCopy {
    event_type: &'static str,
    title: &'static str,
    summary: &'static str,
    push: bool,
    ttl_hours: i64,
}

fn event_for(_value: &CodexIngress, event_type: &'static str) -> Option<EventCopy> {
    let event = match event_type {
        "codex.turn.started" => EventCopy {
            event_type,
            title: "Codex đã bắt đầu",
            summary: "Công việc mới đang được xử lý.",
            push: false,
            ttl_hours: 1,
        },
        "codex.attention.permission_required" => EventCopy {
            event_type,
            title: "Codex cần bạn xác nhận",
            summary: "Mở laptop để xem và quyết định.",
            push: true,
            ttl_hours: 2,
        },
        "codex.preview.ready" => EventCopy {
            event_type,
            title: "Bản xem trước đã sẵn sàng",
            summary: "Bạn có thể mở VibePing để kiểm tra.",
            push: true,
            ttl_hours: 4,
        },
        "codex.test.failed" => EventCopy {
            event_type,
            title: "Kiểm tra cuối chưa đạt",
            summary: "Codex đã dừng với một kiểm tra chưa đạt.",
            push: true,
            ttl_hours: 8,
        },
        "codex.turn.completed" => EventCopy {
            event_type,
            title: "Codex đã hoàn tất",
            summary: "Công việc đã hoàn tất trên laptop.",
            push: true,
            ttl_hours: 12,
        },
        _ => return None,
    };
    Some(event)
}

async fn insert_event(
    transaction: &mut Transaction<'_, Sqlite>,
    ingress: &CodexIngress,
    value: EventCopy,
    policy: &DeliveryPolicy,
) -> Result<Option<ActivityEvent>> {
    let id = Uuid::new_v4().to_string();
    let dedupe = format!("{}:{}", ingress.turn_key, value.event_type);
    let inserted = sqlx::query(
        "INSERT OR IGNORE INTO activity_events \
         (id, dedupe_key, event_type, title, summary, project_name, turn_key, occurred_at, created_at) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&dedupe)
    .bind(value.event_type)
    .bind(value.title)
    .bind(value.summary)
    .bind(&ingress.project_name)
    .bind(&ingress.turn_key)
    .bind(ingress.occurred_at)
    .bind(Utc::now())
    .execute(&mut **transaction)
    .await
    .context("Không lưu được hoạt động Codex")?;
    if inserted.rows_affected() == 0 {
        return Ok(None);
    }
    if value.push {
        enqueue_pushes(transaction, &id, &dedupe, ingress, value, policy).await?;
    }
    Ok(Some(ActivityEvent {
        id,
        event_type: value.event_type.into(),
        title: value.title.into(),
        summary: value.summary.into(),
        project_name: ingress.project_name.clone(),
        occurred_at: ingress.occurred_at,
        is_read: false,
    }))
}

async fn enqueue_pushes(
    transaction: &mut Transaction<'_, Sqlite>,
    event_id: &str,
    dedupe: &str,
    ingress: &CodexIngress,
    value: EventCopy,
    policy: &DeliveryPolicy,
) -> Result<()> {
    let Some(send_at) = policy.scheduled_at(value.event_type, Utc::now()) else {
        return Ok(());
    };
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
             VALUES (?, ?, ?, 'activity', ?, ?, ?, ?, 'pending', 0, ?, ?, ?, ?)",
        )
        .bind(Uuid::new_v4().to_string())
        .bind(subscription)
        .bind(dedupe)
        .bind(value.title)
        .bind(policy.push_body(&ingress.project_name, value.summary))
        .bind(format!("/activity/events/{event_id}"))
        .bind(format!("vibeping-{}", value.event_type.replace('.', "-")))
        .bind(send_at)
        .bind(Utc::now() + Duration::hours(value.ttl_hours))
        .bind(Utc::now())
        .bind(event_id)
        .execute(&mut **transaction)
        .await
        .context("Không xếp được thông báo Codex")?;
    }
    Ok(())
}
