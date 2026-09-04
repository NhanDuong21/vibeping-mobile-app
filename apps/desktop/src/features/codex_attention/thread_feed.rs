use anyhow::{Result, bail};
use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;
use utoipa::ToSchema;

use super::{ActivityStore, EventFeed, session_feed::session_cursor};

/// Safe, retained thread metadata and the selected turn's position. No prompt or raw identity.
#[derive(Clone, Debug, Serialize, FromRow, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ThreadContext {
    pub id: String,
    pub title: Option<String>,
    pub turn_count: i64,
    pub turn_number: i64,
    /// Retained public turn IDs in order, used to reconcile older phone caches exactly.
    #[sqlx(skip)]
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub turn_ids: Vec<String>,
    pub latest_turn_id: String,
    pub previous_turn_id: Option<String>,
    pub next_turn_id: Option<String>,
    pub first_signal_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub updated_at: DateTime<Utc>,
    pub failed_test_count: i64,
    pub is_read: bool,
}

#[derive(FromRow)]
struct FeedRow {
    id: String,
    event_id: String,
    updated_at: DateTime<Utc>,
}

impl ActivityStore {
    pub(super) async fn thread_context(&self, turn: &str) -> Result<Option<ThreadContext>> {
        let context = sqlx::query_as::<_, ThreadContext>(
            "SELECT f.*, m.turn_number, m.previous_turn_id, m.next_turn_id \
             FROM work_thread_turns m JOIN work_thread_feed f ON f.id = m.thread_id \
             WHERE m.turn_key = ?",
        )
        .bind(turn)
        .fetch_optional(&self.pool)
        .await?;
        let Some(mut context) = context else {
            return Ok(None);
        };
        context.turn_ids = sqlx::query_scalar(
            "SELECT id FROM work_thread_turns WHERE thread_id = ? ORDER BY turn_number",
        )
        .bind(&context.id)
        .fetch_all(&self.pool)
        .await?;
        Ok(Some(context))
    }

    /// Pagination is over complete threads, never a partially loaded set of turns.
    pub async fn list_threads(&self, cursor: Option<&str>, limit: u8) -> Result<EventFeed> {
        validate_limit(limit)?;
        let (at, id) = session_cursor(cursor)?;
        let rows = sqlx::query_as::<_, FeedRow>(
            "WITH entries AS (SELECT id, latest_turn_id AS event_id, updated_at FROM work_thread_feed \
             UNION ALL SELECT id, id AS event_id, occurred_at AS updated_at FROM work_session_feed \
             WHERE id NOT IN (SELECT id FROM work_thread_turns)) \
             SELECT * FROM entries WHERE (? IS NULL OR updated_at < ? OR (updated_at = ? AND id < ?)) \
             ORDER BY updated_at DESC, id DESC LIMIT ?",
        ).bind(at).bind(at).bind(at).bind(id).bind(i64::from(limit) + 1)
            .fetch_all(&self.pool).await?;
        self.thread_page(rows, limit).await
    }

    pub async fn list_thread_turns(
        &self,
        thread: &str,
        cursor: Option<&str>,
        limit: u8,
    ) -> Result<EventFeed> {
        validate_limit(limit)?;
        let before = match cursor {
            Some(value) => value
                .parse::<i64>()
                .ok()
                .filter(|value| *value > 0)
                .ok_or_else(|| anyhow::anyhow!("ACTIVITY_CURSOR_INVALID"))?,
            None => i64::MAX,
        };
        let ids: Vec<(String, i64)> = sqlx::query_as(
            "SELECT id, turn_number FROM work_thread_turns WHERE thread_id = ? AND turn_number < ? \
             ORDER BY turn_number DESC LIMIT ?",
        )
        .bind(thread)
        .bind(before)
        .bind(i64::from(limit) + 1)
        .fetch_all(&self.pool)
        .await?;
        let has_more = ids.len() > usize::from(limit);
        let mut events = Vec::new();
        let mut next_cursor = None;
        for (id, number) in ids.into_iter().take(usize::from(limit)) {
            if let Some(detail) = self.session_detail(&id).await? {
                events.push(detail.event);
                next_cursor = has_more.then(|| number.to_string());
            }
        }
        Ok(EventFeed {
            events,
            next_cursor,
            unread_count: self.session_unread_count().await?,
        })
    }

    async fn thread_page(&self, rows: Vec<FeedRow>, limit: u8) -> Result<EventFeed> {
        let has_more = rows.len() > usize::from(limit);
        let mut events = Vec::new();
        let mut next_cursor = None;
        for row in rows.into_iter().take(usize::from(limit)) {
            if let Some(detail) = self.session_detail(&row.event_id).await? {
                events.push(detail.event);
                next_cursor =
                    has_more.then(|| format!("{}|{}", row.updated_at.to_rfc3339(), row.id));
            }
        }
        Ok(EventFeed {
            events,
            next_cursor,
            unread_count: self.session_unread_count().await?,
        })
    }
}

fn validate_limit(limit: u8) -> Result<()> {
    if !(1..=50).contains(&limit) {
        bail!("ACTIVITY_LIMIT_INVALID");
    }
    Ok(())
}
