use anyhow::{Context, Result, bail};
use chrono::{DateTime, Duration, Utc};
use sqlx::{FromRow, SqlitePool};
use uuid::Uuid;

use super::dto::SubscriptionRegistrationRequest;

#[derive(Clone)]
pub struct NotificationStore {
    pub(super) pool: SqlitePool,
}

#[derive(Clone, Debug, FromRow)]
pub struct DeliveryJob {
    pub id: String,
    pub endpoint: String,
    pub p256dh: String,
    pub auth: String,
    pub title: String,
    pub body: String,
    pub target_url: String,
    pub tag: String,
    pub attempt_count: i64,
    pub expires_at: DateTime<Utc>,
}

impl NotificationStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn owner_login(&self) -> Result<Option<String>> {
        sqlx::query_scalar("SELECT tailscale_login FROM owner_identity WHERE id = 1")
            .fetch_optional(&self.pool)
            .await
            .context("Không đọc được chủ sở hữu")
    }

    pub async fn register(
        &self,
        request: &SubscriptionRegistrationRequest,
        owner_id: Option<i64>,
    ) -> Result<String> {
        let now = Utc::now();
        let device_candidate = Uuid::new_v4().to_string();
        let subscription_candidate = Uuid::new_v4().to_string();
        let mut transaction = self
            .pool
            .begin()
            .await
            .context("Không bắt đầu được đăng ký")?;
        sqlx::query(
            "INSERT INTO mobile_devices \
             (id, owner_id, installation_id, display_mode, notification_permission, created_at, last_seen_at) \
             VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(installation_id) DO UPDATE SET \
             owner_id = COALESCE(excluded.owner_id, mobile_devices.owner_id), \
             display_mode = excluded.display_mode, notification_permission = excluded.notification_permission, \
             last_seen_at = excluded.last_seen_at",
        )
        .bind(device_candidate)
        .bind(owner_id)
        .bind(&request.installation_id)
        .bind(&request.display_mode)
        .bind(&request.notification_permission)
        .bind(now)
        .bind(now)
        .execute(&mut *transaction)
        .await
        .context("Không lưu được thiết bị")?;
        let device_id: String =
            sqlx::query_scalar("SELECT id FROM mobile_devices WHERE installation_id = ?")
                .bind(&request.installation_id)
                .fetch_one(&mut *transaction)
                .await
                .context("Không đọc được thiết bị")?;
        sqlx::query(
            "INSERT INTO push_subscriptions \
             (id, device_id, endpoint, p256dh, auth, imported_unclaimed, created_at, updated_at, failure_count) \
             VALUES (?, ?, ?, ?, ?, 0, ?, ?, 0) ON CONFLICT(endpoint) DO UPDATE SET \
             device_id = excluded.device_id, p256dh = excluded.p256dh, auth = excluded.auth, \
             imported_unclaimed = 0, updated_at = excluded.updated_at, disabled_at = NULL, failure_count = 0",
        )
        .bind(&subscription_candidate)
        .bind(device_id)
        .bind(&request.subscription.endpoint)
        .bind(&request.subscription.keys.p256dh)
        .bind(&request.subscription.keys.auth)
        .bind(now)
        .bind(now)
        .execute(&mut *transaction)
        .await
        .context("Không lưu được đăng ký thông báo")?;
        let id = sqlx::query_scalar("SELECT id FROM push_subscriptions WHERE endpoint = ?")
            .bind(&request.subscription.endpoint)
            .fetch_one(&mut *transaction)
            .await
            .context("Không đọc được đăng ký thông báo")?;
        transaction
            .commit()
            .await
            .context("Không hoàn tất được đăng ký")?;
        Ok(id)
    }

    pub async fn remove(&self, id: &str) -> Result<bool> {
        let changed = sqlx::query(
            "UPDATE push_subscriptions SET disabled_at = ?, updated_at = ? \
             WHERE id = ? AND disabled_at IS NULL AND device_id IN \
             (SELECT id FROM mobile_devices WHERE owner_id = 1)",
        )
        .bind(Utc::now())
        .bind(Utc::now())
        .bind(id)
        .execute(&self.pool)
        .await
        .context("Không tắt được đăng ký thông báo")?;
        Ok(changed.rows_affected() == 1)
    }

    pub async fn enforce_rate_limit(
        &self,
        scope: &str,
        identity: &str,
        limit: i64,
    ) -> Result<bool> {
        let now = Utc::now();
        let boundary = now - Duration::minutes(1);
        let mut transaction = self
            .pool
            .begin()
            .await
            .context("Không kiểm tra được giới hạn")?;
        let existing: Option<(DateTime<Utc>, i64)> = sqlx::query_as(
            "SELECT window_started_at, request_count FROM api_rate_limits \
             WHERE scope = ? AND identity_key = ?",
        )
        .bind(scope)
        .bind(identity)
        .fetch_optional(&mut *transaction)
        .await
        .context("Không đọc được giới hạn")?;
        let (started, count) = match existing {
            Some((started, count)) if started > boundary => (started, count + 1),
            _ => (now, 1),
        };
        sqlx::query(
            "INSERT INTO api_rate_limits (scope, identity_key, window_started_at, request_count) \
             VALUES (?, ?, ?, ?) ON CONFLICT(scope, identity_key) DO UPDATE SET \
             window_started_at = excluded.window_started_at, request_count = excluded.request_count",
        )
        .bind(scope)
        .bind(identity)
        .bind(started)
        .bind(count)
        .execute(&mut *transaction)
        .await
        .context("Không lưu được giới hạn")?;
        transaction
            .commit()
            .await
            .context("Không hoàn tất được giới hạn")?;
        Ok(count <= limit)
    }

    pub async fn enqueue_test(
        &self,
        installation_id: &str,
        owner_exists: bool,
    ) -> Result<(usize, DateTime<Utc>, String)> {
        let subscriptions: Vec<String> = if owner_exists {
            sqlx::query_scalar(
                "SELECT p.id FROM push_subscriptions p JOIN mobile_devices d ON d.id = p.device_id \
                 WHERE p.disabled_at IS NULL AND d.owner_id = 1 AND d.installation_id = ?",
            )
            .bind(installation_id)
            .fetch_all(&self.pool)
            .await
        } else {
            sqlx::query_scalar(
                "SELECT p.id FROM push_subscriptions p LEFT JOIN mobile_devices d ON d.id = p.device_id \
                 WHERE p.disabled_at IS NULL AND (p.imported_unclaimed = 1 OR d.installation_id = ?)",
            )
            .bind(installation_id)
            .fetch_all(&self.pool)
            .await
        }
        .context("Không đọc được thiết bị nhận")?;
        if subscriptions.is_empty() {
            bail!("PHONE_NOT_READY")
        }
        let send_after = Utc::now() + Duration::seconds(10);
        let expires_at = send_after + Duration::hours(1);
        let dedupe = Uuid::new_v4().to_string();
        let mut transaction = self
            .pool
            .begin()
            .await
            .context("Không mở được hàng đợi thông báo thử")?;
        for subscription in &subscriptions {
            sqlx::query(
                "INSERT INTO notification_jobs \
                 (id, subscription_id, dedupe_key, kind, title, body, target_url, tag, state, \
                  attempt_count, next_attempt_at, expires_at, created_at) \
                 VALUES (?, ?, ?, 'test', 'VibePing', 'Thông báo thử đã đến từ laptop của bạn.', \
                  '/settings/notifications?test=received', 'vibeping-test', 'pending', 0, ?, ?, ?)",
            )
            .bind(Uuid::new_v4().to_string())
            .bind(subscription)
            .bind(&dedupe)
            .bind(send_after)
            .bind(expires_at)
            .bind(Utc::now())
            .execute(&mut *transaction)
            .await
            .context("Không xếp được thông báo thử")?;
        }
        transaction
            .commit()
            .await
            .context("Không hoàn tất được thông báo thử")?;
        Ok((subscriptions.len(), send_after, dedupe))
    }

    pub async fn wait_for_test_acceptance(&self, dedupe: &str) -> Result<bool> {
        for _ in 0..60 {
            let (total, accepted): (i64, i64) = sqlx::query_as(
                "SELECT COUNT(*), SUM(CASE WHEN state = 'accepted' THEN 1 ELSE 0 END) \
                 FROM notification_jobs WHERE dedupe_key = ?",
            )
            .bind(dedupe)
            .fetch_one(&self.pool)
            .await
            .context("Không đọc được kết quả thông báo thử")?;
            if total > 0 && accepted == total {
                return Ok(true);
            }
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        }
        Ok(false)
    }
}
