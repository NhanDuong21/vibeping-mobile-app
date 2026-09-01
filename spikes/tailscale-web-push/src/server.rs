use std::{path::PathBuf, sync::Arc, time::Duration};

use anyhow::{Context, Result};
use axum::{
    Router,
    body::Body,
    extract::DefaultBodyLimit,
    http::{HeaderValue, Request, header},
    middleware::{Next, from_fn},
    response::Response,
    routing::{get, post},
};
use chrono::Utc;
use tokio::net::TcpListener;
use tower_http::{services::ServeDir, trace::TraceLayer};

use crate::{api, paths::Gate0Paths, storage};

const BIND_ADDRESS: &str = "127.0.0.1:8787";

pub async fn serve(paths: Gate0Paths, stop_file: Option<PathBuf>) -> Result<()> {
    let key_pair = storage::create_or_load_vapid(&paths)?;
    let state = Arc::new(api::AppState {
        paths: paths.clone(),
        public_key: storage::public_key_base64(&key_pair),
        started_at: Utc::now(),
    });
    let app = Router::new()
        .route("/api/health", get(api::health))
        .route("/api/status", get(api::status))
        .route("/api/vapid-public-key", get(api::public_key))
        .route("/api/subscription", post(api::save_subscription))
        .route("/api/test-push", post(api::test_push))
        .fallback_service(ServeDir::new(paths.web_dir()).append_index_html_on_directories(true))
        .layer(DefaultBodyLimit::max(24 * 1024))
        .layer(from_fn(response_headers))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = TcpListener::bind(BIND_ADDRESS)
        .await
        .with_context(|| format!("could not bind {BIND_ADDRESS}"))?;
    tracing::info!(address = BIND_ADDRESS, "Gate 0 server ready");
    axum::serve(listener, app)
        .with_graceful_shutdown(wait_for_shutdown(stop_file))
        .await
        .context("Gate 0 server failed")
}

async fn wait_for_shutdown(stop_file: Option<PathBuf>) {
    loop {
        tokio::select! {
            _ = tokio::signal::ctrl_c() => break,
            _ = tokio::time::sleep(Duration::from_millis(250)) => {
                let Some(path) = &stop_file else { continue };
                if path.is_file() {
                    let _ = std::fs::remove_file(path);
                    break;
                }
            }
        }
    }
}

async fn response_headers(request: Request<Body>, next: Next) -> Response {
    let path = request.uri().path().to_owned();
    let mut response = next.run(request).await;
    let headers = response.headers_mut();
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(
        header::REFERRER_POLICY,
        HeaderValue::from_static("no-referrer"),
    );
    headers.insert("X-Frame-Options", HeaderValue::from_static("DENY"));
    headers.insert(
        header::CONTENT_SECURITY_POLICY,
        HeaderValue::from_static("default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; worker-src 'self'; manifest-src 'self'"),
    );
    if path.starts_with("/api/") || path == "/sw.js" {
        headers.insert(
            header::CACHE_CONTROL,
            HeaderValue::from_static("no-store, no-cache, must-revalidate"),
        );
    }
    response
}
