use std::sync::Arc;

use axum::{Json, extract::State, http::HeaderMap};

use crate::{
    app::ApplicationState,
    features::pairing::{
        authorization::{authorize_if_claimed, require_owner},
        identity::require_mutation,
    },
    infrastructure::web::error::ApiError,
};

use super::{PreferenceStore, Preferences};

#[utoipa::path(
    get,
    path = "/api/v1/preferences",
    responses((status = 200, description = "Production notification and display preferences", body = Preferences))
)]
pub async fn get(
    State(state): State<Arc<ApplicationState>>,
    headers: HeaderMap,
) -> Result<Json<Preferences>, ApiError> {
    authorize_if_claimed(&state, &headers).await?;
    PreferenceStore::new(state.database.clone())
        .get()
        .await
        .map(Json)
        .map_err(|_| ApiError::unavailable("PREFERENCES_UNAVAILABLE"))
}

#[utoipa::path(
    put,
    path = "/api/v1/preferences",
    request_body = Preferences,
    responses(
        (status = 200, description = "Saved production preferences", body = Preferences),
        (status = 400, description = "Invalid preferences")
    )
)]
pub async fn put(
    State(state): State<Arc<ApplicationState>>,
    headers: HeaderMap,
    Json(request): Json<Preferences>,
) -> Result<Json<Preferences>, ApiError> {
    require_mutation(&headers, &state.csrf_token)?;
    require_owner(&state, &headers).await?;
    if !request.validate() {
        return Err(ApiError::bad_request("PREFERENCES_INVALID"));
    }
    PreferenceStore::new(state.database.clone())
        .save(&request)
        .await
        .map(Json)
        .map_err(|_| ApiError::unavailable("PREFERENCES_UNAVAILABLE"))
}
