use anyhow::{Context, Result};
use chrono::{Duration, Utc};
use sha2::{Digest, Sha256};
use uuid::Uuid;

use super::store::{DeliveryJob, NotificationStore};

impl NotificationStore {
    pub async fn claim_due(&self) -> Result<Option<DeliveryJob>> {
        let now = Utc::now();
        let lease = now + Duration::seconds(30);
        let mut transaction = self.pool.begin().await.context("Không mở được hàng đợi")?;
        let mut job: Option<DeliveryJob> = sqlx::query_as(
            "SELECT j.id, p.endpoint, p.p256dh, p.auth, j.title, j.body, j.target_url, j.tag, \
             j.attempt_count, j.expires_at FROM notification_jobs j \
             JOIN push_subscriptions p ON p.id = j.subscription_id \
             WHERE j.state IN ('pending', 'retry', 'leased') AND j.next_attempt_at <= ? \
             AND (j.lease_until IS NULL OR j.lease_until <= ?) AND p.disabled_at IS NULL \
             ORDER BY j.next_attempt_at, j.created_at LIMIT 1",
        )
        .bind(now)
        .bind(now)
        .fetch_optional(&mut *transaction)
        .await
        .context("Không đọc được hàng đợi")?;
        if let Some(ref mut value) = job {
            if let Some(copy) = super::preview::copy_for_job(&mut transaction, &value.id).await? {
                value.title = copy.title;
                value.body = copy.body;
            }
            sqlx::query(
                "UPDATE notification_jobs SET state = 'leased', lease_until = ? WHERE id = ?",
            )
            .bind(lease)
            .bind(&value.id)
            .execute(&mut *transaction)
            .await
            .context("Không giữ được thông báo")?;
        }
        transaction
            .commit()
            .await
            .context("Không chốt được hàng đợi")?;
        Ok(job)
    }

    pub async fn finish(
        &self,
        job: &DeliveryJob,
        outcome: &str,
        status: Option<u16>,
    ) -> Result<()> {
        let attempt = job.attempt_count + 1;
        let retry_delay = [0, 5, 20, 60, 300, 900].get(attempt as usize).copied();
        let now = Utc::now();
        let state = outcome_state(outcome, retry_delay, job.expires_at > now);
        let next = now
            + Duration::seconds(
                retry_delay
                    .map(|base| jittered_delay(base, &job.id))
                    .unwrap_or(0),
            );
        let mut transaction = self
            .pool
            .begin()
            .await
            .context("Không lưu được kết quả gửi")?;
        sqlx::query(
            "UPDATE notification_jobs SET state = ?, attempt_count = ?, next_attempt_at = ?, \
             lease_until = NULL, last_error_code = ?, completed_at = CASE WHEN ? IN ('accepted','stale','expired','failed') THEN ? END \
             WHERE id = ?",
        )
        .bind(state)
        .bind(attempt)
        .bind(next)
        .bind((state != "accepted").then_some(outcome))
        .bind(state)
        .bind(now)
        .bind(&job.id)
        .execute(&mut *transaction)
        .await
        .context("Không cập nhật được hàng đợi")?;
        record_attempt(&mut transaction, job, attempt, outcome, status, now).await?;
        if outcome == "stale" {
            sqlx::query(
                "UPDATE push_subscriptions SET disabled_at = ?, failure_count = failure_count + 1 \
                 WHERE id = (SELECT subscription_id FROM notification_jobs WHERE id = ?)",
            )
            .bind(now)
            .bind(&job.id)
            .execute(&mut *transaction)
            .await
            .context("Không đánh dấu được đăng ký cũ")?;
        }
        transaction
            .commit()
            .await
            .context("Không hoàn tất được kết quả gửi")
    }
}

async fn record_attempt(
    transaction: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    job: &DeliveryJob,
    attempt: i64,
    outcome: &str,
    status: Option<u16>,
    now: chrono::DateTime<Utc>,
) -> Result<()> {
    sqlx::query(
        "INSERT INTO notification_attempts \
         (id, job_id, attempt_number, outcome, provider_status, stable_error_code, attempted_at) \
         VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(Uuid::new_v4().to_string())
    .bind(&job.id)
    .bind(attempt)
    .bind(outcome)
    .bind(status.map(i64::from))
    .bind((outcome != "accepted").then_some(outcome))
    .bind(now)
    .execute(&mut **transaction)
    .await
    .context("Không lưu được lần gửi")?;
    Ok(())
}

fn outcome_state(outcome: &str, retry_delay: Option<i64>, before_expiry: bool) -> &'static str {
    match outcome {
        "accepted" => "accepted",
        "stale" => "stale",
        "expired" => "expired",
        "retry" if retry_delay.is_some() && before_expiry => "retry",
        "retry" => "expired",
        _ => "failed",
    }
}

fn jittered_delay(base: i64, job_id: &str) -> i64 {
    let digest = Sha256::digest(job_id.as_bytes());
    let percent = i64::from(digest[0] % 21) - 10;
    (base + (base * percent / 100)).max(1)
}
