use std::{future::Future, path::PathBuf, sync::Arc};

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use sqlx::SqlitePool;
use tokio::{
    net::TcpListener,
    sync::{Mutex, broadcast, mpsc},
};

use crate::features::{
    codex_attention::{ActivityStore, CodexIngress, CodexSignal},
    notifications::{VapidIdentity, migration, worker},
    preferences::PreferenceStore,
    usage_limits::{self, RefreshRequest, UsageLimitStore},
};
use crate::{config::RuntimeConfig, infrastructure};

#[derive(Clone)]
pub struct ApplicationState {
    pub database: SqlitePool,
    pub data_dir: PathBuf,
    pub csrf_token: String,
    pub started_at: DateTime<Utc>,
    pub activity_events: broadcast::Sender<String>,
    pub usage_events: broadcast::Sender<String>,
    pub usage_refresh: mpsc::Sender<RefreshRequest>,
    usage_refresh_receiver: Arc<Mutex<Option<mpsc::Receiver<RefreshRequest>>>>,
}

pub async fn build_state(config: &RuntimeConfig) -> Result<Arc<ApplicationState>> {
    let database = infrastructure::database::connect(&config.database_path()).await?;
    PreferenceStore::new(database.clone())
        .cleanup_retention()
        .await?;
    migration::import_gate0_once(config.data_dir(), &database).await?;
    VapidIdentity::load_or_create(config.data_dir())?;
    let (activity_events, _) = broadcast::channel(64);
    let (usage_events, _) = broadcast::channel(32);
    let (usage_refresh, usage_refresh_receiver) = mpsc::channel(8);
    Ok(Arc::new(ApplicationState {
        database,
        data_dir: config.data_dir().to_path_buf(),
        csrf_token: uuid::Uuid::new_v4().to_string(),
        started_at: Utc::now(),
        activity_events,
        usage_events,
        usage_refresh,
        usage_refresh_receiver: Arc::new(Mutex::new(Some(usage_refresh_receiver))),
    }))
}

impl ApplicationState {
    async fn take_usage_refresh(&self) -> mpsc::Receiver<RefreshRequest> {
        self.usage_refresh_receiver
            .lock()
            .await
            .take()
            .expect("usage supervisor starts once")
    }
}

pub async fn run_with_shutdown(
    config: RuntimeConfig,
    mut ingress: mpsc::Receiver<CodexIngress>,
    shutdown: impl Future<Output = ()> + Send + 'static,
) -> Result<()> {
    let state = build_state(&config).await?;
    let database = state.database.clone();
    let worker_database = state.database.clone();
    let worker_data_dir = state.data_dir.clone();
    let notification_worker = tokio::spawn(worker::run(worker_database, worker_data_dir));
    let usage_worker = tokio::spawn(usage_limits::supervisor::run(
        UsageLimitStore::new(state.database.clone()),
        state.take_usage_refresh().await,
        state.usage_events.clone(),
        state.activity_events.clone(),
    ));
    let activity_state = state.clone();
    let activity_worker = tokio::spawn(async move {
        let store = ActivityStore::new(activity_state.database.clone());
        while let Some(value) = ingress.recv().await {
            let refresh_usage = value.signal == CodexSignal::Completed;
            match store.ingest(&value).await {
                Ok(Some(event)) => {
                    if let Ok(json) = serde_json::to_string(&event) {
                        let _ = activity_state.activity_events.send(json);
                    }
                }
                Ok(None) => {}
                Err(error) => {
                    let reason = infrastructure::observability::SafeErrorCode::from_error(
                        "ACTIVITY_PERSIST_FAILED",
                        &error,
                    );
                    tracing::warn!(%reason, "Không lưu được tín hiệu Codex");
                }
            }
            if refresh_usage {
                let _ = activity_state
                    .usage_refresh
                    .try_send(RefreshRequest::background());
            }
        }
    });
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
    usage_worker.abort();
    activity_worker.abort();
    database.close().await;
    result
}
