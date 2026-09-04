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

#[tokio::test]
async fn rc1_upgrade_recovers_start_evidence_without_fabricating_completions() {
    use crate::features::codex_attention::ActivityStore;
    use chrono::{Duration, Utc};

    let temp = tempdir().unwrap();
    let path = temp.path().join("rc1.sqlite3");
    let pool = open_pool(&path).await.unwrap();
    MIGRATOR.run_to(8, &pool).await.unwrap();
    let now = Utc::now();
    for (turn, state, at) in [
        ("orphan-tool", "running", now + Duration::seconds(2)),
        ("old-prompt", "running", now),
        ("latest-prompt", "completed", now + Duration::seconds(1)),
    ] {
        sqlx::query("INSERT INTO codex_turns (turn_key, session_key, project_name, state, started_at, updated_at) VALUES (?, 'session', 'VibePing', ?, ?, ?)")
            .bind(turn).bind(state).bind(at).bind(at).execute(&pool).await.unwrap();
    }
    for turn in ["old-prompt", "latest-prompt"] {
        sqlx::query("INSERT INTO activity_events (id, dedupe_key, event_type, title, summary, project_name, turn_key, occurred_at, created_at) VALUES (?, ?, 'codex.turn.started', 'Bắt đầu', 'Đã nhận tín hiệu', 'VibePing', ?, ?, ?)")
            .bind(turn).bind(turn).bind(turn).bind(now).bind(now).execute(&pool).await.unwrap();
    }
    pool.close().await;
    let upgraded = connect(&path).await.unwrap();
    let evidence: Vec<(String, bool)> =
        sqlx::query_as("SELECT turn_key, start_observed FROM codex_turns ORDER BY turn_key")
            .fetch_all(&upgraded)
            .await
            .unwrap();
    assert_eq!(
        evidence,
        vec![
            ("latest-prompt".into(), true),
            ("old-prompt".into(), true),
            ("orphan-tool".into(), false)
        ]
    );
    let store = ActivityStore::new(upgraded);
    let snapshot = store.snapshot().await.unwrap();
    assert!(snapshot.current_work.is_none());
    assert_eq!(snapshot.events.len(), 2);
    assert_eq!(backup_count(temp.path()), 1);
}
