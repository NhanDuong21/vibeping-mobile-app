use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use uuid::Uuid;

use crate::features::system::dto::ErrorEnvelope;

#[derive(Debug)]
pub struct ApiError {
    status: StatusCode,
    code: &'static str,
}

impl ApiError {
    pub fn bad_request(code: &'static str) -> Self {
        Self::new(StatusCode::BAD_REQUEST, code)
    }

    pub fn unauthorized(code: &'static str) -> Self {
        Self::new(StatusCode::UNAUTHORIZED, code)
    }

    pub fn forbidden(code: &'static str) -> Self {
        Self::new(StatusCode::FORBIDDEN, code)
    }

    pub fn not_found(code: &'static str) -> Self {
        Self::new(StatusCode::NOT_FOUND, code)
    }

    pub fn conflict(code: &'static str) -> Self {
        Self::new(StatusCode::CONFLICT, code)
    }

    pub fn too_many(code: &'static str) -> Self {
        Self::new(StatusCode::TOO_MANY_REQUESTS, code)
    }

    pub fn unavailable(code: &'static str) -> Self {
        Self::new(StatusCode::SERVICE_UNAVAILABLE, code)
    }

    fn new(status: StatusCode, code: &'static str) -> Self {
        Self { status, code }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(ErrorEnvelope {
                code: self.code,
                request_id: Uuid::new_v4().to_string(),
            }),
        )
            .into_response()
    }
}
