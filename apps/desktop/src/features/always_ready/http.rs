use super::{ReadyStatus, config};
use crate::{
    app::ApplicationState, features::pairing::authorization::authorize_if_claimed,
    infrastructure::web::error::ApiError,
};
use axum::{Json, extract::State, http::HeaderMap};
use std::sync::Arc;

#[utoipa::path(get, path = "/api/v1/always-ready", operation_id = "always_ready_status", responses((status = 200, body = ReadyStatus)))]
pub async fn status(
    State(s): State<Arc<ApplicationState>>,
    h: HeaderMap,
) -> Result<Json<ReadyStatus>, ApiError> {
    authorize_if_claimed(&s, &h).await?;
    Ok(Json(config::status(&s.data_dir)))
}
