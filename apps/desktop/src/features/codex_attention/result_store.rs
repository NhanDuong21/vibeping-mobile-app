use anyhow::Result;
use sqlx::{Sqlite, Transaction};

use super::{ActivityEvent, CodexResult};
use crate::features::notifications::NotificationContext;

// A late completion payload enriches the existing event without another push or unread item.
pub(super) async fn enrich_existing(
    transaction: &mut Transaction<'_, Sqlite>,
    dedupe: &str,
    result: Option<&CodexResult>,
    context: &NotificationContext,
) -> Result<Option<ActivityEvent>> {
    let Some(result) = result else {
        return Ok(None);
    };
    let changed = sqlx::query(
        "UPDATE activity_events SET result_text = ?, result_truncated = ?, result_excerpt = ?, \
         notification_context = ? WHERE dedupe_key = ? AND result_text IS NULL",
    )
    .bind(&result.text)
    .bind(result.truncated)
    .bind(result.excerpt())
    .bind(serde_json::to_string(context)?)
    .bind(dedupe)
    .execute(&mut **transaction)
    .await?;
    if changed.rows_affected() == 0 {
        return Ok(None);
    }
    Ok(sqlx::query_as::<_, ActivityEvent>(
        "SELECT id, event_type, title, summary, result_excerpt, project_name, occurred_at, is_read \
         FROM activity_events WHERE dedupe_key = ?",
    )
    .bind(dedupe)
    .fetch_optional(&mut **transaction)
    .await?)
}
