mod assets;
mod headers;

use std::sync::Arc;

use axum::{Router, routing::get};
use tower_http::{catch_panic::CatchPanicLayer, trace::TraceLayer};

use crate::{app::ApplicationState, features::system::http};

pub fn router(state: Arc<ApplicationState>) -> Router {
    Router::new()
        .route("/api/v1/health", get(http::health))
        .route("/api/v1/bootstrap", get(http::bootstrap))
        .route("/api/v1/stream", get(http::stream))
        .fallback(assets::serve)
        .layer(axum::middleware::from_fn(headers::apply))
        .layer(CatchPanicLayer::new())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
