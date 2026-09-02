use chrono::{DateTime, Utc};
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ComputerStatus {
    pub desktop: String,
    pub codex: String,
    pub allowance_reader: String,
    pub notifications: String,
    pub private_connection: String,
    pub last_signal_at: Option<DateTime<Utc>>,
    pub started_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticCheck {
    pub key: String,
    pub label: String,
    pub state: String,
    pub detail: String,
    pub action: Option<String>,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticsReport {
    pub generated_at: DateTime<Utc>,
    pub checks: Vec<DiagnosticCheck>,
    pub technical_report: String,
}
