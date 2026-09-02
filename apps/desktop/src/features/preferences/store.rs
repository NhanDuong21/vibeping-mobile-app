use anyhow::{Context, Result, bail};
use chrono::{Duration, Utc};
use sqlx::{FromRow, SqlitePool};

use super::{
    NotificationPreferences, Preferences, QuietHours,
    model::{format_time, parse_time},
};

#[derive(Clone)]
pub struct PreferenceStore {
    pool: SqlitePool,
}

#[derive(FromRow)]
struct PreferenceRow {
    notify_completion: bool,
    notify_permission: bool,
    notify_preview: bool,
    notify_final_failure: bool,
    notify_allowance: bool,
    allowance_threshold_percent: i32,
    critical_allowance_notifications: bool,
    quiet_hours_enabled: bool,
    quiet_start_minutes: i32,
    quiet_end_minutes: i32,
    timezone_offset_minutes: i32,
    quiet_allow_urgent: bool,
    privacy_mode: String,
    theme: String,
    retention_days: i32,
}

impl PreferenceStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn get(&self) -> Result<Preferences> {
        let row = sqlx::query_as::<_, PreferenceRow>(
            "SELECT notify_completion, notify_permission, notify_preview, notify_final_failure, \
             notify_allowance, allowance_threshold_percent, critical_allowance_notifications, \
             quiet_hours_enabled, quiet_start_minutes, quiet_end_minutes, timezone_offset_minutes, \
             quiet_allow_urgent, privacy_mode, theme, retention_days FROM preferences WHERE id = 1",
        )
        .fetch_one(&self.pool)
        .await
        .context("Không đọc được cài đặt")?;
        Ok(row.into())
    }

    pub async fn save(&self, value: &Preferences) -> Result<Preferences> {
        if !value.validate() {
            bail!("PREFERENCES_INVALID")
        }
        let start = parse_time(&value.quiet_hours.start).expect("validated start");
        let end = parse_time(&value.quiet_hours.end).expect("validated end");
        let mut transaction = self.pool.begin().await.context("Không mở được cài đặt")?;
        sqlx::query(
            "UPDATE preferences SET notify_completion = ?, notify_permission = ?, notify_preview = ?, \
             notify_final_failure = ?, notify_allowance = ?, allowance_threshold_percent = ?, \
             critical_allowance_notifications = ?, quiet_hours_enabled = ?, quiet_start_minutes = ?, \
             quiet_end_minutes = ?, timezone_offset_minutes = ?, quiet_allow_urgent = ?, privacy_mode = ?, \
             theme = ?, retention_days = ?, updated_at = ? WHERE id = 1",
        )
        .bind(value.notifications.completion)
        .bind(value.notifications.permission)
        .bind(value.notifications.preview)
        .bind(value.notifications.final_failure)
        .bind(value.notifications.allowance)
        .bind(value.allowance_threshold_percent)
        .bind(value.critical_allowance_notifications)
        .bind(value.quiet_hours.enabled)
        .bind(start)
        .bind(end)
        .bind(value.quiet_hours.timezone_offset_minutes)
        .bind(value.quiet_hours.allow_urgent)
        .bind(&value.privacy_mode)
        .bind(&value.theme)
        .bind(value.retention_days)
        .bind(Utc::now())
        .execute(&mut *transaction)
        .await
        .context("Không lưu được cài đặt")?;
        sqlx::query("DELETE FROM activity_events WHERE occurred_at < ?")
            .bind(Utc::now() - Duration::days(i64::from(value.retention_days)))
            .execute(&mut *transaction)
            .await
            .context("Không áp dụng được thời gian lưu")?;
        transaction
            .commit()
            .await
            .context("Không chốt được cài đặt")?;
        self.get().await
    }

    pub async fn cleanup_retention(&self) -> Result<u64> {
        let retention_days: i32 =
            sqlx::query_scalar("SELECT retention_days FROM preferences WHERE id = 1")
                .fetch_one(&self.pool)
                .await
                .context("Không đọc được thời gian lưu hoạt động")?;
        let deleted = sqlx::query("DELETE FROM activity_events WHERE occurred_at < ?")
            .bind(Utc::now() - Duration::days(i64::from(retention_days)))
            .execute(&self.pool)
            .await
            .context("Không dọn được hoạt động đã hết hạn")?;
        Ok(deleted.rows_affected())
    }
}

impl From<PreferenceRow> for Preferences {
    fn from(value: PreferenceRow) -> Self {
        Self {
            notifications: NotificationPreferences {
                completion: value.notify_completion,
                permission: value.notify_permission,
                preview: value.notify_preview,
                final_failure: value.notify_final_failure,
                allowance: value.notify_allowance,
            },
            allowance_threshold_percent: value.allowance_threshold_percent,
            critical_allowance_notifications: value.critical_allowance_notifications,
            quiet_hours: QuietHours {
                enabled: value.quiet_hours_enabled,
                start: format_time(value.quiet_start_minutes),
                end: format_time(value.quiet_end_minutes),
                timezone_offset_minutes: value.timezone_offset_minutes,
                allow_urgent: value.quiet_allow_urgent,
            },
            privacy_mode: value.privacy_mode,
            theme: value.theme,
            retention_days: value.retention_days,
        }
    }
}
