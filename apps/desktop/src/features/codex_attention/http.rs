use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, Query, State},
    http::HeaderMap,
};
use serde::Deserialize;
use utoipa::IntoParams;

use crate::{
    app::ApplicationState,
    features::pairing::{
        authorization::{authorize_if_claimed, require_owner},
        identity::require_mutation,
    },
    infrastructure::web::error::ApiError,
};

use super::{ActivityEvent, ActivitySnapshot, ActivityStore, EventFeed, ReadStateResponse};

#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct EventListQuery {
    cursor: Option<String>,
    limit: Option<u8>,
}

#[utoipa::path(
    get,
    path = "/api/v1/activity",
    responses((status = 200, description = "Current Codex work and recent activity", body = ActivitySnapshot))
)]
pub async fn activity(
    State(state): State<Arc<ApplicationState>>,
    headers: HeaderMap,
) -> Result<Json<ActivitySnapshot>, ApiError> {
    authorize_if_claimed(&state, &headers).await?;
    ActivityStore::new(state.database.clone())
        .snapshot()
        .await
        .map(Json)
        .map_err(|_| ApiError::unavailable("ACTIVITY_UNAVAILABLE"))
}

#[utoipa::path(
    get,
    path = "/api/v1/events",
    params(EventListQuery),
    responses(
        (status = 200, description = "Cursor-paginated activity feed", body = EventFeed),
        (status = 400, description = "Invalid cursor or limit")
    )
)]
pub async fn events(
    State(state): State<Arc<ApplicationState>>,
    headers: HeaderMap,
    Query(query): Query<EventListQuery>,
) -> Result<Json<EventFeed>, ApiError> {
    authorize_if_claimed(&state, &headers).await?;
    ActivityStore::new(state.database.clone())
        .list_events(query.cursor.as_deref(), query.limit.unwrap_or(20))
        .await
        .map(Json)
        .map_err(map_feed_error)
}

#[utoipa::path(
    get,
    path = "/api/v1/events/{id}",
    params(("id" = String, Path, description = "Activity event identifier")),
    responses(
        (status = 200, description = "Activity event detail", body = ActivityEvent),
        (status = 404, description = "Activity event not found")
    )
)]
pub async fn event(
    State(state): State<Arc<ApplicationState>>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<ActivityEvent>, ApiError> {
    authorize_if_claimed(&state, &headers).await?;
    ActivityStore::new(state.database.clone())
        .event(&id)
        .await
        .map_err(|_| ApiError::unavailable("ACTIVITY_UNAVAILABLE"))?
        .map(Json)
        .ok_or_else(|| ApiError::not_found("ACTIVITY_NOT_FOUND"))
}

#[utoipa::path(
    post,
    path = "/api/v1/events/{id}/read",
    params(("id" = String, Path, description = "Activity event identifier")),
    responses(
        (status = 200, description = "Activity event marked read", body = ReadStateResponse),
        (status = 404, description = "Activity event not found")
    )
)]
pub async fn read_event(
    State(state): State<Arc<ApplicationState>>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<ReadStateResponse>, ApiError> {
    require_mutation(&headers, &state.csrf_token)?;
    require_owner(&state, &headers).await?;
    ActivityStore::new(state.database.clone())
        .mark_read(&id)
        .await
        .map_err(|_| ApiError::unavailable("ACTIVITY_UNAVAILABLE"))?
        .map(Json)
        .ok_or_else(|| ApiError::not_found("ACTIVITY_NOT_FOUND"))
}

#[utoipa::path(
    post,
    path = "/api/v1/events/read-all",
    responses((status = 200, description = "All activity events marked read", body = ReadStateResponse))
)]
pub async fn read_all(
    State(state): State<Arc<ApplicationState>>,
    headers: HeaderMap,
) -> Result<Json<ReadStateResponse>, ApiError> {
    require_mutation(&headers, &state.csrf_token)?;
    require_owner(&state, &headers).await?;
    ActivityStore::new(state.database.clone())
        .mark_all_read()
        .await
        .map(Json)
        .map_err(|_| ApiError::unavailable("ACTIVITY_UNAVAILABLE"))
}

fn map_feed_error(error: anyhow::Error) -> ApiError {
    if error.to_string().contains("ACTIVITY_LIMIT_INVALID") {
        ApiError::bad_request("ACTIVITY_LIMIT_INVALID")
    } else if error.to_string().contains("ACTIVITY_CURSOR_INVALID") {
        ApiError::bad_request("ACTIVITY_CURSOR_INVALID")
    } else {
        ApiError::unavailable("ACTIVITY_UNAVAILABLE")
    }
}
