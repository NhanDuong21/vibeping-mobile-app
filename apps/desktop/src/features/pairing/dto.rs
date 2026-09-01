use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PairingStatusResponse {
    pub state: &'static str,
    pub owner_match: bool,
    pub private_identity_ready: bool,
    pub code_expires_at: Option<String>,
    pub csrf_token: String,
}

#[derive(Clone, Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PairingClaimRequest {
    pub code: String,
    pub installation_id: String,
    pub display_mode: String,
    pub notification_permission: String,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PairingClaimResponse {
    pub state: &'static str,
    pub device_id: String,
}
