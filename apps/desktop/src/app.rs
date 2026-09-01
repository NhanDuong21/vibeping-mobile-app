use std::{future::Future, sync::Arc};

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

pub async fn run_with_shutdown(
    config: RuntimeConfig,
    shutdown: impl Future<Output = ()> + Send + 'static,
) -> Result<()> {
    let state = build_state(&config).await?;
    let database = state.database.clone();
    let router = infrastructure::web::router(state);
    let listener = TcpListener::bind(config.bind_address())
        .await
        .with_context(|| format!("Không mở được cổng cục bộ {}", config.bind_address()))?;
    tracing::info!(address = %config.bind_address(), "VibePing đã sẵn sàng");

    let result = axum::serve(listener, router)
        .with_graceful_shutdown(shutdown)
        .await
        .context("VibePing đã dừng ngoài dự kiến");
    database.close().await;
    result
}
