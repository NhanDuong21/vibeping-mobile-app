use super::{PersonalRules, PersonalStore, ProjectProfile};
use crate::features::codex_attention::{ActivityStore, DailySummary};
use crate::{
    app::ApplicationState,
    features::pairing::{
        authorization::{authorize_if_claimed, require_owner},
        identity::require_mutation,
    },
    infrastructure::web::error::ApiError,
};
use axum::{
    Json,
    extract::{Query, State},
    http::HeaderMap,
};
use std::sync::Arc;

#[derive(serde::Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct DayQuery {
    from: chrono::DateTime<chrono::Utc>,
    to: chrono::DateTime<chrono::Utc>,
}
#[utoipa::path(get, path = "/api/v1/personal/today", params(DayQuery), responses((status = 200, body = DailySummary)))]
pub async fn today(
    State(s): State<Arc<ApplicationState>>,
    h: HeaderMap,
    Query(day): Query<DayQuery>,
) -> Result<Json<DailySummary>, ApiError> {
    authorize_if_claimed(&s, &h).await?;
    if day.to <= day.from || day.to - day.from > chrono::Duration::hours(26) {
        return Err(ApiError::bad_request("SUMMARY_RANGE_INVALID"));
    }
    ActivityStore::new(s.database.clone())
        .daily_summary(day.from, day.to)
        .await
        .map(Json)
        .map_err(map_error)
}

#[utoipa::path(get, path = "/api/v1/personal/rules", responses((status = 200, body = PersonalRules)))]
pub async fn rules(
    State(s): State<Arc<ApplicationState>>,
    h: HeaderMap,
) -> Result<Json<PersonalRules>, ApiError> {
    authorize_if_claimed(&s, &h).await?;
    PersonalStore::new(s.database.clone())
        .rules()
        .await
        .map(Json)
        .map_err(map_error)
}
#[utoipa::path(put, path = "/api/v1/personal/rules", request_body = PersonalRules, responses((status = 200, body = PersonalRules)))]
pub async fn save_rules(
    State(s): State<Arc<ApplicationState>>,
    h: HeaderMap,
    Json(value): Json<PersonalRules>,
) -> Result<Json<PersonalRules>, ApiError> {
    require_mutation(&h, &s.csrf_token)?;
    require_owner(&s, &h).await?;
    PersonalStore::new(s.database.clone())
        .save_rules(&value)
        .await
        .map(Json)
        .map_err(map_error)
}
#[utoipa::path(get, path = "/api/v1/personal/projects", responses((status = 200, body = Vec<ProjectProfile>)))]
pub async fn projects(
    State(s): State<Arc<ApplicationState>>,
    h: HeaderMap,
) -> Result<Json<Vec<ProjectProfile>>, ApiError> {
    authorize_if_claimed(&s, &h).await?;
    PersonalStore::new(s.database.clone())
        .projects()
        .await
        .map(Json)
        .map_err(map_error)
}
#[utoipa::path(put, path = "/api/v1/personal/projects", request_body = ProjectProfile, responses((status = 200, body = ProjectProfile)))]
pub async fn save_project(
    State(s): State<Arc<ApplicationState>>,
    h: HeaderMap,
    Json(value): Json<ProjectProfile>,
) -> Result<Json<ProjectProfile>, ApiError> {
    require_mutation(&h, &s.csrf_token)?;
    require_owner(&s, &h).await?;
    PersonalStore::new(s.database.clone())
        .save_project(&value)
        .await
        .map(Json)
        .map_err(map_error)
}
fn map_error(error: anyhow::Error) -> ApiError {
    if error.to_string() == "PERSONAL_INVALID" {
        ApiError::bad_request("PERSONAL_INVALID")
    } else {
        ApiError::unavailable("PERSONAL_UNAVAILABLE")
    }
}
