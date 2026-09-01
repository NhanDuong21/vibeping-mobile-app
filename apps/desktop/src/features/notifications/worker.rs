use std::{path::PathBuf, time::Duration};

use sqlx::SqlitePool;

use super::{NotificationStore, sender};

pub async fn run(pool: SqlitePool, data_dir: PathBuf) {
    let store = NotificationStore::new(pool);
    loop {
        match store.claim_due().await {
            Ok(Some(job)) if job.expires_at <= chrono::Utc::now() => {
                let _ = store.finish(&job, "expired", None).await;
            }
            Ok(Some(job)) => {
                let outcome = sender::deliver(&data_dir, &job).await;
                if let Err(error) = store.finish(&job, outcome.kind, outcome.status).await {
                    tracing::warn!(reason = %error, "Chưa lưu được kết quả thông báo");
                }
            }
            Ok(None) => tokio::time::sleep(Duration::from_millis(500)).await,
            Err(error) => {
                tracing::warn!(reason = %error, "Hàng đợi thông báo đang chờ khôi phục");
                tokio::time::sleep(Duration::from_secs(2)).await;
            }
        }
    }
}
