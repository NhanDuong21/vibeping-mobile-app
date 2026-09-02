use anyhow::{Context, Result};
use chrono::{DateTime, Duration, Timelike, Utc};
use sqlx::{Sqlite, Transaction};

#[derive(Clone, Debug, sqlx::FromRow)]
pub struct DeliveryPolicy {
    pub notify_completion: bool,
    pub notify_permission: bool,
    pub notify_preview: bool,
    pub notify_final_failure: bool,
    pub notify_allowance: bool,
    pub allowance_threshold_percent: i32,
    pub critical_allowance_notifications: bool,
    pub quiet_hours_enabled: bool,
    pub quiet_start_minutes: i32,
    pub quiet_end_minutes: i32,
    pub timezone_offset_minutes: i32,
    pub quiet_allow_urgent: bool,
    pub privacy_mode: String,
}

impl DeliveryPolicy {
    pub fn scheduled_at(&self, event_type: &str, now: DateTime<Utc>) -> Option<DateTime<Utc>> {
        if !self.event_enabled(event_type) {
            return None;
        }
        if !self.quiet_hours_enabled || (self.quiet_allow_urgent && is_urgent(event_type)) {
            return Some(now);
        }
        let local = local_minutes(now, self.timezone_offset_minutes);
        if !inside_interval(local, self.quiet_start_minutes, self.quiet_end_minutes) {
            return Some(now);
        }
        let until_end = (self.quiet_end_minutes - local).rem_euclid(24 * 60).max(1);
        Some(now + Duration::minutes(i64::from(until_end)))
    }

    pub fn push_body(&self, project: &str, summary: &str) -> String {
        if self.privacy_mode == "private" {
            "Mở VibePing để xem chi tiết.".into()
        } else {
            format!("{project} · {summary}")
        }
    }

    fn event_enabled(&self, event_type: &str) -> bool {
        match event_type {
            "codex.turn.completed" => self.notify_completion,
            "codex.attention.permission_required" => self.notify_permission,
            "codex.preview.ready" => self.notify_preview,
            "codex.test.failed" => self.notify_final_failure,
            "codex.allowance.low" => self.notify_allowance,
            "codex.allowance.critical" | "codex.allowance.exhausted" => {
                self.notify_allowance && self.critical_allowance_notifications
            }
            _ => false,
        }
    }
}

pub async fn load(transaction: &mut Transaction<'_, Sqlite>) -> Result<DeliveryPolicy> {
    sqlx::query_as(
        "SELECT notify_completion, notify_permission, notify_preview, notify_final_failure, \
         notify_allowance, allowance_threshold_percent, critical_allowance_notifications, \
         quiet_hours_enabled, quiet_start_minutes, quiet_end_minutes, timezone_offset_minutes, \
         quiet_allow_urgent, privacy_mode FROM preferences WHERE id = 1",
    )
    .fetch_one(&mut **transaction)
    .await
    .context("Không đọc được chính sách thông báo")
}

fn local_minutes(now: DateTime<Utc>, offset: i32) -> i32 {
    (i32::try_from(now.hour()).unwrap_or_default() * 60
        + i32::try_from(now.minute()).unwrap_or_default()
        + offset)
        .rem_euclid(24 * 60)
}

pub(super) fn inside_interval(value: i32, start: i32, end: i32) -> bool {
    if start < end {
        value >= start && value < end
    } else {
        value >= start || value < end
    }
}

fn is_urgent(event_type: &str) -> bool {
    matches!(
        event_type,
        "codex.attention.permission_required"
            | "codex.test.failed"
            | "codex.allowance.critical"
            | "codex.allowance.exhausted"
    )
}
