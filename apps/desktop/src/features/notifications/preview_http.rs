use super::{NotificationStore, dto::NotificationPreview};
use crate::{
    app::ApplicationState, features::pairing::authorization::authorize_if_claimed,
    infrastructure::web::error::ApiError,
};
use axum::{Json, extract::State, http::HeaderMap};
use std::sync::Arc;

#[utoipa::path(
    get, path = "/api/v1/notifications/preview",
    responses((status = 200, description = "Latest notification in each privacy mode", body = NotificationPreview))
)]
pub async fn preview(
    State(state): State<Arc<ApplicationState>>,
    headers: HeaderMap,
) -> Result<Json<NotificationPreview>, ApiError> {
    authorize_if_claimed(&state, &headers).await?;
    NotificationStore::new(state.database.clone())
        .preview()
        .await
        .map(Json)
        .map_err(|_| ApiError::unavailable("NOTIFICATION_PREVIEW_UNAVAILABLE"))
}
