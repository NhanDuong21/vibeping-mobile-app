use std::time::Duration;

use serde_json::{Value, json};
use tempfile::tempdir;
use tokio::io::{AsyncWriteExt, duplex};

use crate::features::preferences::PreferenceStore;
use crate::infrastructure::database;

use super::{UsageLimitStore, normalize::normalize_response, protocol::JsonLineClient};

fn response(windows: Value) -> Value {
    json!({
        "rateLimitsByLimitId": {
            "internal_bucket": {
                "limitId": "internal_bucket",
                "limitName": null,
                "primary": windows,
                "secondary": null,
                "rateLimitReachedType": null
            }
        }
    })
}

fn window(used: f64, duration: i64, reset: i64) -> Value {
    json!({
        "usedPercent": used,
        "windowDurationMins": duration,
        "resetsAt": reset
    })
}

#[test]
fn normalizes_single_unknown_and_out_of_range_windows() {
    let single = normalize_response(response(window(-8.0, 120, 2_000_000_000))).unwrap();
    assert_eq!(single.windows.len(), 1);
    assert_eq!(single.windows[0].label, "Chu kỳ 2 giờ");
    assert_eq!(single.windows[0].remaining_percent, 100.0);
    let high = normalize_response(response(window(120.0, 15, 2_000_000_000))).unwrap();
    assert_eq!(high.windows[0].remaining_percent, 0.0);
    let secret = json!({
        "rateLimits": {
            "limitId": "codex", "limitName": "private@example.com Bearer token",
            "primary": window(20.0, 120, 2_000_000_000), "secondary": null
        }
    });
    let output = normalize_response(secret).unwrap();
    assert_eq!(output.windows[0].label, "Chu kỳ 2 giờ");
}

#[test]
fn normalizes_multiple_primary_and_secondary_windows_without_internal_labels() {
    let value = json!({
        "rateLimitsByLimitId": {
            "codex": {
                "limitId": "codex", "limitName": null,
                "primary": window(28.0, 300, 2_000_000_000),
                "secondary": window(44.0, 10080, 2_000_100_000)
            },
            "codex_other": {
                "limitId": "codex_other", "limitName": "codex_other",
                "primary": window(61.0, 15, 2_000_000_000), "secondary": null
            }
        }
    });
    let limits = normalize_response(value).unwrap();
    assert_eq!(limits.windows.len(), 3);
    assert!(
        limits
            .windows
            .iter()
            .any(|item| item.label == "Lượt dùng 5 giờ")
    );
    assert!(
        limits
            .windows
            .iter()
            .any(|item| item.label == "Hạn mức tuần")
    );
    assert!(
        !serde_json::to_string(
            &limits
                .windows
                .iter()
                .map(|item| &item.label)
                .collect::<Vec<_>>()
        )
        .unwrap()
        .contains("codex_other")
    );
}

