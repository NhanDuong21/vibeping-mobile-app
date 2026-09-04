use anyhow::{Context, Result};
use chrono::{DateTime, Duration, Utc};

use super::{ActivityStore, CurrentWork};

const SIGNAL_FRESHNESS: Duration = Duration::minutes(2);

#[derive(sqlx::FromRow)]
struct ObservedWork {
    project_name: String,
    state: String,
    last_test_state: String,
    preview_ready: bool,
    started_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl ActivityStore {
    pub async fn current_work(&self) -> Result<Option<CurrentWork>> {
        self.current_work_at(Utc::now()).await
    }

    pub(super) async fn current_work_at(&self, now: DateTime<Utc>) -> Result<Option<CurrentWork>> {
        let row = sqlx::query_as::<_, ObservedWork>(
            "SELECT project_name, state, last_test_state, preview_ready, started_at, updated_at \
             FROM codex_turns t WHERE start_observed = 1 AND state IN ('running', 'waiting') \
             AND NOT EXISTS (SELECT 1 FROM codex_turns newer \
                 WHERE newer.session_key = t.session_key AND newer.start_observed = 1 \
                 AND (newer.started_at > t.started_at OR \
                     (newer.started_at = t.started_at AND newer.rowid > t.rowid))) \
             ORDER BY updated_at DESC, rowid DESC LIMIT 1",
        )
        .fetch_optional(&self.pool)
        .await
        .context("Không đọc được công việc hiện tại")?;
        Ok(row.map(|work| {
            let fresh_until = work.updated_at + SIGNAL_FRESHNESS;
            CurrentWork {
                project_name: work.project_name,
                state: if now >= fresh_until {
                    "unconfirmed".into()
                } else {
                    work.state
                },
                last_test_state: work.last_test_state,
                preview_ready: work.preview_ready,
                started_at: work.started_at,
                updated_at: work.updated_at,
                fresh_until,
            }
        }))
    }
}
