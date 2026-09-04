use anyhow::Result;
use sqlx::{Sqlite, Transaction};

use super::{CodexIngress, CodexSignal};

/// Keep changes of state, not the tool stream. Retried hooks do not add stages.
pub(super) async fn record(
    transaction: &mut Transaction<'_, Sqlite>,
    value: &CodexIngress,
) -> Result<()> {
    let last: Option<String> = sqlx::query_scalar(
        "SELECT event_type FROM work_session_stages WHERE turn_key = ? ORDER BY occurred_at DESC, id DESC LIMIT 1",
    ).bind(&value.turn_key).fetch_optional(&mut **transaction).await?;
    let kind = match value.signal {
        CodexSignal::Started => "codex.turn.started",
        CodexSignal::PermissionRequired => "codex.attention.permission_required",
        CodexSignal::TestFailed => "codex.test.failed",
        CodexSignal::TestPassed => "codex.test.passed",
        CodexSignal::PreviewReady => "codex.preview.ready",
        CodexSignal::Stopped => "codex.turn.stopped",
        CodexSignal::Completed => "codex.turn.completed",
        CodexSignal::Progressed => {
            if !matches!(
                last.as_deref(),
                Some("codex.attention.permission_required" | "codex.test.failed")
            ) {
                return Ok(());
            }
            "codex.turn.resumed"
        }
    };
    if last.as_deref() == Some(kind)
        && !matches!(
            value.signal,
            CodexSignal::TestFailed | CodexSignal::TestPassed
        )
    {
        return Ok(());
    }
    if value.signal == CodexSignal::Stopped && last.as_deref() == Some("codex.turn.completed") {
        return Ok(());
    }
    if value.signal == CodexSignal::Completed && last.as_deref() == Some("codex.turn.stopped") {
        sqlx::query("UPDATE work_session_stages SET event_type = 'codex.turn.completed' WHERE turn_key = ? AND event_type = 'codex.turn.stopped'")
            .bind(&value.turn_key).execute(&mut **transaction).await?;
        return Ok(());
    }
    // A late duplicate start/completion must not create another boundary.
    if matches!(kind, "codex.turn.started" | "codex.turn.completed") {
        let exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM work_session_stages WHERE turn_key = ? AND event_type = ?)")
            .bind(&value.turn_key).bind(kind).fetch_one(&mut **transaction).await?;
        if exists {
            return Ok(());
        }
    }
    sqlx::query("INSERT OR IGNORE INTO work_session_stages(turn_key, event_type, occurred_at) VALUES (?, ?, ?)")
        .bind(&value.turn_key).bind(kind).bind(value.occurred_at).execute(&mut **transaction).await?;
    Ok(())
}
