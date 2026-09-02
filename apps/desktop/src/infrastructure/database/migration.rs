use std::{
    fs,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};
use chrono::Utc;
use sqlx::{SqlitePool, migrate::Migrator};

const MAX_BACKUPS: usize = 5;

pub async fn is_pending(pool: &SqlitePool, migrator: &Migrator) -> Result<bool> {
    let table_exists: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = '_sqlx_migrations'",
    )
    .fetch_one(pool)
    .await
    .context("Không đọc được phiên bản dữ liệu")?;
    if table_exists == 0 {
        return Ok(migrator.iter().next().is_some());
    }
    let applied: i64 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(version), 0) FROM _sqlx_migrations WHERE success = 1",
    )
    .fetch_one(pool)
    .await
    .context("Không đọc được phiên bản dữ liệu")?;
    Ok(migrator.iter().any(|value| value.version > applied))
}

pub fn backup(database: &Path) -> Result<PathBuf> {
    let parent = database
        .parent()
        .context("Không xác định được thư mục dữ liệu")?;
    let directory = parent.join("backups").join("database");
    fs::create_dir_all(&directory).context("Không tạo được thư mục sao lưu")?;
    let target = directory.join(format!(
        "pre-migration-{}.sqlite3",
        Utc::now().format("%Y%m%dT%H%M%S%.3fZ")
    ));
    fs::copy(database, &target).context("Không sao lưu được dữ liệu trước cập nhật")?;
    prune(&directory)?;
    Ok(target)
}

pub fn restore(database: &Path, backup: &Path) -> Result<()> {
    remove_sidecar(database, "-wal")?;
    remove_sidecar(database, "-shm")?;
    let temporary = database.with_extension("restore.tmp");
    fs::copy(backup, &temporary).context("Không chuẩn bị được dữ liệu khôi phục")?;
    if database.is_file() {
        fs::remove_file(database).context("Không thay được dữ liệu cần khôi phục")?;
    }
    fs::rename(temporary, database).context("Không hoàn tất được khôi phục dữ liệu")
}

fn remove_sidecar(database: &Path, suffix: &str) -> Result<()> {
    let sidecar = PathBuf::from(format!("{}{}", database.display(), suffix));
    if sidecar.is_file() {
        fs::remove_file(sidecar).context("Không dọn được trạng thái SQLite cũ")?;
    }
    Ok(())
}

fn prune(directory: &Path) -> Result<()> {
    let mut files = fs::read_dir(directory)
        .context("Không đọc được thư mục sao lưu")?
        .filter_map(|entry| entry.ok().map(|value| value.path()))
        .filter(|path| path.is_file())
        .collect::<Vec<_>>();
    files.sort();
    let remove_count = files.len().saturating_sub(MAX_BACKUPS);
    for path in files.into_iter().take(remove_count) {
        fs::remove_file(path).context("Không dọn được bản sao dữ liệu cũ")?;
    }
    Ok(())
}
