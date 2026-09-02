use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeMetadata {
    pub process_id: u32,
    pub api_address: String,
    pub control_address: String,
    pub control_token: String,
    pub started_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserIntent {
    pub enabled: bool,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum LifecycleStatus {
    Running {
        process_id: u32,
        api_address: String,
    },
    Stopped,
    Stale,
}

#[derive(Clone, Debug)]
pub struct DoctorReport {
    pub data_directory_ready: bool,
    pub status: LifecycleStatus,
    pub tailscale_checked: bool,
    pub tailscale_online: bool,
    pub serve_ready: bool,
    pub funnel_active: bool,
    pub stable_origin: Option<String>,
}
