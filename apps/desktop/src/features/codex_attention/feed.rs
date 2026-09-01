use anyhow::{Context, Result, bail};

use super::{ActivityEvent, ActivityStore, CurrentWork, EventFeed, ReadStateResponse};

impl ActivityStore {
    pub async fn current_work(&self) -> Result<Option<CurrentWork>> {
        sqlx::query_as(
            "SELECT project_name, state, started_at, updated_at FROM codex_turns \
             WHERE state IN ('running', 'waiting') ORDER BY updated_at DESC LIMIT 1",
        )
        .fetch_optional(&self.pool)
        .await
        .context("Không đọc được công việc hiện tại")
    }

    pub async fn list_events(&self, cursor: Option<&str>, limit: u8) -> Result<EventFeed> {
        if !(1..=50).contains(&limit) {
            bail!("ACTIVITY_LIMIT_INVALID")
        }
        let rows = if let Some(cursor) = cursor {
            if !self.event_exists(cursor).await? {
                bail!("ACTIVITY_CURSOR_INVALID")
            }
            sqlx::query_as::<_, ActivityEvent>(
                "SELECT id, event_type, title, summary, project_name, occurred_at, is_read \
                 FROM activity_events WHERE \
                 occurred_at < (SELECT occurred_at FROM activity_events WHERE id = ?) OR \
                 (occurred_at = (SELECT occurred_at FROM activity_events WHERE id = ?) AND id < ?) \
                 ORDER BY occurred_at DESC, id DESC LIMIT ?",
            )
            .bind(cursor)
            .bind(cursor)
            .bind(cursor)
            .bind(i64::from(limit) + 1)
            .fetch_all(&self.pool)
            .await
        } else {
            sqlx::query_as::<_, ActivityEvent>(
                "SELECT id, event_type, title, summary, project_name, occurred_at, is_read \
                 FROM activity_events ORDER BY occurred_at DESC, id DESC LIMIT ?",
            )
            .bind(i64::from(limit) + 1)
            .fetch_all(&self.pool)
            .await
        }
        .context("Không đọc được danh sách hoạt động")?;
        let mut events = rows;
        let has_more = events.len() > usize::from(limit);
        events.truncate(usize::from(limit));
        let next_cursor = has_more
            .then(|| events.last().map(|event| event.id.clone()))
            .flatten();
        Ok(EventFeed {
            events,
            next_cursor,
            unread_count: self.unread_count().await?,
        })
    }

    pub async fn event(&self, id: &str) -> Result<Option<ActivityEvent>> {
        sqlx::query_as(
            "SELECT id, event_type, title, summary, project_name, occurred_at, is_read \
             FROM activity_events WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .context("Không đọc được chi tiết hoạt động")
    }

    pub async fn mark_read(&self, id: &str) -> Result<Option<ReadStateResponse>> {
        let updated = sqlx::query("UPDATE activity_events SET is_read = 1 WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await
            .context("Không đánh dấu được hoạt động")?;
        if updated.rows_affected() == 0 {
            return Ok(None);
        }
        Ok(Some(self.read_state().await?))
    }

    pub async fn mark_all_read(&self) -> Result<ReadStateResponse> {
        sqlx::query("UPDATE activity_events SET is_read = 1 WHERE is_read = 0")
            .execute(&self.pool)
            .await
            .context("Không đánh dấu được các hoạt động")?;
        self.read_state().await
    }

    pub async fn unread_count(&self) -> Result<i64> {
        sqlx::query_scalar("SELECT COUNT(*) FROM activity_events WHERE is_read = 0")
            .fetch_one(&self.pool)
            .await
            .context("Không đọc được số hoạt động mới")
    }

    async fn event_exists(&self, id: &str) -> Result<bool> {
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM activity_events WHERE id = ?")
            .bind(id)
            .fetch_one(&self.pool)
            .await
            .context("Không kiểm tra được con trỏ hoạt động")?;
        Ok(count == 1)
    }

    async fn read_state(&self) -> Result<ReadStateResponse> {
        Ok(ReadStateResponse {
            state: "read",
            unread_count: self.unread_count().await?,
        })
    }
}
