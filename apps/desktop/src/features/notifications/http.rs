use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, State},
    http::HeaderMap,
};
use base64ct::{Base64UrlUnpadded, Encoding as _};
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::{app::ApplicationState, infrastructure::web::error::ApiError};

use super::{
    NotificationStore, VapidIdentity,
    dto::{
        ActionResponse, PublicKeyResponse, SubscriptionRegistrationRequest, SubscriptionResponse,
        TestPushRequest, TestPushResponse,
    },
};
use crate::features::pairing::identity::{RequestIdentity, require_mutation};

#[utoipa::path(
    get,
    path = "/api/v1/push/public-key",
    responses((status = 200, description = "Persistent browser push sender key", body = PublicKeyResponse))
)]
pub async fn public_key(
    State(state): State<Arc<ApplicationState>>,
) -> Result<Json<PublicKeyResponse>, ApiError> {
    let identity = VapidIdentity::load_or_create(&state.data_dir)
        .map_err(|_| ApiError::unavailable("PUSH_IDENTITY_UNAVAILABLE"))?;
    Ok(Json(PublicKeyResponse {
        public_key: identity.public_key().to_owned(),
    }))
}

#[utoipa::path(
    post,
    path = "/api/v1/push/subscriptions",
    request_body = SubscriptionRegistrationRequest,
    responses(
        (status = 200, description = "Push subscription saved", body = SubscriptionResponse),
        (status = 400, description = "Invalid subscription"),
        (status = 401, description = "Private identity required")
    )
)]
pub async fn subscribe(
    State(state): State<Arc<ApplicationState>>,
    headers: HeaderMap,
    Json(request): Json<SubscriptionRegistrationRequest>,
) -> Result<Json<SubscriptionResponse>, ApiError> {
    require_mutation(&headers, &state.csrf_token)?;
    validate_registration(&request)?;
    let identity = RequestIdentity::from_headers(&headers)
        .ok_or_else(|| ApiError::unauthorized("PRIVATE_IDENTITY_REQUIRED"))?;
    let store = NotificationStore::new(state.database.clone());
    let owner = authorize_owner_or_readiness(&store, &identity).await?;
    let id = store
        .register(&request, owner.then_some(1))
        .await
        .map_err(|_| ApiError::unavailable("SUBSCRIPTION_UNAVAILABLE"))?;
    Ok(Json(SubscriptionResponse {
        id,
        state: "active",
    }))
}

#[utoipa::path(
    delete,
    path = "/api/v1/push/subscriptions/{id}",
    params(("id" = String, Path, description = "Subscription identifier")),
    responses((status = 200, description = "Subscription removed", body = ActionResponse))
)]
pub async fn unsubscribe(
    State(state): State<Arc<ApplicationState>>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<ActionResponse>, ApiError> {
    require_mutation(&headers, &state.csrf_token)?;
    let identity = RequestIdentity::from_headers(&headers)
        .ok_or_else(|| ApiError::unauthorized("PRIVATE_IDENTITY_REQUIRED"))?;
    let store = NotificationStore::new(state.database.clone());
    require_owner(&store, &identity).await?;
    if !store
        .remove(&id)
        .await
        .map_err(|_| ApiError::unavailable("SUBSCRIPTION_UNAVAILABLE"))?
    {
        return Err(ApiError::not_found("SUBSCRIPTION_NOT_FOUND"));
    }
    Ok(Json(ActionResponse { state: "removed" }))
}

#[utoipa::path(
    post,
    path = "/api/v1/push/test",
    request_body = TestPushRequest,
    responses(
        (status = 200, description = "Delayed test push queued", body = TestPushResponse),
        (status = 409, description = "Phone is not ready"),
        (status = 429, description = "Test rate limited")
    )
)]
pub async fn test_push(
    State(state): State<Arc<ApplicationState>>,
    headers: HeaderMap,
    Json(request): Json<TestPushRequest>,
) -> Result<Json<TestPushResponse>, ApiError> {
    require_mutation(&headers, &state.csrf_token)?;
    let identity = RequestIdentity::from_headers(&headers)
        .ok_or_else(|| ApiError::unauthorized("PRIVATE_IDENTITY_REQUIRED"))?;
    if Uuid::parse_str(&request.installation_id).is_err() {
        return Err(ApiError::bad_request("DEVICE_STATE_INVALID"));
    }
    let store = NotificationStore::new(state.database.clone());
    let owner_exists = authorize_owner_or_readiness(&store, &identity).await?;
    let identity_key =
        Base64UrlUnpadded::encode_string(&Sha256::digest(identity.login().as_bytes()));
    if !store
        .enforce_rate_limit("test_push", &identity_key, 3)
        .await
        .map_err(|_| ApiError::unavailable("RATE_LIMIT_UNAVAILABLE"))?
    {
        return Err(ApiError::too_many("TEST_PUSH_RATE_LIMITED"));
    }
    let (queued, send_after, dedupe) = store
        .enqueue_test(&request.installation_id, owner_exists)
        .await
        .map_err(|error| {
            if error.to_string().contains("PHONE_NOT_READY") {
                ApiError::conflict("PHONE_NOT_READY")
            } else {
                ApiError::unavailable("PUSH_QUEUE_UNAVAILABLE")
            }
        })?;
    let provider_accepted = store
        .wait_for_test_acceptance(&dedupe)
        .await
        .map_err(|_| ApiError::unavailable("PUSH_QUEUE_UNAVAILABLE"))?;
    Ok(Json(TestPushResponse {
        state: if provider_accepted {
            "providerAccepted"
        } else {
            "queued"
        },
        queued,
        send_after: send_after.to_rfc3339(),
    }))
}

async fn authorize_owner_or_readiness(
    store: &NotificationStore,
    identity: &RequestIdentity,
) -> Result<bool, ApiError> {
    match store
        .owner_login()
        .await
        .map_err(|_| ApiError::unavailable("PAIRING_UNAVAILABLE"))?
    {
        Some(owner) if owner == identity.login() => Ok(true),
        Some(_) => Err(ApiError::forbidden("OWNER_REQUIRED")),
        None => Ok(false),
    }
}

async fn require_owner(
    store: &NotificationStore,
    identity: &RequestIdentity,
) -> Result<(), ApiError> {
    if authorize_owner_or_readiness(store, identity).await? {
        Ok(())
    } else {
        Err(ApiError::forbidden("PAIRING_REQUIRED"))
    }
}

fn validate_registration(request: &SubscriptionRegistrationRequest) -> Result<(), ApiError> {
    let subscription = &request.subscription;
    let public = Base64UrlUnpadded::decode_vec(&subscription.keys.p256dh)
        .map_err(|_| ApiError::bad_request("SUBSCRIPTION_INVALID"))?;
    let auth = Base64UrlUnpadded::decode_vec(&subscription.keys.auth)
        .map_err(|_| ApiError::bad_request("SUBSCRIPTION_INVALID"))?;
    if Uuid::parse_str(&request.installation_id).is_err()
        || !matches!(request.display_mode.as_str(), "browser" | "standalone")
        || !matches!(
            request.notification_permission.as_str(),
            "default" | "granted" | "denied"
        )
        || !subscription.endpoint.starts_with("https://")
        || subscription.endpoint.len() > 4096
        || public.len() != 65
        || auth.len() != 16
    {
        return Err(ApiError::bad_request("SUBSCRIPTION_INVALID"));
    }
    Ok(())
}
