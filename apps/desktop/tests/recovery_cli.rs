#![cfg(windows)]

use std::{
    path::Path,
    process::{Command, Output},
};

use tempfile::tempdir;
use vibeping::infrastructure::database;

#[tokio::test]
async fn backup_restore_and_notification_reset_require_confirmation() {
    let binary = env!("CARGO_BIN_EXE_vibeping");
    let temp = tempdir().unwrap();
    let data_dir = temp.path().join("recovery data");

    assert_success(run(binary, &data_dir, &["backup"]), "Đã tạo bản sao lưu");
    let backup = std::fs::read_dir(data_dir.join("backups").join("manual"))
        .unwrap()
        .next()
        .unwrap()
        .unwrap()
        .path();
    let pool = database::connect(&data_dir.join("vibeping.sqlite3"))
        .await
        .unwrap();
    sqlx::query("UPDATE preferences SET theme = 'dark'")
        .execute(&pool)
        .await
        .unwrap();
    seed_subscription(&pool).await;
    pool.close().await;

    assert_failure(
        run(
            binary,
            &data_dir,
            &["restore", "--file", backup.to_str().unwrap()],
        ),
        "--confirm",
    );
    assert_success(
        run(
            binary,
            &data_dir,
            &["restore", "--file", backup.to_str().unwrap(), "--confirm"],
        ),
        "Đã khôi phục dữ liệu",
    );
    let pool = database::connect(&data_dir.join("vibeping.sqlite3"))
        .await
        .unwrap();
    let theme: String = sqlx::query_scalar("SELECT theme FROM preferences")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(theme, "light");
    seed_subscription(&pool).await;
    pool.close().await;

    assert_failure(
        run(binary, &data_dir, &["reset", "notifications"]),
        "--confirm",
    );
    assert_success(
        run(binary, &data_dir, &["reset", "notifications", "--confirm"]),
        "Đã đặt lại thông báo",
    );
    let pool = database::connect(&data_dir.join("vibeping.sqlite3"))
        .await
        .unwrap();
    let subscriptions: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM push_subscriptions")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(subscriptions, 0);
}

async fn seed_subscription(pool: &sqlx::SqlitePool) {
    sqlx::query(
        "INSERT OR IGNORE INTO mobile_devices (id, installation_id, display_mode, \
         notification_permission, created_at, last_seen_at) VALUES \
         ('device', 'installation', 'standalone', 'granted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        "INSERT OR IGNORE INTO push_subscriptions (id, device_id, endpoint, p256dh, auth, \
         created_at, updated_at) VALUES ('subscription', 'device', 'https://push.example.test/id', \
         'key', 'auth', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    )
    .execute(pool)
    .await
    .unwrap();
}

fn run(binary: &str, data_dir: &Path, arguments: &[&str]) -> Output {
    let mut command = Command::new(binary);
    command.args(arguments).arg("--data-dir").arg(data_dir);
    command.output().unwrap()
}

fn assert_success(output: Output, expected: &str) {
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(output.status.success(), "stdout={stdout}\nstderr={stderr}");
    assert!(
        stdout.contains(expected),
        "stdout={stdout}\nstderr={stderr}"
    );
}

fn assert_failure(output: Output, expected: &str) {
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(!output.status.success());
    assert!(stderr.contains(expected), "stderr={stderr}");
}
