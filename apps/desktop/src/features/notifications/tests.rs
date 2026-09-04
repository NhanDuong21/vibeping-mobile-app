use chrono::Utc;
use tempfile::tempdir;
use uuid::Uuid;

use super::{
    NotificationStore,
    dto::{BrowserSubscription, SubscriptionKeys, SubscriptionRegistrationRequest},
};
use crate::infrastructure::database;

const P256DH: &str =
    "BLn9b-VR0ca83knDNZ32dCHGyjJp-1riX9ZTN40MqV8K_LpQmLqxC_DoHvqvFXO_nGdAB4W9dogZb_sM-uV4JbY";
const AUTH: &str = "_ordMnz7uTCmrpBTeUV4Bw";

pub(super) async fn fixture() -> (tempfile::TempDir, NotificationStore, sqlx::SqlitePool) {
    let temp = tempdir().unwrap();
    let pool = database::connect(&temp.path().join("notifications.sqlite3"))
        .await
        .unwrap();
    let store = NotificationStore::new(pool.clone());
    (temp, store, pool)
}

pub(super) fn registration(installation_id: String) -> SubscriptionRegistrationRequest {
    SubscriptionRegistrationRequest {
        installation_id,
        display_mode: "standalone".into(),
        notification_permission: "granted".into(),
        subscription: BrowserSubscription {
            endpoint: "https://push.example.test/device".into(),
            expiration_time: None,
            keys: SubscriptionKeys {
                p256dh: P256DH.into(),
                auth: AUTH.into(),
            },
        },
    }
}

#[tokio::test]
async fn subscription_upsert_and_test_enqueue_are_idempotent() {
    let (_temp, store, pool) = fixture().await;
    let installation = Uuid::new_v4().to_string();
    let first = store
        .register(&registration(installation.clone()), None)
        .await
        .unwrap();
    let second = store
        .register(&registration(installation.clone()), None)
        .await
        .unwrap();
    assert_eq!(first, second);

    let (queued, send_after, _) = store.enqueue_test(&installation, false).await.unwrap();
    assert_eq!(queued, 1);
    assert!(send_after > Utc::now());
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM notification_jobs")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 1);
}

#[tokio::test]
async fn retry_and_stale_outcomes_are_durable() {
    let (_temp, store, pool) = fixture().await;
    let installation = Uuid::new_v4().to_string();
    store
        .register(&registration(installation.clone()), None)
        .await
        .unwrap();
    store.enqueue_test(&installation, false).await.unwrap();
    sqlx::query("UPDATE notification_jobs SET next_attempt_at = ?")
        .bind(Utc::now())
        .execute(&pool)
        .await
        .unwrap();
    let first = store.claim_due().await.unwrap().unwrap();
    store.finish(&first, "retry", Some(503)).await.unwrap();
    let state: String = sqlx::query_scalar("SELECT state FROM notification_jobs WHERE id = ?")
        .bind(&first.id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(state, "retry");
    sqlx::query("UPDATE notification_jobs SET next_attempt_at = ?, lease_until = NULL")
        .bind(Utc::now())
        .execute(&pool)
        .await
        .unwrap();
    let second = store.claim_due().await.unwrap().unwrap();
    store.finish(&second, "stale", Some(410)).await.unwrap();
    let disabled: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM push_subscriptions WHERE disabled_at IS NOT NULL")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(disabled, 1);

    store
        .register(&registration(installation), None)
        .await
        .unwrap();
    let recovered: (Option<chrono::DateTime<Utc>>, i64) =
        sqlx::query_as("SELECT disabled_at, failure_count FROM push_subscriptions LIMIT 1")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(recovered, (None, 0));
}

#[tokio::test]
async fn expired_leases_recover_without_concurrent_duplicate_claims() {
    let (_temp, store, pool) = fixture().await;
    let installation = Uuid::new_v4().to_string();
    store
        .register(&registration(installation.clone()), None)
        .await
        .unwrap();
    store.enqueue_test(&installation, false).await.unwrap();
    sqlx::query("UPDATE notification_jobs SET next_attempt_at = ?")
        .bind(Utc::now())
        .execute(&pool)
        .await
        .unwrap();
    let first = store.claim_due().await.unwrap().unwrap();
    assert!(store.claim_due().await.unwrap().is_none());
    sqlx::query("UPDATE notification_jobs SET lease_until = ? WHERE id = ?")
        .bind(Utc::now() - chrono::Duration::seconds(1))
        .bind(&first.id)
        .execute(&pool)
        .await
        .unwrap();
    let recovered = store.claim_due().await.unwrap().unwrap();
    assert_eq!(recovered.id, first.id);
}

#[tokio::test]
async fn ttl_expiry_is_terminal_and_records_one_attempt() {
    let (_temp, store, pool) = fixture().await;
    let installation = Uuid::new_v4().to_string();
    store
        .register(&registration(installation.clone()), None)
        .await
        .unwrap();
    store.enqueue_test(&installation, false).await.unwrap();
    sqlx::query("UPDATE notification_jobs SET next_attempt_at = ?, expires_at = ?")
        .bind(Utc::now())
        .bind(Utc::now() - chrono::Duration::seconds(1))
        .execute(&pool)
        .await
        .unwrap();
    let job = store.claim_due().await.unwrap().unwrap();
    store.finish(&job, "expired", None).await.unwrap();
    let state: String = sqlx::query_scalar("SELECT state FROM notification_jobs WHERE id = ?")
        .bind(&job.id)
        .fetch_one(&pool)
        .await
        .unwrap();
    let attempts: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM notification_attempts")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!((state.as_str(), attempts), ("expired", 1));
}
