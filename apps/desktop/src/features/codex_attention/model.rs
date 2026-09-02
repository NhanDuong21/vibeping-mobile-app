use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexIngress {
    pub session_key: String,
    pub turn_key: String,
    pub project_name: String,
    pub signal: CodexSignal,
    pub occurred_at: DateTime<Utc>,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CodexSignal {
    Started,
    Progressed,
    PermissionRequired,
    TestPassed,
    TestFailed,
    PreviewReady,
    Stopped,
    Completed,
}

#[derive(Clone, Debug, Serialize, sqlx::FromRow, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEvent {
    pub id: String,
    pub event_type: String,
    pub title: String,
    pub summary: String,
    pub project_name: String,
    pub occurred_at: DateTime<Utc>,
    pub is_read: bool,
}

#[derive(Clone, Debug, Serialize, sqlx::FromRow, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CurrentWork {
    pub project_name: String,
    pub state: String,
    pub started_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ActivitySnapshot {
    pub current_work: Option<CurrentWork>,
    pub events: Vec<ActivityEvent>,
    pub cursor: String,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct EventFeed {
    pub events: Vec<ActivityEvent>,
    pub next_cursor: Option<String>,
    pub unread_count: i64,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ReadStateResponse {
    pub state: &'static str,
    pub unread_count: i64,
}
