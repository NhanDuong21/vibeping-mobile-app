use std::{fs, path::Path};

use anyhow::{Context, Result};
use chrono::Utc;
use serde::Deserialize;
use sqlx::SqlitePool;
use uuid::Uuid;

use super::{dto::SubscriptionKeys, vapid::vapid_path};

const MARKER: &str = "gate0_push_imported";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Gate0Subscription {
    endpoint: String,
    keys: SubscriptionKeys,
}

pub async fn import_gate0_once(data_dir: &Path, pool: &SqlitePool) -> Result<bool> {
    if already_imported(pool).await? {
        return Ok(false);
    }
    let source = data_dir.join("Gate0");
    let vapid = source.join("vapid.json");
    let subscription = source.join("subscription.json");
    if !vapid.is_file() && !subscription.is_file() {
        return Ok(false);
    }

    let backup = data_dir
        .join("backups")
        .join(format!("gate0-{}", Utc::now().format("%Y%m%dT%H%M%SZ")));
    fs::create_dir_all(&backup).context("Không tạo được bản sao Gate 0")?;
    copy_if_present(&vapid, &backup.join("vapid.json"))?;
    copy_if_present(&subscription, &backup.join("subscription.json"))?;

    let destination_vapid = vapid_path(data_dir);
    if vapid.is_file() && !destination_vapid.is_file() {
        fs::create_dir_all(destination_vapid.parent().unwrap())
            .context("Không tạo được thư mục danh tính gửi")?;
        fs::copy(&vapid, &destination_vapid).context("Không nhập được danh tính gửi Gate 0")?;
    }
    if subscription.is_file() {
        import_subscription(&subscription, pool).await?;
    }
    sqlx::query(
        "INSERT INTO app_metadata (key, value, updated_at) VALUES (?, 'complete', ?) \
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    )
    .bind(MARKER)
    .bind(Utc::now())
    .execute(pool)
    .await
    .context("Không đánh dấu được lần nhập Gate 0")?;
    Ok(true)
}

async fn already_imported(pool: &SqlitePool) -> Result<bool> {
    let marker: Option<String> = sqlx::query_scalar("SELECT value FROM app_metadata WHERE key = ?")
        .bind(MARKER)
        .fetch_optional(pool)
        .await
        .context("Không đọc được trạng thái nhập Gate 0")?;
    Ok(marker.is_some())
}

async fn import_subscription(path: &Path, pool: &SqlitePool) -> Result<()> {
    let stored: Gate0Subscription =
        serde_json::from_slice(&fs::read(path).context("Không đọc được đăng ký Gate 0")?)
            .context("Đăng ký Gate 0 không hợp lệ")?;
    validate_import(&stored)?;
    let now = Utc::now();
    sqlx::query(
        "INSERT INTO push_subscriptions \
         (id, device_id, endpoint, p256dh, auth, imported_unclaimed, created_at, updated_at, failure_count) \
         VALUES (?, NULL, ?, ?, ?, 1, ?, ?, 0) \
         ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, \
           imported_unclaimed = 1, updated_at = excluded.updated_at, disabled_at = NULL",
    )
    .bind(Uuid::new_v4().to_string())
    .bind(stored.endpoint)
    .bind(stored.keys.p256dh)
    .bind(stored.keys.auth)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await
    .context("Không nhập được đăng ký Gate 0")?;
    Ok(())
}

fn validate_import(value: &Gate0Subscription) -> Result<()> {
    anyhow::ensure!(value.endpoint.starts_with("https://") && value.endpoint.len() <= 4096);
    anyhow::ensure!(!value.keys.p256dh.is_empty() && value.keys.p256dh.len() <= 1024);
    anyhow::ensure!(!value.keys.auth.is_empty() && value.keys.auth.len() <= 256);
    Ok(())
}

fn copy_if_present(source: &Path, destination: &Path) -> Result<()> {
    if source.is_file() {
        fs::copy(source, destination).context("Không sao lưu được trạng thái Gate 0")?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::*;
    use crate::infrastructure::database;

    #[tokio::test]
    async fn import_copies_known_files_and_never_removes_source() {
        let temp = tempdir().unwrap();
        let gate0 = temp.path().join("Gate0");
        fs::create_dir_all(&gate0).unwrap();
        fs::write(gate0.join("vapid.json"), r#"{"privateKey":"AQID"}"#).unwrap();
        fs::write(
            gate0.join("subscription.json"),
            r#"{"endpoint":"https://push.example.test/id","keys":{"p256dh":"key","auth":"auth"}}"#,
        )
        .unwrap();
        let pool = database::connect(&temp.path().join("db.sqlite3"))
            .await
            .unwrap();

        assert!(import_gate0_once(temp.path(), &pool).await.unwrap());
        assert!(!import_gate0_once(temp.path(), &pool).await.unwrap());
        assert!(gate0.join("vapid.json").is_file());
        assert!(gate0.join("subscription.json").is_file());
        assert!(vapid_path(temp.path()).is_file());
        let imported: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM push_subscriptions WHERE imported_unclaimed = 1",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(imported, 1);
    }
}
