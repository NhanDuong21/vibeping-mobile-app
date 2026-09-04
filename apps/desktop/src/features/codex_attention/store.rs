use anyhow::{Context, Result};
use chrono::Utc;
use sqlx::{Sqlite, SqlitePool, Transaction};

use super::event_store::{EventCopy, event_for, insert_event, remember_task};
use crate::features::preferences::policy;

use super::model::{ActivityEvent, ActivitySnapshot, CodexIngress, CodexSignal};
use super::turn_state::prepare_turn;

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
        if ingress.signal != CodexSignal::Completed {
            record_hook_signal(&mut transaction, ingress).await?;
        }
        if !prepare_turn(&mut transaction, ingress).await? {
            transaction.commit().await?;
            return Ok(None);
        }
        remember_task(&mut transaction, ingress).await?;
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
                set_preview(&mut transaction, ingress).await?;
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
        let current_work = self.current_work().await?;
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

async fn record_hook_signal(
    transaction: &mut Transaction<'_, Sqlite>,
    value: &CodexIngress,
) -> Result<()> {
    sqlx::query(
        "INSERT INTO app_metadata (key, value, updated_at) VALUES \
         ('codex_hook_observed', 'true', ?) ON CONFLICT(key) DO UPDATE SET \
         value = excluded.value, updated_at = excluded.updated_at",
    )
    .bind(value.occurred_at)
    .execute(&mut **transaction)
    .await
    .context("Không lưu được trạng thái kết nối Codex")?;
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

async fn set_preview(
    transaction: &mut Transaction<'_, Sqlite>,
    value: &CodexIngress,
) -> Result<()> {
    sqlx::query(
        "UPDATE codex_turns SET preview_ready = 1, state = 'running', updated_at = ? WHERE turn_key = ?",
    )
    .bind(value.occurred_at)
    .bind(&value.turn_key)
    .execute(&mut **transaction)
    .await
    .context("Không cập nhật được bản xem trước")?;
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
        "UPDATE codex_turns SET state = ?, updated_at = MAX(updated_at, ?), \
         completed_at = COALESCE(completed_at, ?) WHERE turn_key = ?",
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
