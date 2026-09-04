use super::{UsageLimitStore, normalize::normalize_response};
use crate::{features::notifications::NotificationStore, infrastructure::database};
use chrono::Utc;
use serde_json::json;

#[tokio::test]
async fn allowance_event_persists_context_for_the_actual_notification_preview() {
    let temp = tempfile::tempdir().unwrap();
    let pool = database::connect(&temp.path().join("allowance.sqlite3"))
        .await
        .unwrap();
    let limits = normalize_response(json!({"rateLimits": {"primary": {
        "usedPercent": 82, "windowDurationMins": 300, "resetsAt": Utc::now().timestamp() + 6120
    }, "secondary": null}}))
    .unwrap();
    UsageLimitStore::new(pool.clone())
        .save(&limits)
        .await
        .unwrap();
    let preview = NotificationStore::new(pool).preview().await.unwrap();
    assert_eq!(preview.source, "activity");
    assert_eq!(preview.standard.title, "Hạn mức Codex còn 18%");
    assert_eq!(
        preview.standard.body,
        "Lượt dùng 5 giờ làm mới sau 1 giờ 42 phút."
    );
    assert_eq!(preview.private.body, "Mở VibePing để xem chi tiết.");
}
