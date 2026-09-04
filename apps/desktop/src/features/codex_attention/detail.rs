use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use sqlx::FromRow;

use super::{ActivityEvent, ActivityEventDetail, ActivityStore, ActivityTimelineStage};

#[derive(FromRow)]
struct EventDetailRow {
    id: String,
    event_type: String,
    title: String,
    summary: String,
    result_excerpt: Option<String>,
    result_text: Option<String>,
    result_truncated: bool,
    project_name: String,
    occurred_at: DateTime<Utc>,
    is_read: bool,
    turn_key: Option<String>,
}

impl ActivityStore {
    pub async fn event_detail(&self, id: &str) -> Result<Option<ActivityEventDetail>> {
        let row = sqlx::query_as::<_, EventDetailRow>(
            "SELECT id, event_type, title, summary, project_name, occurred_at, is_read, turn_key, \
             result_excerpt, result_text, result_truncated \
             FROM activity_events WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .context("Không đọc được chi tiết hoạt động")?;
        let Some(row) = row else {
            return Ok(None);
        };
        let timeline = match row.turn_key.as_deref() {
            Some(turn_key) => self.timeline(turn_key).await?,
            None => Vec::new(),
        };
        Ok(Some(ActivityEventDetail {
            event: ActivityEvent {
                id: row.id,
                event_type: row.event_type,
                title: row.title,
                summary: row.summary,
                result_excerpt: row.result_excerpt,
                project_name: row.project_name,
                occurred_at: row.occurred_at,
                is_read: row.is_read,
            },
            timeline,
            result: row.result_text.map(|text| super::CodexResult {
                text,
                truncated: row.result_truncated,
            }),
        }))
    }

    async fn timeline(&self, turn_key: &str) -> Result<Vec<ActivityTimelineStage>> {
        sqlx::query_as::<_, TimelineRow>(
            "SELECT event_type, occurred_at FROM activity_events WHERE turn_key = ? \
             AND event_type IN ('codex.turn.started', 'codex.attention.permission_required', \
             'codex.preview.ready', 'codex.test.failed', 'codex.turn.completed') \
             ORDER BY occurred_at ASC, id ASC",
        )
        .bind(turn_key)
        .fetch_all(&self.pool)
        .await
        .context("Không đọc được diễn biến hoạt động")
        .map(|rows| rows.into_iter().map(Into::into).collect())
    }
}

#[derive(FromRow)]
struct TimelineRow {
    event_type: String,
    occurred_at: DateTime<Utc>,
}

impl From<TimelineRow> for ActivityTimelineStage {
    fn from(value: TimelineRow) -> Self {
        Self {
            event_type: value.event_type,
            occurred_at: value.occurred_at,
        }
    }
}
