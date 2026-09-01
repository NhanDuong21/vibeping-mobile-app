use std::{sync::Arc, time::Duration};

use axum::{Json, extract::State, http::HeaderMap};
use tokio::time::timeout;

use crate::{
    app::ApplicationState,
    features::pairing::{
        PairingStore,
        identity::{RequestIdentity, require_mutation},
    },
    infrastructure::web::error::ApiError,
};

use super::{RefreshRequest, UsageLimitStore, UsageLimitsSnapshot};

#[utoipa::path(
    get,
    path = "/api/v1/usage-limits",
    responses((status = 200, description = "Latest normalized Codex allowance", body = UsageLimitsSnapshot))
)]
pub async fn get_limits(
    State(state): State<Arc<ApplicationState>>,
    headers: HeaderMap,
) -> Result<Json<UsageLimitsSnapshot>, ApiError> {
    authorize_if_claimed(&state, &headers).await?;
    UsageLimitStore::new(state.database.clone())
        .snapshot()
        .await
        .map(Json)
        .map_err(|_| ApiError::unavailable("USAGE_LIMITS_UNAVAILABLE"))
}

#[utoipa::path(
    post,
    path = "/api/v1/usage-limits/refresh",
    responses(
        (status = 200, description = "Refreshed Codex allowance", body = UsageLimitsSnapshot),
        (status = 503, description = "Codex allowance reader unavailable")
    )
)]
pub async fn refresh_limits(
    State(state): State<Arc<ApplicationState>>,
    headers: HeaderMap,
) -> Result<Json<UsageLimitsSnapshot>, ApiError> {
    require_mutation(&headers, &state.csrf_token)?;
    require_owner(&state, &headers).await?;
    let (request, completion) = RefreshRequest::interactive();
    state
        .usage_refresh
        .send(request)
        .await
        .map_err(|_| ApiError::unavailable("USAGE_REFRESH_UNAVAILABLE"))?;
    let succeeded = timeout(Duration::from_secs(15), completion)
        .await
        .ok()
        .and_then(Result::ok)
        .unwrap_or(false);
    if !succeeded {
        return Err(ApiError::unavailable("USAGE_REFRESH_UNAVAILABLE"));
    }
    UsageLimitStore::new(state.database.clone())
        .snapshot()
        .await
        .map(Json)
        .map_err(|_| ApiError::unavailable("USAGE_LIMITS_UNAVAILABLE"))
}

async fn authorize_if_claimed(
    state: &ApplicationState,
    headers: &HeaderMap,
) -> Result<(), ApiError> {
    authorize_owner(state, headers, false).await
}

async fn require_owner(state: &ApplicationState, headers: &HeaderMap) -> Result<(), ApiError> {
    authorize_owner(state, headers, true).await
}

async fn authorize_owner(
    state: &ApplicationState,
    headers: &HeaderMap,
    pairing_required: bool,
) -> Result<(), ApiError> {
    let owner = PairingStore::new(state.database.clone())
        .owner_login()
        .await
        .map_err(|_| ApiError::unavailable("PAIRING_UNAVAILABLE"))?;
    let identity = RequestIdentity::from_headers(headers);
    validate_owner(owner.as_deref(), identity.as_ref(), pairing_required)
}

fn validate_owner(
    owner: Option<&str>,
    identity: Option<&RequestIdentity>,
    pairing_required: bool,
) -> Result<(), ApiError> {
    let Some(owner) = owner else {
        return if pairing_required {
            Err(ApiError::forbidden("PAIRING_REQUIRED"))
        } else {
            Ok(())
        };
    };
    let identity = identity.ok_or_else(|| ApiError::unauthorized("PRIVATE_IDENTITY_REQUIRED"))?;
    if identity.login() == owner {
        Ok(())
    } else {
        Err(ApiError::forbidden("OWNER_REQUIRED"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unclaimed_read_is_available_but_refresh_requires_pairing() {
        assert!(validate_owner(None, None, false).is_ok());
        assert!(validate_owner(None, None, true).is_err());
    }

    #[test]
    fn claimed_allowance_requires_the_matching_tailnet_owner() {
        let owner = RequestIdentity::for_test("owner@example.test");
        let visitor = RequestIdentity::for_test("visitor@example.test");

        assert!(validate_owner(Some(owner.login()), None, false).is_err());
        assert!(validate_owner(Some(owner.login()), Some(&visitor), false).is_err());
        assert!(validate_owner(Some(owner.login()), Some(&owner), true).is_ok());
    }
}
