use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::{fs, path::Path};
use utoipa::ToSchema;

#[derive(Clone, Default, Deserialize, Serialize)]
pub struct ReadyConfig {
    pub enabled: bool,
    pub auto_start: bool,
    pub port: u16,
}

#[derive(Clone, Deserialize, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ReadyStatus {
    pub enabled: bool,
    pub auto_start: bool,
    pub state: String,
    pub checked_at: Option<DateTime<Utc>>,
    pub recovery_count: u32,
    pub tray_available: bool,
}

pub fn read(directory: &Path) -> ReadyConfig {
    fs::read(directory.join("always-ready.json"))
        .ok()
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or_default()
}
pub fn write(directory: &Path, value: &ReadyConfig) -> Result<()> {
    // Separate temporary files prevent readers from accepting half-written configuration.
    let temp = directory.join("always-ready.incoming.json");
    fs::write(&temp, serde_json::to_vec(value)?)?;
    fs::rename(temp, directory.join("always-ready.json"))?;
    Ok(())
}
pub fn status(directory: &Path) -> ReadyStatus {
    let config = read(directory);
    let saved: Option<ReadyStatus> = fs::read(directory.join("always-ready-status.json"))
        .ok()
        .and_then(|b| serde_json::from_slice(&b).ok());
    let mut value = saved.unwrap_or(ReadyStatus {
        enabled: config.enabled,
        auto_start: config.auto_start,
        state: "disabled".into(),
        checked_at: None,
        recovery_count: 0,
        tray_available: false,
    });
    value.enabled = config.enabled;
    value.auto_start = config.auto_start;
    if !config.enabled {
        value.state = "disabled".into();
        value.tray_available = false;
    } else if value
        .checked_at
        .is_none_or(|at| Utc::now() - at > chrono::Duration::seconds(75))
    {
        value.state = "unavailable".into();
        value.tray_available = false;
    }
    value
}
pub fn save_status(directory: &Path, status: &ReadyStatus) -> Result<()> {
    let temp = directory.join("always-ready-status.incoming.json");
    fs::write(&temp, serde_json::to_vec(status)?)?;
    fs::rename(temp, directory.join("always-ready-status.json"))?;
    Ok(())
}
