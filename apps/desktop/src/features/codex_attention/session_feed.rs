use anyhow::{Result, bail};
use chrono::{DateTime, Duration, Utc};
use sqlx::FromRow;

use super::{ActivityEventDetail, ActivityStore, ActivityTimelineStage, EventFeed, WorkSession};

#[derive(FromRow)]
struct SessionRow {
    id: String,
    event_id: String,
    turn_key: Option<String>,
    occurred_at: DateTime<Utc>,
    is_read: bool,
}

#[derive(FromRow)]
struct TurnRow {
    last_test_state: String,
    state: String,
    started_at: DateTime<Utc>,
    completed_at: Option<DateTime<Utc>>,
    updated_at: DateTime<Utc>,
    start_observed: bool,
    task_label: Option<String>,
}

#[derive(FromRow)]
struct StageRow {
    event_type: String,
    occurred_at: DateTime<Utc>,
}

impl ActivityStore {
    pub async fn list_sessions(&self, cursor: Option<&str>, limit: u8) -> Result<EventFeed> {
        self.list_sessions_for_project(cursor, limit, None).await
    }

    pub async fn list_sessions_for_project(
        &self,
        cursor: Option<&str>,
        limit: u8,
        project: Option<&str>,
    ) -> Result<EventFeed> {
        if !(1..=50).contains(&limit) {
            bail!("ACTIVITY_LIMIT_INVALID");
        }
        let (at, id) = session_cursor(cursor)?;
        let rows = sqlx::query_as::<_, SessionRow>(
            "SELECT f.* FROM work_session_feed f JOIN activity_events e ON e.id = f.event_id \
             WHERE (? IS NULL OR f.occurred_at < ? OR (f.occurred_at = ? AND f.id < ?)) \
             AND (? IS NULL OR e.project_name = ?) ORDER BY f.occurred_at DESC, f.id DESC LIMIT ?",
        )
        .bind(at)
        .bind(at)
        .bind(at)
        .bind(id)
        .bind(project)
        .bind(project)
        .bind(i64::from(limit) + 1)
        .fetch_all(&self.pool)
        .await?;
        let has_more = rows.len() > usize::from(limit);
        let mut events = Vec::new();
        for row in rows.into_iter().take(usize::from(limit)) {
            if let Some(detail) = self.project_session(row).await? {
                events.push(detail.event);
            }
        }
        let next_cursor = if has_more {
            events
                .last()
                .map(|e| format!("{}|{}", e.occurred_at.to_rfc3339(), e.id))
        } else {
            None
        };
        Ok(EventFeed {
            events,
            next_cursor,
            unread_count: self.session_unread_count().await?,
        })
    }

    pub async fn session_unread_count(&self) -> Result<i64> {
        Ok(
            sqlx::query_scalar("SELECT COUNT(*) FROM work_session_feed WHERE is_read = 0")
                .fetch_one(&self.pool)
                .await?,
        )
    }

    /// Old notification event identifiers resolve to the same durable session.
    pub async fn session_detail(&self, id: &str) -> Result<Option<ActivityEventDetail>> {
        let row = sqlx::query_as::<_, SessionRow>(
            "SELECT * FROM work_session_feed WHERE id = ? OR event_id = ? OR turn_key = \
             (SELECT turn_key FROM activity_events WHERE id = ?) LIMIT 1",
        )
        .bind(id)
        .bind(id)
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        match row {
            Some(row) => self.project_session(row).await,
            None => Ok(None),
        }
    }

    pub async fn session_for_turn(&self, turn_key: &str) -> Result<Option<super::ActivityEvent>> {
        let row =
            sqlx::query_as::<_, SessionRow>("SELECT * FROM work_session_feed WHERE turn_key = ?")
                .bind(turn_key)
                .fetch_optional(&self.pool)
                .await?;
        match row {
            Some(row) => Ok(self.project_session(row).await?.map(|value| value.event)),
            None => Ok(None),
        }
    }

