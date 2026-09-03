use std::path::Path;

use sqlx::{
    SqlSafeStr as _,
    migrate::{Migration, MigrationType, Migrator},
};
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
    let busy_timeout: i64 = sqlx::query_scalar("PRAGMA busy_timeout")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(journal.to_lowercase(), "wal");
    assert_eq!(foreign_keys, 1);
    assert_eq!(busy_timeout, 5_000);
}

#[tokio::test]
async fn previous_schema_is_backed_up_and_migrated() {
    let temp = tempdir().unwrap();
    let path = temp.path().join("previous.sqlite3");
    let pool = open_pool(&path).await.unwrap();
    MIGRATOR.run_to(6, &pool).await.unwrap();
    pool.close().await;

    let upgraded = connect(&path).await.unwrap();
    let preferences: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM preferences")
        .fetch_one(&upgraded)
        .await
        .unwrap();
    assert_eq!(preferences, 1);
    let theme: String = sqlx::query_scalar("SELECT theme FROM preferences WHERE id = 1")
        .fetch_one(&upgraded)
        .await
        .unwrap();
    assert_eq!(theme, "light");
    assert_eq!(backup_count(temp.path()), 1);
}

#[tokio::test]
async fn failed_migration_restores_the_exact_pre_migration_database() {
    let temp = tempdir().unwrap();
    let path = temp.path().join("rollback.sqlite3");
    let pool = connect(&path).await.unwrap();
    sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
        .execute(&pool)
        .await
        .unwrap();
    pool.close().await;
    let before = std::fs::read(&path).unwrap();
    let mut migrations = MIGRATOR.iter().cloned().collect::<Vec<_>>();
    let broken_version = migrations
        .iter()
        .map(|migration| migration.version)
        .max()
        .unwrap_or_default()
        + 1;
    migrations.push(Migration::new(
        broken_version,
        "broken".into(),
        MigrationType::Simple,
        "CREATE TABLE partial(id INTEGER); THIS IS NOT SQL;".into_sql_str(),
        false,
    ));
    let error = connect_with(&path, &Migrator::with_migrations(migrations))
        .await
        .unwrap_err();
    assert!(
        error
            .to_string()
            .contains("Không cập nhật được dữ liệu đã lưu")
    );
    assert_eq!(std::fs::read(&path).unwrap(), before);
    assert_eq!(backup_count(temp.path()), 1);
}

#[tokio::test]
async fn corrupt_database_returns_operational_copy_without_its_path() {
    let temp = tempdir().unwrap();
    let path = temp.path().join("private-name.sqlite3");
    std::fs::write(&path, b"not a sqlite database").unwrap();
    let message = connect(&path).await.unwrap_err().to_string();
    assert!(message.starts_with("Không "));
    assert!(!message.contains("private-name"));
}

fn backup_count(parent: &Path) -> usize {
    std::fs::read_dir(parent.join("backups").join("database"))
        .unwrap()
        .count()
}
