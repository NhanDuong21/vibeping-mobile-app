use std::sync::Arc;

use axum::{
    Json,
    extract::State,
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Response},
};
use chrono::{DateTime, Utc};

use crate::{
    delivery::{Notification, send_notification},
    models::{ActionResponse, ApiErrorBody, PublicKeyResponse, PushSubscription, StatusResponse},
    paths::Gate0Paths,
    storage,
};

#[derive(Clone)]
pub struct AppState {
    pub paths: Gate0Paths,
    pub public_key: String,
    pub started_at: DateTime<Utc>,
}

pub async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "service": "vibeping-gate0",
        "status": "ok"
    }))
}

pub async fn status(State(state): State<Arc<AppState>>) -> Json<StatusResponse> {
    Json(StatusResponse {
        status: "ok",
        started_at: state.started_at,
        identity_ready: state.paths.vapid_file().is_file(),
        phone_ready: storage::load_subscription(&state.paths).is_ok(),
    })
}

pub async fn public_key(State(state): State<Arc<AppState>>) -> Json<PublicKeyResponse> {
    Json(PublicKeyResponse {
        public_key: state.public_key.clone(),
    })
}

pub async fn save_subscription(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(mut subscription): Json<PushSubscription>,
) -> Result<(StatusCode, Json<ActionResponse>), ApiError> {
    validate_same_origin(&headers)?;
    subscription.saved_at = Utc::now();
    storage::save_subscription(&state.paths, &subscription)
        .map_err(|_| ApiError::bad_request("INVALID_PHONE_REGISTRATION"))?;
    Ok((
        StatusCode::CREATED,
        Json(ActionResponse {
            ok: true,
            code: "PHONE_READY",
        }),
    ))
}

pub async fn test_push(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Json<ActionResponse>, ApiError> {
    validate_same_origin(&headers)?;
    let result = send_notification(&state.paths, Notification::test())
        .await
        .map_err(|error| {
            let text = error.to_string();
            if text.contains("missing") {
                ApiError::conflict("PHONE_NOT_READY")
            } else {
                ApiError::service_unavailable("DELIVERY_UNAVAILABLE")
            }
        })?;
    if result.accepted {
        Ok(Json(ActionResponse {
            ok: true,
            code: "DELIVERY_ACCEPTED",
        }))
    } else if result.stale {
        Err(ApiError::conflict("PHONE_REGISTRATION_STALE"))
    } else if result.retryable {
        Err(ApiError::too_many("DELIVERY_RETRY_LATER"))
    } else {
        Err(ApiError::service_unavailable("DELIVERY_REJECTED"))
    }
}

fn validate_same_origin(headers: &HeaderMap) -> Result<(), ApiError> {
    let Some(origin) = headers.get(header::ORIGIN) else {
        return Ok(());
    };
    let host = headers
        .get(header::HOST)
        .and_then(|value| value.to_str().ok());
    let origin = origin.to_str().ok().and_then(origin_authority);
    if origin.as_deref() == host {
        Ok(())
    } else {
        Err(ApiError::forbidden("ORIGIN_NOT_ALLOWED"))
    }
}

fn origin_authority(origin: &str) -> Option<String> {
    let (_, rest) = origin.split_once("://")?;
    Some(rest.split('/').next()?.to_owned())
}

#[derive(Debug)]
pub struct ApiError {
    status: StatusCode,
    code: &'static str,
}

impl ApiError {
    fn bad_request(code: &'static str) -> Self {
        Self {
            status: StatusCode::BAD_REQUEST,
            code,
        }
    }
    fn forbidden(code: &'static str) -> Self {
        Self {
            status: StatusCode::FORBIDDEN,
            code,
        }
    }
    fn conflict(code: &'static str) -> Self {
        Self {
            status: StatusCode::CONFLICT,
            code,
        }
    }
    fn too_many(code: &'static str) -> Self {
        Self {
            status: StatusCode::TOO_MANY_REQUESTS,
            code,
        }
    }
    fn service_unavailable(code: &'static str) -> Self {
        Self {
            status: StatusCode::SERVICE_UNAVAILABLE,
            code,
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let body = ApiErrorBody {
            error_code: self.code,
            message: "Gate 0 request failed",
        };
        (self.status, Json(body)).into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::origin_authority;

    #[test]
    fn origin_authority_ignores_path() {
        assert_eq!(
            origin_authority("https://example.test/path").as_deref(),
            Some("example.test")
        );
    }
}
