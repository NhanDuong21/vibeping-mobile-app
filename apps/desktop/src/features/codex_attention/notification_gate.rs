use anyhow::Result;
use chrono::{DateTime, Duration, Utc};
use sqlx::{Sqlite, Transaction};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) enum CompletionSource {
    Main,
    Child,
    Unknown,
}

pub(super) fn is_completion(kind: &str) -> bool {
    matches!(kind, "codex.turn.completed" | "codex.test.failed")
}

pub(super) async fn completion_source(
    transaction: &mut Transaction<'_, Sqlite>,
    turn: Option<&str>,
) -> Result<CompletionSource> {
    let main: Option<bool> = sqlx::query_scalar(
        "SELECT i.thread_key = i.root_key FROM codex_turns t \
         JOIN codex_thread_identity i ON i.thread_key = t.session_key WHERE t.turn_key = ?",
    )
    .bind(turn)
    .fetch_optional(&mut **transaction)
    .await?;
    Ok(match main {
        Some(true) => CompletionSource::Main,
        Some(false) => CompletionSource::Child,
        None => CompletionSource::Unknown,
    })
}

#[derive(sqlx::FromRow)]
struct QueuedCompletion {
    kind: String,
    expires_at: DateTime<Utc>,
    event_type: Option<String>,
    turn_key: Option<String>,
}

/// Check persisted ancestry on every attempt, including jobs from older releases.
/// Missing metadata never proves that an agent's answer is the user's final answer.
pub(crate) async fn prepare_notification(
    transaction: &mut Transaction<'_, Sqlite>,
    id: &str,
    now: DateTime<Utc>,
) -> Result<bool> {
    let job: QueuedCompletion = sqlx::query_as(
        "SELECT j.kind, j.expires_at, e.event_type, e.turn_key FROM notification_jobs j \
         LEFT JOIN activity_events e ON e.id = j.event_id WHERE j.id = ?",
    )
    .bind(id)
    .fetch_one(&mut **transaction)
    .await?;
    if job.kind != "activity" {
        return Ok(true);
    }
    let next = match job.event_type.as_deref() {
        Some(kind) if !is_completion(kind) => return Ok(true),
        Some(_) => match completion_source(transaction, job.turn_key.as_deref()).await? {
            CompletionSource::Main => return Ok(true),
            CompletionSource::Child => None,
            CompletionSource::Unknown if now < job.expires_at => {
                Some((now + Duration::seconds(30)).min(job.expires_at))
            }
            CompletionSource::Unknown => None,
        },
        // Retention removed the evidence needed to identify this activity.
        None => None,
    };
    if let Some(next) = next {
        sqlx::query(
            "UPDATE notification_jobs SET next_attempt_at = ?, lease_until = NULL WHERE id = ?",
        )
        .bind(next)
        .bind(id)
        .execute(&mut **transaction)
        .await?;
    } else {
        sqlx::query("UPDATE notification_jobs SET state = 'expired', completed_at = ?, lease_until = NULL WHERE id = ?")
            .bind(now).bind(id).execute(&mut **transaction).await?;
    }
    Ok(false)
}
