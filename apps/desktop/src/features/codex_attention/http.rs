use std::sync::Arc;

use axum::{Json, extract::State};

use crate::{app::ApplicationState, infrastructure::web::error::ApiError};

use super::{ActivitySnapshot, ActivityStore};

#[utoipa::path(
    get,
    path = "/api/v1/activity",
    responses((status = 200, description = "Current Codex work and recent activity", body = ActivitySnapshot))
)]
pub async fn activity(
    State(state): State<Arc<ApplicationState>>,
) -> Result<Json<ActivitySnapshot>, ApiError> {
    ActivityStore::new(state.database.clone())
        .snapshot()
        .await
        .map(Json)
        .map_err(|_| ApiError::unavailable("ACTIVITY_UNAVAILABLE"))
}
