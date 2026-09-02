use std::path::PathBuf;

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use sqlx::SqlitePool;

use crate::features::{codex_attention::ActivityStore, usage_limits::UsageLimitStore};

use super::ComputerStatus;

#[derive(Clone)]
pub struct ComputerStore {
    pool: SqlitePool,
    data_dir: PathBuf,
}

impl ComputerStore {
    pub fn new(pool: SqlitePool, data_dir: PathBuf) -> Self {
        Self { pool, data_dir }
    }

    pub async fn status(
        &self,
        private_ready: bool,
        started_at: DateTime<Utc>,
    ) -> Result<ComputerStatus> {
        let allowance = UsageLimitStore::new(self.pool.clone()).snapshot().await?;
        let active_subscriptions: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM push_subscriptions p JOIN mobile_devices d ON d.id = p.device_id \
             WHERE p.disabled_at IS NULL AND d.owner_id = 1",
        )
        .fetch_one(&self.pool)
        .await
        .context("Không đọc được trạng thái thông báo")?;
        let last_signal_at: Option<DateTime<Utc>> =
            sqlx::query_scalar("SELECT MAX(occurred_at) FROM activity_events")
                .fetch_one(&self.pool)
                .await
                .context("Không đọc được tín hiệu gần nhất")?;
        let installed = self.data_dir.join("codex-integration.json").is_file();
        let hook_ready = ActivityStore::new(self.pool.clone())
            .has_hook_signal()
            .await?;
        let codex = match (installed, hook_ready, allowance.state.as_str()) {
            (false, _, _) => "notInstalled",
            (true, false, _) => "needsReview",
            (true, true, "available" | "noWindows") => "connected",
            (true, true, _) => "reconnecting",
        };
        Ok(ComputerStatus {
            desktop: "running".into(),
            codex: codex.into(),
            allowance_reader: allowance.state,
            notifications: if active_subscriptions > 0 {
                "ready".into()
            } else {
                "needsAttention".into()
            },
            private_connection: if private_ready {
                "ready"
            } else {
                "unavailable"
            }
            .into(),
            last_signal_at,
            started_at,
        })
    }

    pub(super) async fn database_ready(&self) -> bool {
        sqlx::query_scalar::<_, i64>("SELECT 1")
            .fetch_one(&self.pool)
            .await
            .is_ok()
    }

    pub(super) async fn pending_jobs(&self) -> Result<i64> {
        sqlx::query_scalar(
            "SELECT COUNT(*) FROM notification_jobs WHERE state IN ('pending', 'retry', 'leased')",
        )
        .fetch_one(&self.pool)
        .await
        .context("Không đọc được hàng đợi thông báo")
    }
}
