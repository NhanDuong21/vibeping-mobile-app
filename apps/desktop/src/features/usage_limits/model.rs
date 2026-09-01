use chrono::{DateTime, Utc};
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Clone, Debug)]
pub struct NormalizedLimits {
    pub read_at: DateTime<Utc>,
    pub windows: Vec<NormalizedWindow>,
}

#[derive(Clone, Debug)]
pub struct NormalizedWindow {
    pub window_key: String,
    pub label: String,
    pub window_kind: &'static str,
    pub remaining_percent: f64,
    pub duration_minutes: i64,
    pub resets_at: i64,
    pub reached: bool,
}

#[derive(Clone, Debug, Serialize, sqlx::FromRow, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UsageLimitWindow {
    pub window_key: String,
    pub label: String,
    pub window_kind: String,
    pub remaining_percent: f64,
    pub duration_minutes: i64,
    pub resets_at: i64,
    pub reached: bool,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UsageLimitsSnapshot {
    pub state: String,
    pub read_at: Option<DateTime<Utc>>,
    pub windows: Vec<UsageLimitWindow>,
    pub cursor: String,
}
