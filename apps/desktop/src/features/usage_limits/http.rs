use std::{sync::Arc, time::Duration};

use axum::{Json, extract::State, http::HeaderMap};
use tokio::time::timeout;

use crate::{
    app::ApplicationState,
    features::pairing::{
        authorization::{authorize_if_claimed, require_owner},
        identity::require_mutation,
    },
    infrastructure::web::error::ApiError,
};

use super::{RefreshRequest, UsageLimitStore, UsageLimitsSnapshot, app_server::READ_TIMEOUT};

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
    let succeeded = timeout(READ_TIMEOUT + Duration::from_secs(5), completion)
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
