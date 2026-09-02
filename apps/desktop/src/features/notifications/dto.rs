use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PublicKeyResponse {
    pub public_key: String,
}

#[derive(Clone, Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionRegistrationRequest {
    pub installation_id: String,
    pub display_mode: String,
    pub notification_permission: String,
    pub subscription: BrowserSubscription,
}

#[derive(Clone, Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BrowserSubscription {
    pub endpoint: String,
    pub expiration_time: Option<serde_json::Value>,
    pub keys: SubscriptionKeys,
}

#[derive(Clone, Debug, Deserialize, ToSchema)]
pub struct SubscriptionKeys {
    pub p256dh: String,
    pub auth: String,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionResponse {
    pub id: String,
    pub state: &'static str,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestPushRequest {
    pub installation_id: String,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestPushResponse {
    pub state: &'static str,
    pub queued: usize,
    pub send_after: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ActionResponse {
    pub state: &'static str,
}
