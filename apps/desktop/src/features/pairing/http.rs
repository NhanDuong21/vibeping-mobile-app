use std::sync::Arc;

use axum::{Json, extract::State, http::HeaderMap};

use crate::{app::ApplicationState, infrastructure::web::error::ApiError};

use super::{
    PairingError, PairingStore, PairingUseCase,
    dto::{PairingClaimRequest, PairingClaimResponse, PairingStatusResponse},
    identity::{RequestIdentity, require_mutation},
};

#[utoipa::path(
    get,
    path = "/api/v1/pairing/status",
    responses((status = 200, description = "Private owner pairing status", body = PairingStatusResponse))
)]
pub async fn status(
    State(state): State<Arc<ApplicationState>>,
    headers: HeaderMap,
) -> Result<Json<PairingStatusResponse>, ApiError> {
    let identity = RequestIdentity::from_headers(&headers);
    let snapshot = PairingUseCase::new(PairingStore::new(state.database.clone()))
        .status(identity.as_ref())
        .await
        .map_err(|_| ApiError::unavailable("PAIRING_UNAVAILABLE"))?;
    let pairing_state = if !snapshot.owner_exists {
        "pairingRequired"
    } else if snapshot.owner_match {
        "paired"
    } else {
        "notOwner"
    };
    Ok(Json(PairingStatusResponse {
        state: pairing_state,
        owner_match: snapshot.owner_match,
        private_identity_ready: identity.is_some(),
        code_expires_at: snapshot.code_expires_at.map(|value| value.to_rfc3339()),
        csrf_token: state.csrf_token.clone(),
    }))
}

#[utoipa::path(
    post,
    path = "/api/v1/pairing/claim",
    request_body = PairingClaimRequest,
    responses(
        (status = 200, description = "Owner paired", body = PairingClaimResponse),
        (status = 400, description = "Invalid pairing request"),
        (status = 401, description = "Private identity required"),
        (status = 409, description = "Pairing code unavailable"),
        (status = 429, description = "Pairing attempt limit reached")
    )
)]
pub async fn claim(
    State(state): State<Arc<ApplicationState>>,
    headers: HeaderMap,
    Json(request): Json<PairingClaimRequest>,
) -> Result<Json<PairingClaimResponse>, ApiError> {
    require_mutation(&headers, &state.csrf_token)?;
    let identity = RequestIdentity::from_headers(&headers);
    let device_id = PairingUseCase::new(PairingStore::new(state.database.clone()))
        .claim(identity.as_ref(), &request)
        .await
        .map_err(map_error)?;
    Ok(Json(PairingClaimResponse {
        state: "paired",
        device_id,
    }))
}

fn map_error(error: PairingError) -> ApiError {
    match error {
        PairingError::IdentityRequired => ApiError::unauthorized("PAIRING_IDENTITY_REQUIRED"),
        PairingError::InvalidCode => ApiError::bad_request("PAIRING_CODE_INVALID"),
        PairingError::ExpiredCode => ApiError::conflict("PAIRING_CODE_EXPIRED"),
        PairingError::ReusedCode => ApiError::conflict("PAIRING_CODE_REUSED"),
        PairingError::TooManyAttempts => ApiError::too_many("PAIRING_RATE_LIMITED"),
        PairingError::InvalidDevice => ApiError::bad_request("DEVICE_STATE_INVALID"),
        PairingError::StorageUnavailable => ApiError::unavailable("PAIRING_UNAVAILABLE"),
    }
}
