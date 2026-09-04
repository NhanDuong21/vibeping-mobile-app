use anyhow::{Context, Result};
use chrono::Utc;
use sqlx::{Sqlite, Transaction};

use super::{NotificationContext, NotificationStore, dto::NotificationPreview, notification_copy};

#[derive(sqlx::FromRow)]
pub(super) struct NotificationEvent {
    pub event_type: String,
    pub project_name: String,
    pub notification_context: Option<String>,
}

impl NotificationEvent {
    pub fn copy(&self, privacy: &str) -> super::dto::NotificationCopy {
        let context = self
            .notification_context
            .as_deref()
            .and_then(|value| serde_json::from_str::<NotificationContext>(value).ok());
        notification_copy(
            &self.event_type,
            &self.project_name,
            context.as_ref(),
            privacy,
            Utc::now(),
        )
    }
}

impl NotificationStore {
    pub async fn preview(&self) -> Result<NotificationPreview> {
        let recent = sqlx::query_as::<_, NotificationEvent>(
            "SELECT event_type, project_name, notification_context FROM activity_events \
             WHERE event_type IN ('codex.turn.completed', 'codex.attention.permission_required', \
             'codex.test.failed', 'codex.preview.ready', 'codex.allowance.low', \
             'codex.allowance.critical', 'codex.allowance.exhausted') \
             ORDER BY occurred_at DESC, id DESC LIMIT 1",
        )
        .fetch_optional(&self.pool)
        .await
        .context("Không đọc được ví dụ thông báo")?;
        let source = if recent.is_some() {
            "activity"
        } else {
            "sample"
        };
        let event = recent.unwrap_or_else(sample);
        Ok(NotificationPreview {
            private: event.copy("private"),
            project: event.copy("project"),
            standard: event.copy("standard"),
            source,
        })
    }
}

pub(super) async fn copy_for_job(
    transaction: &mut Transaction<'_, Sqlite>,
    job_id: &str,
) -> Result<Option<super::dto::NotificationCopy>> {
    let event = sqlx::query_as::<_, NotificationEvent>(
        "SELECT e.event_type, e.project_name, e.notification_context FROM notification_jobs j \
         JOIN activity_events e ON e.id = j.event_id WHERE j.id = ?",
    )
    .bind(job_id)
    .fetch_optional(&mut **transaction)
    .await?;
    let privacy: String = sqlx::query_scalar("SELECT privacy_mode FROM preferences WHERE id = 1")
        .fetch_one(&mut **transaction)
        .await?;
    if let Some(event) = event {
        return Ok(Some(event.copy(&privacy)));
    }
    let kind: String = sqlx::query_scalar("SELECT kind FROM notification_jobs WHERE id = ?")
        .bind(job_id)
        .fetch_one(&mut **transaction)
        .await?;
    Ok((kind != "test").then(|| notification_copy("unknown", "", None, "private", Utc::now())))
}

fn sample() -> NotificationEvent {
    NotificationEvent {
        event_type: "codex.turn.completed".into(),
        project_name: "vibeping-mobile-app".into(),
        notification_context: serde_json::to_string(&NotificationContext::Activity {
            task_label: Some("Hoàn thiện màn Hoạt động".into()),
        })
        .ok(),
    }
}
