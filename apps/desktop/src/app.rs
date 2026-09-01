use std::{future::Future, path::PathBuf, sync::Arc};

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use sqlx::SqlitePool;
use tokio::net::TcpListener;

use crate::features::notifications::{VapidIdentity, migration, worker};
use crate::{config::RuntimeConfig, infrastructure};

#[derive(Clone)]
pub struct ApplicationState {
    pub database: SqlitePool,
    pub data_dir: PathBuf,
    pub csrf_token: String,
    pub started_at: DateTime<Utc>,
}

pub async fn build_state(config: &RuntimeConfig) -> Result<Arc<ApplicationState>> {
    let database = infrastructure::database::connect(&config.database_path()).await?;
    migration::import_gate0_once(config.data_dir(), &database).await?;
    VapidIdentity::load_or_create(config.data_dir())?;
    Ok(Arc::new(ApplicationState {
        database,
        data_dir: config.data_dir().to_path_buf(),
        csrf_token: uuid::Uuid::new_v4().to_string(),
        started_at: Utc::now(),
    }))
}

pub async fn run_with_shutdown(
    config: RuntimeConfig,
    shutdown: impl Future<Output = ()> + Send + 'static,
) -> Result<()> {
    let state = build_state(&config).await?;
    let database = state.database.clone();
    let worker_database = state.database.clone();
    let worker_data_dir = state.data_dir.clone();
    let notification_worker = tokio::spawn(worker::run(worker_database, worker_data_dir));
    let router = infrastructure::web::router(state);
    let listener = TcpListener::bind(config.bind_address())
        .await
        .with_context(|| format!("Không mở được cổng cục bộ {}", config.bind_address()))?;
    tracing::info!(address = %config.bind_address(), "VibePing đã sẵn sàng");

    let result = axum::serve(listener, router)
        .with_graceful_shutdown(shutdown)
        .await
        .context("VibePing đã dừng ngoài dự kiến");
    notification_worker.abort();
    database.close().await;
    result
}