#[tokio::test]
async fn alerts_cross_each_stage_once_and_reset_with_a_new_cycle() {
    let temp = tempdir().unwrap();
    let pool = database::connect(&temp.path().join("usage.sqlite3"))
        .await
        .unwrap();
    let store = UsageLimitStore::new(pool.clone());
    for used in [81.0, 81.0, 96.0, 100.0] {
        store
            .save(&normalize_response(response(window(used, 300, 2_000_000_000))).unwrap())
            .await
            .unwrap();
    }
    let counts: (i64, i64, i64) = sqlx::query_as(
        "SELECT SUM(event_type = 'codex.allowance.low'), \
         SUM(event_type = 'codex.allowance.critical'), \
         SUM(event_type = 'codex.allowance.exhausted') FROM activity_events",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(counts, (1, 1, 1));
    store
        .save(&normalize_response(response(window(82.0, 300, 2_000_100_000))).unwrap())
        .await
        .unwrap();
    let low: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM activity_events WHERE event_type = 'codex.allowance.low'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(low, 2);
}

#[tokio::test]
async fn configured_low_threshold_controls_allowance_activity() {
    let temp = tempdir().unwrap();
    let pool = database::connect(&temp.path().join("threshold.sqlite3"))
        .await
        .unwrap();
    let preference_store = PreferenceStore::new(pool.clone());
    let mut preferences = preference_store.get().await.unwrap();
    preferences.allowance_threshold_percent = 25;
    preference_store.save(&preferences).await.unwrap();

    UsageLimitStore::new(pool.clone())
        .save(&normalize_response(response(window(78.0, 300, 2_000_000_000))).unwrap())
        .await
        .unwrap();
    let low: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM activity_events WHERE event_type = 'codex.allowance.low'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(low, 1);
}

#[tokio::test]
async fn failures_keep_last_good_windows_and_mark_them_stale() {
    let temp = tempdir().unwrap();
    let pool = database::connect(&temp.path().join("usage.sqlite3"))
        .await
        .unwrap();
    let store = UsageLimitStore::new(pool);
    store
        .save(&normalize_response(response(window(20.0, 300, 2_000_000_000))).unwrap())
        .await
        .unwrap();
    store
        .mark_failure("CODEX_ALLOWANCE_UNAVAILABLE")
        .await
        .unwrap();
    let snapshot = store.snapshot().await.unwrap();
    assert_eq!(snapshot.state, "stale");
    assert_eq!(snapshot.windows.len(), 1);
    let output = serde_json::to_string(&snapshot).unwrap();
    assert!(!output.contains('@'));
    assert!(!output.contains("sk-"));
}

#[tokio::test]
async fn last_reading_survives_restart_without_codex_and_recovers_on_reconnect() {
    let temp = tempdir().unwrap();
    let path = temp.path().join("persisted-usage.sqlite3");
    let pool = database::connect(&path).await.unwrap();
    let store = UsageLimitStore::new(pool.clone());
    let mut limits = normalize_response(response(window(63.0, 300, 1_700_000_000))).unwrap();
    limits.read_at -= chrono::Duration::days(1);
    store.save(&limits).await.unwrap();
    drop(store);
    pool.close().await;

    let pool = database::connect(&path).await.unwrap();
    let store = UsageLimitStore::new(pool);
    store.mark_failure("CODEX_NOT_CONNECTED").await.unwrap();
    let saved = store.snapshot().await.unwrap();
    assert_eq!(saved.state, "stale");
    assert_eq!(saved.read_at, Some(limits.read_at));
    assert_eq!(saved.windows[0].remaining_percent, 37.0);
    assert_eq!(saved.windows[0].resets_at, 1_700_000_000);

    let fresh = normalize_response(response(window(100.0, 300, 2_000_000_000))).unwrap();
    store.save(&fresh).await.unwrap();
    let recovered = store.snapshot().await.unwrap();
    assert_eq!(recovered.state, "available");
    assert_eq!(recovered.read_at, Some(fresh.read_at));
    assert_eq!(recovered.windows[0].remaining_percent, 0.0);
    assert!(recovered.read_at > saved.read_at);
}

#[tokio::test]
async fn protocol_handles_notifications_malformed_output_crash_and_timeout() {
    let (client_read, mut server_write) = duplex(4096);
    let (_server_read, client_write) = duplex(4096);
    server_write
        .write_all(
            b"{\"method\":\"account/rateLimits/updated\"}\n{\"id\":7,\"result\":{\"ok\":true}}\n",
        )
        .await
        .unwrap();
    let mut client = JsonLineClient::new(client_read, client_write, Duration::from_secs(1));
    assert_eq!(client.request(7, "read", None).await.unwrap()["ok"], true);
    assert_eq!(
        client.read_message().await.unwrap()["method"],
        "account/rateLimits/updated"
    );

    let (client_read, mut server_write) = duplex(64);
    let (_server_read, client_write) = duplex(64);
    server_write.write_all(b"not-json\n").await.unwrap();
    let mut client = JsonLineClient::new(client_read, client_write, Duration::from_secs(1));
    assert!(
        client
            .read_message()
            .await
            .unwrap_err()
            .to_string()
            .contains("MALFORMED")
    );

    let (client_read, server_write) = duplex(64);
    drop(server_write);
    let (_server_read, client_write) = duplex(64);
    let mut client = JsonLineClient::new(client_read, client_write, Duration::from_millis(20));
    assert!(
        client
            .read_message()
            .await
            .unwrap_err()
            .to_string()
            .contains("EXITED")
    );
}
