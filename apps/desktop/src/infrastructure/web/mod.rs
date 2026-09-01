mod assets;
pub mod error;
mod headers;

use std::sync::Arc;

use axum::{
    Router,
    extract::DefaultBodyLimit,
    routing::{delete, get, post},
};
use tower_http::{catch_panic::CatchPanicLayer, trace::TraceLayer};

use crate::{
    app::ApplicationState,
    features::{codex_attention, notifications, pairing, system},
};

pub fn router(state: Arc<ApplicationState>) -> Router {
    Router::new()
        .route("/api/v1/health", get(system::http::health))
        .route("/api/v1/bootstrap", get(system::http::bootstrap))
        .route("/api/v1/stream", get(system::http::stream))
        .route("/api/v1/activity", get(codex_attention::http::activity))
        .route("/api/v1/pairing/status", get(pairing::http::status))
        .route("/api/v1/pairing/claim", post(pairing::http::claim))
        .route(
            "/api/v1/push/public-key",
            get(notifications::http::public_key),
        )
        .route(
            "/api/v1/push/subscriptions",
            post(notifications::http::subscribe),
        )
        .route(
            "/api/v1/push/subscriptions/{id}",
            delete(notifications::http::unsubscribe),
        )
        .route("/api/v1/push/test", post(notifications::http::test_push))
        .fallback(assets::serve)
        .layer(DefaultBodyLimit::max(32 * 1024))
        .layer(axum::middleware::from_fn(headers::apply))
        .layer(CatchPanicLayer::new())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
