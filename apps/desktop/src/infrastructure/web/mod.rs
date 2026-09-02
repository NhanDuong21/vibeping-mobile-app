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
    features::{
        codex_attention, computer, notifications, pairing, preferences, system, usage_limits,
    },
};

pub fn router(state: Arc<ApplicationState>) -> Router {
    Router::new()
        .route("/api/v1/health", get(system::http::health))
        .route("/api/v1/bootstrap", get(system::http::bootstrap))
        .route("/api/v1/stream", get(system::http::stream))
        .route(
            "/api/v1/computer/status",
            get(computer::http::computer_status),
        )
        .route(
            "/api/v1/preferences",
            get(preferences::http::get).put(preferences::http::put),
        )
        .route("/api/v1/diagnostics", get(computer::http::diagnostics))
        .route(
            "/api/v1/diagnostics/run",
            post(computer::http::run_diagnostics),
        )
        .route("/api/v1/activity", get(codex_attention::http::activity))
        .route("/api/v1/events", get(codex_attention::http::events))
        .route(
            "/api/v1/events/read-all",
            post(codex_attention::http::read_all),
        )
        .route("/api/v1/events/{id}", get(codex_attention::http::event))
        .route(
            "/api/v1/events/{id}/read",
            post(codex_attention::http::read_event),
        )
        .route("/api/v1/usage-limits", get(usage_limits::http::get_limits))
        .route(
            "/api/v1/usage-limits/refresh",
            post(usage_limits::http::refresh_limits),
        )
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
