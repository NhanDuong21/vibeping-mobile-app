use std::{path::PathBuf, time::Duration};

use sqlx::SqlitePool;

use super::{NotificationStore, sender};

pub async fn run(pool: SqlitePool, data_dir: PathBuf) {
    let store = NotificationStore::new(pool.clone());
    let mut last_reminder_check = tokio::time::Instant::now() - Duration::from_secs(15);
    loop {
        if last_reminder_check.elapsed() >= Duration::from_secs(15) {
            if crate::features::personal::reminders::enqueue_due(&pool, chrono::Utc::now())
                .await
                .is_err()
            {
                tracing::warn!("Chưa kiểm tra được lời nhắc đang chờ");
            }
            last_reminder_check = tokio::time::Instant::now();
        }
        match store.claim_due().await {
            Ok(Some(job)) if job.expires_at <= chrono::Utc::now() => {
                let _ = store.finish(&job, "expired", None).await;
            }
            Ok(Some(job)) => {
                let outcome = sender::deliver(&data_dir, &job).await;
                if let Err(error) = store.finish(&job, outcome.kind, outcome.status).await {
                    let reason = crate::infrastructure::observability::SafeErrorCode::from_error(
                        "OUTBOX_WRITE_FAILED",
                        &error,
                    );
                    tracing::warn!(%reason, "Chưa lưu được kết quả thông báo");
                }
            }
            Ok(None) => tokio::time::sleep(Duration::from_millis(500)).await,
            Err(error) => {
                let reason = crate::infrastructure::observability::SafeErrorCode::from_error(
                    "OUTBOX_READ_FAILED",
                    &error,
                );
                tracing::warn!(%reason, "Hàng đợi thông báo đang chờ khôi phục");
                tokio::time::sleep(Duration::from_secs(2)).await;
            }
        }
    }
}