    async fn project_session(&self, row: SessionRow) -> Result<Option<ActivityEventDetail>> {
        let Some(mut detail) = self.event_detail(&row.event_id).await? else {
            return Ok(None);
        };
        let Some(turn_key) = row.turn_key else {
            return Ok(Some(detail));
        };
        let mut turn = sqlx::query_as::<_, TurnRow>(
            "SELECT state, started_at, completed_at, updated_at, start_observed, task_label, last_test_state FROM codex_turns WHERE turn_key = ?",
        ).bind(&turn_key).fetch_one(&self.pool).await?;
        detail.timeline = self.session_timeline(&turn_key).await?;
        if turn.state == "completed"
            && !detail
                .timeline
                .iter()
                .any(|stage| stage.event_type == "codex.turn.completed")
        {
            turn.state = "stopped".into();
        }
        detail.event.id = row.id;
        detail.event.occurred_at = row.occurred_at;
        detail.event.is_read = row.is_read;
        if let Some(task) = turn.task_label.clone() {
            detail.event.summary = task;
        }
        detail.event.event_type = match turn.state.as_str() {
            "completed" => "codex.turn.completed",
            "stopped" => "codex.turn.stopped",
            "failed" => "codex.test.failed",
            "waiting" => "codex.attention.permission_required",
            _ => "codex.turn.started",
        }
        .into();
        detail.event.title = crate::features::notifications::event_words(&detail.event.event_type)
            .0
            .into();
        self.attach_session_result(&mut detail, &turn_key).await?;
        detail.event.session = Some(WorkSession {
            thread: self.thread_context(&turn_key).await?,
            task_label: turn.task_label,
            last_test_state: Some(turn.last_test_state),
            event_ids: sqlx::query_scalar(
                "SELECT id FROM activity_events WHERE turn_key = ? ORDER BY occurred_at, rowid",
            )
            .bind(&turn_key)
            .fetch_all(&self.pool)
            .await?,
            state: if matches!(turn.state.as_str(), "running" | "waiting")
                && Utc::now() >= turn.updated_at + Duration::minutes(2)
            {
                "unconfirmed".into()
            } else {
                turn.state
            },
            started_at: turn.start_observed.then_some(turn.started_at),
            completed_at: turn.completed_at,
            updated_at: turn.updated_at,
            failed_test_count: detail
                .timeline
                .iter()
                .filter(|s| s.event_type == "codex.test.failed")
                .count() as i64,
            timeline: detail
                .timeline
                .iter()
                .rev()
                .take(3)
                .cloned()
                .collect::<Vec<_>>()
                .into_iter()
                .rev()
                .collect(),
        });
        Ok(Some(detail))
    }

    async fn session_timeline(&self, turn_key: &str) -> Result<Vec<ActivityTimelineStage>> {
        let rows = sqlx::query_as::<_, StageRow>(
            "SELECT event_type, occurred_at FROM work_session_stages WHERE turn_key = ? ORDER BY occurred_at, id",
        ).bind(turn_key).fetch_all(&self.pool).await?;
        Ok(rows
            .into_iter()
            .map(|r| ActivityTimelineStage {
                event_type: r.event_type,
                occurred_at: r.occurred_at,
            })
            .collect())
    }

    async fn attach_session_result(
        &self,
        detail: &mut ActivityEventDetail,
        turn: &str,
    ) -> Result<()> {
        let result: Option<(String, bool, Option<String>)> = sqlx::query_as(
            "SELECT result_text, result_truncated, result_excerpt FROM activity_events \
             WHERE turn_key = ? AND result_text IS NOT NULL ORDER BY occurred_at DESC, rowid DESC LIMIT 1",
        ).bind(turn).fetch_optional(&self.pool).await?;
        if let Some((text, truncated, excerpt)) = result {
            detail.result = Some(super::CodexResult { text, truncated });
            detail.event.result_excerpt = excerpt;
        }
        Ok(())
    }
}

pub(super) fn session_cursor(cursor: Option<&str>) -> Result<(Option<DateTime<Utc>>, String)> {
    let Some(cursor) = cursor else {
        return Ok((None, String::new()));
    };
    if let Some((time, id)) = cursor.split_once('|')
        && !id.is_empty()
        && id.len() <= 64
        && let Ok(time) = DateTime::parse_from_rfc3339(time)
    {
        return Ok((Some(time.with_timezone(&Utc)), id.to_owned()));
    }
    bail!("ACTIVITY_CURSOR_INVALID")
}
