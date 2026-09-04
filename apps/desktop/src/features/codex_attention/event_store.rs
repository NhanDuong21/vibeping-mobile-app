use super::{ActivityEvent, CodexIngress, CodexSignal};
use crate::features::{
    notifications::{
        NotificationContext, dto::NotificationCopy, event_words, notification_copy, safe_label,
    },
    preferences::policy::DeliveryPolicy,
};
use anyhow::{Context, Result};
use chrono::{Duration, Utc};
use sqlx::{Sqlite, Transaction};
use uuid::Uuid;

#[derive(Clone, Copy)]
pub(super) struct EventCopy {
    event_type: &'static str,
    title: &'static str,
    summary: &'static str,
    push: bool,
    ttl_hours: i64,
}

pub(super) fn event_for(_value: &CodexIngress, event_type: &'static str) -> Option<EventCopy> {
    let (push, ttl_hours) = match event_type {
        "codex.turn.started" => (false, 1),
        "codex.attention.permission_required" => (true, 2),
        "codex.preview.ready" => (true, 4),
        "codex.test.failed" => (true, 8),
        "codex.turn.completed" => (true, 12),
        _ => return None,
    };
    let (title, summary) = event_words(event_type);
    Some(EventCopy {
        event_type,
        title,
        summary,
        push,
        ttl_hours,
    })
}

pub(super) async fn remember_task(
    transaction: &mut Transaction<'_, Sqlite>,
    ingress: &CodexIngress,
) -> Result<()> {
    let task = ingress.task_label.as_deref().and_then(safe_label);
    sqlx::query("UPDATE codex_turns SET task_label = COALESCE(?, task_label) WHERE turn_key = ?")
        .bind(task)
        .bind(&ingress.turn_key)
        .execute(&mut **transaction)
        .await?;
    Ok(())
}

pub(super) async fn insert_event(
    transaction: &mut Transaction<'_, Sqlite>,
    ingress: &CodexIngress,
    value: EventCopy,
    policy: &DeliveryPolicy,
) -> Result<Option<ActivityEvent>> {
    let task: Option<String> =
        sqlx::query_scalar("SELECT task_label FROM codex_turns WHERE turn_key = ?")
            .bind(&ingress.turn_key)
            .fetch_one(&mut **transaction)
            .await?;
    let task = task.as_deref().and_then(safe_label);
    let summary = task.as_deref().unwrap_or(value.summary).to_owned();
    let result = ingress
        .result
        .as_ref()
        .filter(|_| ingress.signal == CodexSignal::Completed)
        .and_then(super::CodexResult::bounded);
    let result_excerpt = result.as_ref().and_then(super::CodexResult::excerpt);
    let context = NotificationContext::Activity {
        task_label: task,
        result_excerpt: result_excerpt.clone(),
    };
    let copy = notification_copy(
        value.event_type,
        &ingress.project_name,
        Some(&context),
        &policy.privacy_mode,
        Utc::now(),
    );
    let id = Uuid::new_v4().to_string();
    let dedupe = format!("{}:{}", ingress.turn_key, value.event_type);
    let inserted = sqlx::query(
        "INSERT OR IGNORE INTO activity_events \
         (id, dedupe_key, event_type, title, summary, project_name, turn_key, occurred_at, created_at, notification_context, \
          result_excerpt, result_text, result_truncated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&dedupe)
    .bind(value.event_type)
    .bind(value.title)
    .bind(&summary)
    .bind(&ingress.project_name)
    .bind(&ingress.turn_key)
    .bind(ingress.occurred_at)
    .bind(Utc::now())
    .bind(serde_json::to_string(&context)?)
    .bind(&result_excerpt)
    .bind(result.as_ref().map(|value| &value.text))
    .bind(result.as_ref().is_some_and(|value| value.truncated))
    .execute(&mut **transaction)
    .await
    .context("Không lưu được hoạt động Codex")?;
    if inserted.rows_affected() == 0 {
        return super::result_store::enrich_existing(
            transaction,
            &dedupe,
            result.as_ref(),
            &context,
        )
        .await;
    }
    if value.push
        && (!super::notification_gate::is_completion(value.event_type)
            || super::notification_gate::completion_source(transaction, Some(&ingress.turn_key))
                .await?
                != super::notification_gate::CompletionSource::Child)
    {
        enqueue_pushes(transaction, &id, &dedupe, &copy, value, policy).await?;
    }
    Ok(Some(ActivityEvent {
        id,
        event_type: value.event_type.into(),
        title: value.title.into(),
        summary,
        result_excerpt,
        project_name: ingress.project_name.clone(),
        occurred_at: ingress.occurred_at,
        is_read: false,
        session: None,
    }))
}

async fn enqueue_pushes(
    transaction: &mut Transaction<'_, Sqlite>,
    event_id: &str,
    dedupe: &str,
    copy: &NotificationCopy,
    value: EventCopy,
    policy: &DeliveryPolicy,
) -> Result<()> {
    let Some(send_at) = policy.scheduled_at(value.event_type, Utc::now()) else {
        return Ok(());
    };
    let subscriptions: Vec<String> = sqlx::query_scalar(
        "SELECT p.id FROM push_subscriptions p JOIN mobile_devices d ON d.id = p.device_id \
         WHERE p.disabled_at IS NULL AND d.owner_id = 1",
    )
    .fetch_all(&mut **transaction)
    .await
    .context("Không đọc được thiết bị nhận")?;
    for subscription in subscriptions {
        sqlx::query(
            "INSERT OR IGNORE INTO notification_jobs \
             (id, subscription_id, dedupe_key, kind, title, body, target_url, tag, state, \
              attempt_count, next_attempt_at, expires_at, created_at, event_id) \
             VALUES (?, ?, ?, 'activity', ?, ?, ?, ?, 'pending', 0, ?, ?, ?, ?)",
        )
        .bind(Uuid::new_v4().to_string())
        .bind(subscription)
        .bind(dedupe)
        .bind(&copy.title)
        .bind(&copy.body)
        .bind(format!("/activity/events/{event_id}"))
        .bind(format!("vibeping-{}", value.event_type.replace('.', "-")))
        .bind(send_at)
        .bind(Utc::now() + Duration::hours(value.ttl_hours))
        .bind(Utc::now())
        .bind(event_id)
        .execute(&mut **transaction)
        .await
        .context("Không xếp được thông báo Codex")?;
    }
    Ok(())
}
