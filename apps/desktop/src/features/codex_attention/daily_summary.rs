use super::ActivityStore;
use anyhow::{Result, bail};
use chrono::{DateTime, Duration, Utc};
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DailySummary {
    pub sessions: i64,
    pub completed: i64,
    pub failed_tests: i64,
    pub observed_seconds: i64,
}

impl ActivityStore {
    pub async fn daily_summary(
        &self,
        from: DateTime<Utc>,
        to: DateTime<Utc>,
    ) -> Result<DailySummary> {
        if to <= from || to - from > Duration::hours(26) {
            bail!("SUMMARY_RANGE_INVALID");
        }
        let sessions: i64 = sqlx::query_scalar("SELECT COUNT(DISTINCT turn_key) FROM work_session_stages WHERE occurred_at >= ? AND occurred_at < ?")
            .bind(from).bind(to).fetch_one(&self.pool).await?;
        let completed: i64 = sqlx::query_scalar("SELECT COUNT(DISTINCT s.turn_key) FROM work_session_stages s JOIN codex_turns t ON t.turn_key = s.turn_key WHERE s.event_type = 'codex.turn.completed' AND t.state = 'completed' AND s.occurred_at >= ? AND s.occurred_at < ?")
            .bind(from).bind(to).fetch_one(&self.pool).await?;
        let failed_tests: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM work_session_stages WHERE event_type = 'codex.test.failed' AND occurred_at >= ? AND occurred_at < ?")
            .bind(from).bind(to).fetch_one(&self.pool).await?;
        let ranges: Vec<(DateTime<Utc>, DateTime<Utc>)> = sqlx::query_as(
            "SELECT started_at, COALESCE(completed_at, updated_at) FROM codex_turns \
             WHERE start_observed = 1 AND started_at < ? AND COALESCE(completed_at, updated_at) > ? ORDER BY started_at"
        ).bind(to).bind(from).fetch_all(&self.pool).await?;
        Ok(DailySummary {
            sessions,
            completed,
            failed_tests,
            observed_seconds: observed_seconds(ranges, from, to),
        })
    }
}

fn observed_seconds(
    ranges: Vec<(DateTime<Utc>, DateTime<Utc>)>,
    from: DateTime<Utc>,
    to: DateTime<Utc>,
) -> i64 {
    let mut end = from;
    let mut total = 0;
    for (start, finish) in ranges {
        let start = start.max(from).max(end);
        let finish = finish.min(to);
        total += (finish - start).num_seconds().max(0);
        end = end.max(finish);
    }
    total
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn clips_at_local_day_boundaries_and_does_not_double_count_overlapping_sessions() {
        let from = Utc::now();
        let to = from + Duration::hours(24);
        assert_eq!(
            observed_seconds(
                vec![
                    (from - Duration::hours(2), from + Duration::hours(2)),
                    (from + Duration::hours(1), from + Duration::hours(3)),
                    (to - Duration::hours(1), to + Duration::hours(1))
                ],
                from,
                to
            ),
            4 * 3600
        );
    }
}
