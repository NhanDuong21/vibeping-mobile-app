use std::{path::Path, time::Duration};

use anyhow::{Context, Result};
use sqlx::{
    SqlitePool,
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions},
};

static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("./migrations");

pub async fn connect(path: &Path) -> Result<SqlitePool> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).context("Không tạo được thư mục dữ liệu")?;
    }
    let options = SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(true)
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Wal)
        .busy_timeout(Duration::from_secs(5));
    let pool = SqlitePoolOptions::new()
        .max_connections(4)
        .connect_with(options)
        .await
        .context("Không mở được dữ liệu đã lưu")?;
    MIGRATOR
        .run(&pool)
        .await
        .context("Không cập nhật được dữ liệu đã lưu")?;
    Ok(pool)
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::*;

    #[tokio::test]
    async fn empty_database_is_migrated_with_safety_pragmas() {
        let temp = tempdir().unwrap();
        let pool = connect(&temp.path().join("test.sqlite3")).await.unwrap();
        let journal: String = sqlx::query_scalar("PRAGMA journal_mode")
            .fetch_one(&pool)
            .await
            .unwrap();
        let foreign_keys: i64 = sqlx::query_scalar("PRAGMA foreign_keys")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(journal.to_lowercase(), "wal");
        assert_eq!(foreign_keys, 1);
    }
}
