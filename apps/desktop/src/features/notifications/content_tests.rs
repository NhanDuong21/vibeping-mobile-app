use super::{NotificationContext, notification_copy, safe_label};
use chrono::{Duration, Utc};

#[test]
fn each_signal_has_a_useful_title_and_three_distinct_privacy_levels() {
    for (kind, title) in [
        ("codex.turn.completed", "Codex đã xong việc"),
        ("codex.attention.permission_required", "Codex đang chờ bạn"),
        ("codex.test.failed", "Kiểm thử vẫn chưa qua"),
        ("codex.preview.ready", "Bản xem trước đã sẵn sàng"),
    ] {
        let context = NotificationContext::Activity {
            task_label: Some("Hoàn thiện màn Hoạt động".into()),
        };
        let copies = ["private", "project", "standard"].map(|mode| {
            notification_copy(
                kind,
                "vibeping-mobile-app",
                Some(&context),
                mode,
                Utc::now(),
            )
        });
        assert!(copies.iter().all(|copy| copy.title == title));
        assert!(!copies[0].body.contains("vibeping-mobile-app"));
        assert!(!copies[0].body.contains("Hoạt động"));
        assert_eq!(copies[1].body, "vibeping-mobile-app");
        assert_eq!(
            copies[2].body,
            "Hoàn thiện màn Hoạt động · vibeping-mobile-app"
        );
        let unknown = notification_copy(
            kind,
            "secret-project",
            Some(&context),
            "invalid",
            Utc::now(),
        );
        assert_eq!(unknown, copies[0]);
    }
}

#[test]
fn missing_or_unsafe_metadata_falls_back_without_fabricating_work() {
    for task in [
        None,
        Some("private@example.test"),
        Some("output\nsecret"),
        Some("C:\\private\\file"),
        Some("sk-secret"),
        Some("\u{202e}spoof"),
    ] {
        let context = NotificationContext::Activity {
            task_label: task.map(str::to_owned),
        };
        let copy = notification_copy(
            "codex.attention.permission_required",
            "project",
            Some(&context),
            "standard",
            Utc::now(),
        );
        assert_eq!(copy.body, "Cần xác nhận để tiếp tục · project");
    }
    assert!(safe_label("task https://example.test/token").is_none());
    assert!(safe_label(&format!("{} secret@example.test", "Tên dài ".repeat(30))).is_none());
    assert_eq!(
        safe_label("  Sửa   giao diện  ").as_deref(),
        Some("Sửa giao diện")
    );
    let long = safe_label(&"Tên dài ".repeat(30)).unwrap();
    assert_eq!(long.chars().count(), 80);
    assert!(long.ends_with('…'));
}

#[test]
fn project_appears_only_once_and_no_generic_laptop_copy_is_used() {
    let context = NotificationContext::Activity {
        task_label: Some("Sửa VibePing".into()),
    };
    let copy = notification_copy(
        "codex.turn.completed",
        "VibePing",
        Some(&context),
        "standard",
        Utc::now(),
    );
    assert_eq!(copy.body, "Sửa VibePing");
    let fallback = notification_copy(
        "codex.turn.completed",
        "project",
        None,
        "standard",
        Utc::now(),
    );
    assert!(!fallback.body.contains("laptop"));
    assert!(!fallback.body.contains(&fallback.title));
}

#[test]
fn allowance_uses_actual_percent_and_reset_duration_without_occurrence_time() {
    let now = Utc::now();
    let context = NotificationContext::Allowance {
        label: "Lượt dùng 5 giờ".into(),
        remaining_percent: 18.0,
        resets_at: (now + Duration::minutes(102)).timestamp(),
    };
    let full = notification_copy(
        "codex.allowance.low",
        "Codex",
        Some(&context),
        "standard",
        now,
    );
    assert_eq!(full.title, "Hạn mức Codex còn 18%");
    assert_eq!(full.body, "Lượt dùng 5 giờ làm mới sau 1 giờ 42 phút.");
    let private = notification_copy(
        "codex.allowance.low",
        "Codex",
        Some(&context),
        "private",
        now,
    );
    assert!(!private.title.contains("18"));
    assert_eq!(private.body, "Mở VibePing để xem chi tiết.");
    let project = notification_copy(
        "codex.allowance.low",
        "Codex",
        Some(&context),
        "project",
        now,
    );
    assert_eq!(project.body, "Codex");
    let later = notification_copy(
        "codex.allowance.low",
        "Codex",
        Some(&context),
        "standard",
        now + Duration::hours(2),
    );
    assert!(later.body.contains("đã qua mốc làm mới"));
    assert!(!later.body.contains("-"));
}
