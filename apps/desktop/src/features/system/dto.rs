use serde::Serialize;
use utoipa::ToSchema;

use crate::features::{codex_attention::CurrentWork, usage_limits::UsageLimitsSnapshot};

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct HealthResponse {
    pub status: &'static str,
    pub service: &'static str,
    pub version: &'static str,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapResponse {
    pub server_time: String,
    pub connection: ConnectionSnapshot,
    pub cursor: String,
    pub current_work: Option<CurrentWork>,
    pub usage_limits: UsageLimitsSnapshot,
    pub unread_count: i64,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionSnapshot {
    pub desktop: &'static str,
    pub codex: &'static str,
    pub private_connection: &'static str,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ErrorEnvelope {
    pub code: &'static str,
    pub request_id: String,
}
