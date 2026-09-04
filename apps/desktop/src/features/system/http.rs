use std::{convert::Infallible, sync::Arc, time::Duration};

use axum::{
    Json,
    extract::State,
    http::HeaderMap,
    response::{Sse, sse::Event},
};
use chrono::Utc;

use crate::{
    app::ApplicationState,
    features::{
        codex_attention::ActivityStore,
        pairing::authorization::authorize_if_claimed,
        system::dto::{BootstrapResponse, ConnectionSnapshot, HealthResponse},
        usage_limits::UsageLimitStore,
    },
    infrastructure::web::error::ApiError,
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
pub async fn bootstrap(
    State(state): State<Arc<ApplicationState>>,
    headers: HeaderMap,
) -> Result<Json<BootstrapResponse>, ApiError> {
    authorize_if_claimed(&state, &headers).await?;
    let activity = ActivityStore::new(state.database.clone());
    let current_work = activity
        .current_work()
        .await
        .map_err(|_| ApiError::unavailable("BOOTSTRAP_UNAVAILABLE"))?;
    let unread_count = activity
        .unread_count()
        .await
        .map_err(|_| ApiError::unavailable("BOOTSTRAP_UNAVAILABLE"))?;
    let codex = if !state.data_dir.join("codex-integration.json").is_file() {
        "notInstalled"
    } else if activity
        .has_hook_signal()
        .await
        .map_err(|_| ApiError::unavailable("BOOTSTRAP_UNAVAILABLE"))?
    {
        "ready"
    } else {
        "needsReview"
    };
    let usage_limits = UsageLimitStore::new(state.database.clone())
        .snapshot()
        .await
        .map_err(|_| ApiError::unavailable("BOOTSTRAP_UNAVAILABLE"))?;
    Ok(Json(BootstrapResponse {
        server_time: Utc::now().to_rfc3339(),
        connection: ConnectionSnapshot {
            desktop: "running",
            codex,
            private_connection: "local",
        },
        cursor: state.started_at.timestamp_millis().to_string(),
        current_work,
        usage_limits,
        unread_count,
    }))
}

#[utoipa::path(
    get,
    path = "/api/v1/stream",
    responses((status = 200, description = "Foreground live event stream", content_type = "text/event-stream"))
)]
pub async fn stream(
    State(state): State<Arc<ApplicationState>>,
    headers: HeaderMap,
) -> Result<Sse<impl futures_core::Stream<Item = Result<Event, Infallible>>>, ApiError> {
    authorize_if_claimed(&state, &headers).await?;
    let mut activity = state.activity_events.subscribe();
    let mut work = state.work_events.subscribe();
    let mut usage = state.usage_events.subscribe();
    let mut stopping = state.stopping.subscribe();
    let events = async_stream::stream! {
        if *stopping.borrow() { return; }
        yield Ok(Event::default().event("connected").data("{\"type\":\"system.connected\"}"));
        loop {
            tokio::select! {
                biased;
                _ = stopping.changed() => break,
                result = activity.recv() => if let Ok(data) = result {
                    yield Ok(Event::default().event("activity").data(data));
                },
                result = work.recv() => if let Ok(data) = result {
                    yield Ok(Event::default().event("work").data(data));
                },
                result = usage.recv() => if let Ok(data) = result {
                    yield Ok(Event::default().event("allowance").data(data));
                },
                _ = tokio::time::sleep(Duration::from_secs(15)) => {
                    yield Ok(Event::default().event("heartbeat").data("{\"type\":\"system.heartbeat\"}"));
                }
            }
        }
    };
    Ok(Sse::new(events))
}
