mod migration;

use std::{path::Path, time::Duration};

use anyhow::{Context, Result};
use sqlx::{
    SqlitePool,
    migrate::Migrator,
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions},
};

static MIGRATOR: Migrator = sqlx::migrate!("./migrations");

pub async fn connect(path: &Path) -> Result<SqlitePool> {
    connect_with(path, &MIGRATOR).await
}

pub fn backup_file(path: &Path) -> Result<std::path::PathBuf> {
    migration::backup(path)
}

pub fn restore_file(path: &Path, backup: &Path) -> Result<()> {
    migration::restore(path, backup)
}

async fn connect_with(path: &Path, migrator: &Migrator) -> Result<SqlitePool> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).context("Không tạo được thư mục dữ liệu")?;
    }
    let existed = path.metadata().is_ok_and(|value| value.len() > 0);
    let mut pool = open_pool(path).await?;
    verify_database(&pool).await?;
    let backup = if existed && migration::is_pending(&pool, migrator).await? {
        sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
            .execute(&pool)
            .await
            .context("Không chuẩn bị được bản sao dữ liệu")?;
        pool.close().await;
        let backup = migration::backup(path)?;
        pool = open_pool(path).await?;
        Some(backup)
    } else {
        None
    };
    if let Err(error) = migrator.run(&pool).await {
        pool.close().await;
        if let Some(backup) = backup {
            migration::restore(path, &backup)?;
        }
        return Err(error).context("Không cập nhật được dữ liệu đã lưu");
    }
    verify_database(&pool).await?;
    Ok(pool)
}

async fn open_pool(path: &Path) -> Result<SqlitePool> {
    let options = SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(true)
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Wal)
        .busy_timeout(Duration::from_secs(5));
    SqlitePoolOptions::new()
        .max_connections(4)
        .connect_with(options)
        .await
        .context("Không mở được dữ liệu đã lưu")
}

async fn verify_database(pool: &SqlitePool) -> Result<()> {
    let result: String = sqlx::query_scalar("PRAGMA quick_check")
        .fetch_one(pool)
        .await
        .context("Không kiểm tra được dữ liệu đã lưu")?;
    anyhow::ensure!(result == "ok", "Dữ liệu đã lưu cần được khôi phục");
    Ok(())
}

#[cfg(test)]
mod tests;
