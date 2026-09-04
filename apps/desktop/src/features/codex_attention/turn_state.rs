use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use sqlx::{Sqlite, Transaction};

use super::{CodexIngress, CodexSignal};

/// Only a user-prompt signal proves that this is a foreground turn. Tool hooks
/// can also belong to subagents sharing the parent session, or arrive late.
pub(super) async fn prepare_turn(
    transaction: &mut Transaction<'_, Sqlite>,
    value: &CodexIngress,
) -> Result<bool> {
    sqlx::query(
        "INSERT OR IGNORE INTO codex_turns \
         (turn_key, session_key, project_name, state, started_at, updated_at, start_observed) \
         VALUES (?, ?, ?, 'running', ?, ?, ?)",
    )
    .bind(&value.turn_key)
    .bind(&value.session_key)
    .bind(&value.project_name)
    .bind(value.occurred_at)
    .bind(value.occurred_at)
    .bind(value.signal == CodexSignal::Started)
    .execute(&mut **transaction)
    .await
    .context("Không lưu được lượt Codex")?;
    let (state, updated_at): (String, DateTime<Utc>) =
        sqlx::query_as("SELECT state, updated_at FROM codex_turns WHERE turn_key = ?")
            .bind(&value.turn_key)
            .fetch_one(&mut **transaction)
            .await?;
    let terminal = matches!(value.signal, CodexSignal::Stopped | CodexSignal::Completed);
    if !terminal && matches!(state.as_str(), "completed" | "failed") {
        return Ok(false);
    }
    if value.signal == CodexSignal::Started {
        sqlx::query(
            "UPDATE codex_turns SET start_observed = 1, started_at = MIN(started_at, ?) \
             WHERE turn_key = ?",
        )
        .bind(value.occurred_at)
        .bind(&value.turn_key)
        .execute(&mut **transaction)
        .await?;
    } else if !terminal && value.occurred_at < updated_at {
        return Ok(false);
    }
    sqlx::query("UPDATE codex_turns SET updated_at = MAX(updated_at, ?) WHERE turn_key = ?")
        .bind(value.occurred_at)
        .bind(&value.turn_key)
        .execute(&mut **transaction)
        .await?;
    Ok(true)
}
