use std::{convert::Infallible, sync::Arc, time::Duration};

use axum::{
    Json,
    extract::State,
    response::{Sse, sse::Event},
};
use chrono::Utc;

use crate::{
    app::ApplicationState,
    features::system::dto::{BootstrapResponse, ConnectionSnapshot, HealthResponse},
};

#[utoipa::path(
    get,
    path = "/api/v1/health",
    responses((status = 200, description = "Application health", body = HealthResponse))
)]
pub async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        service: "vibeping",
        version: env!("CARGO_PKG_VERSION"),
    })
}

#[utoipa::path(
    get,
    path = "/api/v1/bootstrap",
    responses((status = 200, description = "Initial client snapshot", body = BootstrapResponse))
)]
pub async fn bootstrap(State(state): State<Arc<ApplicationState>>) -> Json<BootstrapResponse> {
    let _database_is_ready = &state.database;
    Json(BootstrapResponse {
        server_time: Utc::now().to_rfc3339(),
        connection: ConnectionSnapshot {
            desktop: "running",
            codex: "pending",
            private_connection: "local",
        },
        cursor: state.started_at.timestamp_millis().to_string(),
    })
}

#[utoipa::path(
    get,
    path = "/api/v1/stream",
    responses((status = 200, description = "Foreground live event stream", content_type = "text/event-stream"))
)]
pub async fn stream() -> Sse<impl futures_core::Stream<Item = Result<Event, Infallible>>> {
    let events = async_stream::stream! {
        yield Ok(Event::default().event("connected").data("{\"type\":\"system.connected\"}"));
        loop {
            tokio::time::sleep(Duration::from_secs(15)).await;
            yield Ok(Event::default().event("heartbeat").data("{\"type\":\"system.heartbeat\"}"));
        }
    };
    Sse::new(events)
}
