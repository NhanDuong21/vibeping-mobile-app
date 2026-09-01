use anyhow::{Context, Result, bail};
use chrono::{DateTime, Utc};
use sqlx::{FromRow, SqlitePool};
use uuid::Uuid;

use super::dto::PairingClaimRequest;

#[derive(Clone)]
pub struct PairingStore {
    pool: SqlitePool,
}

#[derive(Clone, Debug, FromRow)]
pub struct PairingSession {
    pub id: String,
    pub code_hash: String,
    pub expires_at: DateTime<Utc>,
    pub attempt_count: i64,
    pub used_at: Option<DateTime<Utc>>,
}

impl PairingStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn owner_login(&self) -> Result<Option<String>> {
        sqlx::query_scalar("SELECT tailscale_login FROM owner_identity WHERE id = 1")
            .fetch_optional(&self.pool)
            .await
            .context("Không đọc được trạng thái chủ sở hữu")
    }

    pub async fn latest_session(&self) -> Result<Option<PairingSession>> {
        sqlx::query_as(
            "SELECT id, code_hash, expires_at, attempt_count, used_at \
             FROM pairing_sessions ORDER BY created_at DESC LIMIT 1",
        )
        .fetch_optional(&self.pool)
        .await
        .context("Không đọc được phiên ghép nối")
    }

    pub async fn replace_session(&self, code_hash: &str, expires_at: DateTime<Utc>) -> Result<()> {
        let mut transaction = self
            .pool
            .begin()
            .await
            .context("Không bắt đầu được ghép nối")?;
        sqlx::query("UPDATE pairing_sessions SET used_at = ? WHERE used_at IS NULL")
            .bind(Utc::now())
            .execute(&mut *transaction)
            .await
            .context("Không đóng được mã ghép nối cũ")?;
        sqlx::query(
            "INSERT INTO pairing_sessions \
             (id, code_hash, expires_at, attempt_count, used_at, created_at) \
             VALUES (?, ?, ?, 0, NULL, ?)",
        )
        .bind(Uuid::new_v4().to_string())
        .bind(code_hash)
        .bind(expires_at)
        .bind(Utc::now())
        .execute(&mut *transaction)
        .await
        .context("Không tạo được mã ghép nối")?;
        transaction
            .commit()
            .await
            .context("Không lưu được mã ghép nối")
    }

    pub async fn record_failed_attempt(&self, session_id: &str) -> Result<()> {
        sqlx::query("UPDATE pairing_sessions SET attempt_count = attempt_count + 1 WHERE id = ?")
            .bind(session_id)
            .execute(&self.pool)
            .await
            .context("Không ghi được lần ghép nối chưa đúng")?;
        Ok(())
    }

    pub async fn claim(
        &self,
        session_id: &str,
        tailscale_login: &str,
        request: &PairingClaimRequest,
    ) -> Result<String> {
        let device_id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let mut transaction = self
            .pool
            .begin()
            .await
            .context("Không bắt đầu được xác nhận")?;
        sqlx::query(
            "INSERT INTO owner_identity (id, tailscale_login, claimed_at) VALUES (1, ?, ?)",
        )
        .bind(tailscale_login)
        .bind(now)
        .execute(&mut *transaction)
        .await
        .context("Không xác nhận được chủ sở hữu")?;
        let updated = sqlx::query(
            "UPDATE pairing_sessions SET used_at = ? \
             WHERE id = ? AND used_at IS NULL AND expires_at > ?",
        )
        .bind(now)
        .bind(session_id)
        .bind(now)
        .execute(&mut *transaction)
        .await
        .context("Không sử dụng được mã ghép nối")?;
        if updated.rows_affected() != 1 {
            bail!("Mã ghép nối không còn dùng được")
        }
        sqlx::query(
            "INSERT INTO mobile_devices \
             (id, owner_id, installation_id, display_mode, notification_permission, created_at, last_seen_at) \
             VALUES (?, 1, ?, ?, ?, ?, ?) \
             ON CONFLICT(installation_id) DO UPDATE SET \
               owner_id = 1, display_mode = excluded.display_mode, \
               notification_permission = excluded.notification_permission, last_seen_at = excluded.last_seen_at",
        )
        .bind(&device_id)
        .bind(&request.installation_id)
        .bind(&request.display_mode)
        .bind(&request.notification_permission)
        .bind(now)
        .bind(now)
        .execute(&mut *transaction)
        .await
        .context("Không lưu được điện thoại chủ sở hữu")?;
        let actual_device: String =
            sqlx::query_scalar("SELECT id FROM mobile_devices WHERE installation_id = ?")
                .bind(&request.installation_id)
                .fetch_one(&mut *transaction)
                .await
                .context("Không đọc được điện thoại chủ sở hữu")?;
        sqlx::query(
            "UPDATE push_subscriptions SET device_id = ?, imported_unclaimed = 0, updated_at = ? \
             WHERE device_id IS NULL OR imported_unclaimed = 1",
        )
        .bind(&actual_device)
        .bind(now)
        .execute(&mut *transaction)
        .await
        .context("Không gắn được đăng ký thông báo")?;
        transaction
            .commit()
            .await
            .context("Không hoàn tất được ghép nối")?;
        Ok(actual_device)
    }
}
