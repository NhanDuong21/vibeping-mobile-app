use super::{PersonalRules, ProjectProfile};
use crate::features::preferences::policy::{self, DeliveryPolicy};
use anyhow::Result;
use chrono::{DateTime, Duration, Utc};
use sqlx::{Sqlite, Transaction};

pub async fn policy_for(
    transaction: &mut Transaction<'_, Sqlite>,
    project: &str,
) -> Result<(DeliveryPolicy, PersonalRules)> {
    let mut policy = policy::load(transaction).await?;
    let mut rules: PersonalRules = sqlx::query_as(
        "SELECT completion_min_minutes, waiting_reminder_minutes FROM personal_rules WHERE id = 1",
    )
    .fetch_one(&mut **transaction)
    .await?;
    let profile: Option<ProjectProfile> =
        sqlx::query_as("SELECT * FROM project_profiles WHERE project_name = ?")
            .bind(project)
            .fetch_optional(&mut **transaction)
            .await?;
    if let Some(profile) = profile {
        // Global switches remain the master controls; projects can narrow delivery.
        policy.notify_completion &= profile.notify_completion;
        policy.notify_permission &= profile.notify_permission;
        policy.notify_preview &= profile.notify_preview;
        policy.notify_final_failure &= profile.notify_final_failure;
        rules.completion_min_minutes = profile
            .completion_min_minutes
            .unwrap_or(rules.completion_min_minutes);
        rules.waiting_reminder_minutes = profile
            .waiting_reminder_minutes
            .unwrap_or(rules.waiting_reminder_minutes);
    }
    Ok((policy, rules))
}

pub fn completion_eligible(start: Option<DateTime<Utc>>, end: DateTime<Utc>, minimum: i32) -> bool {
    // Unknown starts cannot prove a task was short: retain its completion signal.
    start.is_none_or(|start| end - start >= Duration::minutes(i64::from(minimum)))
}

pub async fn allows_completion(
    transaction: &mut Transaction<'_, Sqlite>,
    turn: &str,
    at: DateTime<Utc>,
    minimum: i32,
) -> Result<bool> {
    let start: Option<DateTime<Utc>> = sqlx::query_scalar("SELECT CASE WHEN start_observed = 1 THEN started_at END FROM codex_turns WHERE turn_key = ?")
        .bind(turn).fetch_one(&mut **transaction).await?;
    Ok(completion_eligible(start, at, minimum))
}

pub async fn display_name(
    transaction: &mut Transaction<'_, Sqlite>,
    project: &str,
) -> Result<String> {
    Ok(
        sqlx::query_scalar("SELECT display_name FROM project_profiles WHERE project_name = ?")
            .bind(project)
            .fetch_optional(&mut **transaction)
            .await?
            .unwrap_or_else(|| project.to_owned()),
    )
}

/// Recheck queued jobs after a setting change or resumed turn, before acquiring a delivery lease.
#[derive(sqlx::FromRow)]
struct QueuedEvent {
    event_type: String,
    project_name: String,
    turn_key: Option<String>,
    occurred_at: DateTime<Utc>,
    is_waiting_reminder: bool,
}

pub async fn prepare_job(
    transaction: &mut Transaction<'_, Sqlite>,
    id: &str,
    now: DateTime<Utc>,
) -> Result<bool> {
    let row: Option<QueuedEvent> = sqlx::query_as(
        "SELECT e.event_type, e.project_name, e.turn_key, e.occurred_at, j.is_waiting_reminder FROM notification_jobs j JOIN activity_events e ON e.id = j.event_id WHERE j.id = ?"
    ).bind(id).fetch_optional(&mut **transaction).await?;
    let Some(QueuedEvent {
        event_type: kind,
        project_name: project,
        turn_key: turn,
        occurred_at: occurred,
        is_waiting_reminder: reminder,
    }) = row
    else {
        return Ok(true);
    };
    let (policy, rules) = policy_for(transaction, &project).await?;
    let mut due = policy.scheduled_at(&kind, now);
    if kind == "codex.turn.completed"
        && let Some(turn) = &turn
        && !allows_completion(transaction, turn, occurred, rules.completion_min_minutes).await?
    {
        due = None;
    }
    if reminder {
        let waiting: Option<DateTime<Utc>> = sqlx::query_scalar(
            "SELECT MAX(s.occurred_at) FROM work_session_stages s JOIN codex_turns t ON t.turn_key = s.turn_key \
            WHERE t.turn_key = ? AND t.state = 'waiting' AND s.event_type = 'codex.attention.permission_required'"
        ).bind(&turn).fetch_one(&mut **transaction).await?;
        due = match (due, waiting, rules.waiting_reminder_minutes) {
            (Some(due), Some(wait), minutes) if minutes > 0 => {
                Some(due.max(wait + Duration::minutes(i64::from(minutes))))
            }
            _ => None,
        };
    }
    match due {
        Some(at) if at <= now => Ok(true),
        Some(at) => {
            sqlx::query("UPDATE notification_jobs SET next_attempt_at = ? WHERE id = ?")
                .bind(at)
                .bind(id)
                .execute(&mut **transaction)
                .await?;
            Ok(false)
        }
        None => {
            sqlx::query("UPDATE notification_jobs SET state = 'expired', completed_at = ?, lease_until = NULL WHERE id = ?")
                .bind(now).bind(id).execute(&mut **transaction).await?;
            Ok(false)
        }
    }
}
