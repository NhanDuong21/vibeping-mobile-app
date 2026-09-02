use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Deserialize, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct NotificationPreferences {
    pub completion: bool,
    pub permission: bool,
    pub preview: bool,
    pub final_failure: bool,
    pub allowance: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct QuietHours {
    pub enabled: bool,
    pub start: String,
    pub end: String,
    pub timezone_offset_minutes: i32,
    pub allow_urgent: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Preferences {
    pub notifications: NotificationPreferences,
    pub allowance_threshold_percent: i32,
    pub critical_allowance_notifications: bool,
    pub quiet_hours: QuietHours,
    pub privacy_mode: String,
    pub theme: String,
    pub retention_days: i32,
}

impl Preferences {
    pub fn validate(&self) -> bool {
        (1..=50).contains(&self.allowance_threshold_percent)
            && (7..=365).contains(&self.retention_days)
            && (-720..=840).contains(&self.quiet_hours.timezone_offset_minutes)
            && matches!(self.privacy_mode.as_str(), "standard" | "private")
            && matches!(self.theme.as_str(), "system" | "light" | "dark")
            && parse_time(&self.quiet_hours.start).is_some()
            && parse_time(&self.quiet_hours.end).is_some()
            && (!self.quiet_hours.enabled || self.quiet_hours.start != self.quiet_hours.end)
    }
}

pub(super) fn parse_time(value: &str) -> Option<i32> {
    let (hour, minute) = value.split_once(':')?;
    let hour: i32 = hour.parse().ok()?;
    let minute: i32 = minute.parse().ok()?;
    (hour < 24 && minute < 60 && hour >= 0 && minute >= 0).then_some(hour * 60 + minute)
}

pub(super) fn format_time(minutes: i32) -> String {
    format!("{:02}:{:02}", minutes / 60, minutes % 60)
}
