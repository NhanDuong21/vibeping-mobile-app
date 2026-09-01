use std::sync::Arc;

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use sqlx::SqlitePool;
use tokio::net::TcpListener;

use crate::{config::RuntimeConfig, infrastructure};

#[derive(Clone)]
pub struct ApplicationState {
    pub database: SqlitePool,
    pub started_at: DateTime<Utc>,
}

pub async fn build_state(config: &RuntimeConfig) -> Result<Arc<ApplicationState>> {
    let database = infrastructure::database::connect(&config.database_path()).await?;
    Ok(Arc::new(ApplicationState {
        database,
        started_at: Utc::now(),
    }))
}

pub async fn run(config: RuntimeConfig) -> Result<()> {
    let state = build_state(&config).await?;
    let router = infrastructure::web::router(state);
    let listener = TcpListener::bind(config.bind_address())
        .await
        .with_context(|| format!("Không mở được cổng cục bộ {}", config.bind_address()))?;
    tracing::info!(address = %config.bind_address(), "VibePing đã sẵn sàng");

    axum::serve(listener, router)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .context("VibePing đã dừng ngoài dự kiến")
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
}
