use std::sync::Arc;

use axum::{Json, extract::State, http::HeaderMap};

use crate::{
    app::ApplicationState,
    features::pairing::{
        authorization::{authorize_if_claimed, require_owner},
        identity::{RequestIdentity, require_mutation},
    },
    infrastructure::web::error::ApiError,
};

use super::{ComputerStatus, ComputerStore, DiagnosticsReport};

#[utoipa::path(
    get,
    path = "/api/v1/computer/status",
    responses((status = 200, description = "Operational laptop status", body = ComputerStatus))
)]
pub async fn computer_status(
    State(state): State<Arc<ApplicationState>>,
    headers: HeaderMap,
) -> Result<Json<ComputerStatus>, ApiError> {
    authorize_if_claimed(&state, &headers).await?;
    status_snapshot(&state, &headers).await.map(Json)
}

#[utoipa::path(
    get,
    path = "/api/v1/diagnostics",
    responses((status = 200, description = "Sanitized diagnostic report", body = DiagnosticsReport))
)]
pub async fn diagnostics(
    State(state): State<Arc<ApplicationState>>,
    headers: HeaderMap,
) -> Result<Json<DiagnosticsReport>, ApiError> {
    authorize_if_claimed(&state, &headers).await?;
    diagnostic_snapshot(&state, &headers).await.map(Json)
}

#[utoipa::path(
    post,
    path = "/api/v1/diagnostics/run",
    responses((status = 200, description = "Fresh sanitized diagnostic report", body = DiagnosticsReport))
)]
pub async fn run_diagnostics(
    State(state): State<Arc<ApplicationState>>,
    headers: HeaderMap,
) -> Result<Json<DiagnosticsReport>, ApiError> {
    require_mutation(&headers, &state.csrf_token)?;
    require_owner(&state, &headers).await?;
    diagnostic_snapshot(&state, &headers).await.map(Json)
}

async fn diagnostic_snapshot(
    state: &ApplicationState,
    headers: &HeaderMap,
) -> Result<DiagnosticsReport, ApiError> {
    let computer = ComputerStore::new(state.database.clone(), state.data_dir.clone());
    let status = status_snapshot(state, headers).await?;
    computer
        .diagnostics(&status)
        .await
        .map_err(|_| ApiError::unavailable("DIAGNOSTICS_UNAVAILABLE"))
}

async fn status_snapshot(
    state: &ApplicationState,
    headers: &HeaderMap,
) -> Result<ComputerStatus, ApiError> {
    ComputerStore::new(state.database.clone(), state.data_dir.clone())
        .status(
            RequestIdentity::from_headers(headers).is_some(),
            state.started_at,
        )
        .await
        .map_err(|_| ApiError::unavailable("COMPUTER_STATUS_UNAVAILABLE"))
}
