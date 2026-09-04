use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::dto::NotificationCopy;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum NotificationContext {
    Activity {
        task_label: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        result_excerpt: Option<String>,
    },
    Allowance {
        label: String,
        remaining_percent: f64,
        resets_at: i64,
    },
}

/// Only short, plain task metadata is eligible for a Lock Screen. Never pass a transcript here.
pub fn safe_label(value: &str) -> Option<String> {
    safe_text(value, 80)
}

pub fn safe_summary(value: &str) -> Option<String> {
    safe_text(value, 160)
}

fn safe_text(value: &str, limit: usize) -> Option<String> {
    if value.chars().any(|c| c.is_control() || matches!(c, '\u{200b}'..='\u{200f}' | '\u{202a}'..='\u{202e}' | '\u{2060}'..='\u{206f}')) {
        return None;
    }
    let lower = value.to_lowercase();
    if [
        "@",
        "://",
        "\\",
        "/",
        "`",
        "<",
        ">",
        "sk-",
        "bearer ",
        "token=",
        "password=",
        "api_key",
        "secret=",
    ]
    .iter()
    .any(|marker| lower.contains(marker))
    {
        return None;
    }
    let text = value.split_whitespace().collect::<Vec<_>>().join(" ");
    if text.is_empty()
        || text
            .split_whitespace()
            .any(|word| word.chars().count() > 64)
    {
        return None;
    }
    Some(if text.chars().count() > limit {
        format!(
            "{}…",
            text.chars().take(limit - 1).collect::<String>().trim_end()
        )
    } else {
        text
    })
}

pub fn notification_copy(
    event_type: &str,
    project: &str,
    context: Option<&NotificationContext>,
    privacy: &str,
    now: DateTime<Utc>,
) -> NotificationCopy {
    let (title, fallback) = event_words(event_type);
    let mut copy = NotificationCopy {
        title: title.into(),
        body: private_body(event_type).into(),
    };
    // Unknown preferences fail closed, including data from older or damaged installations.
    if !matches!(privacy, "project" | "standard") {
        return copy;
    }
    let project = safe_label(project).unwrap_or_else(|| "Codex".into());
    copy.body = project.clone();
    if privacy == "project" {
        return copy;
    }
    if let Some(NotificationContext::Allowance {
        label,
        remaining_percent,
        resets_at,
    }) = context
        && event_type.starts_with("codex.allowance.")
        && remaining_percent.is_finite()
    {
        copy.title = format!(
            "Hạn mức Codex còn {:.0}%",
            remaining_percent.clamp(0.0, 100.0).floor()
        );
        copy.body = reset_body(label, *resets_at, now);
        return copy;
    }
    let result = match context {
        Some(NotificationContext::Activity {
            result_excerpt: Some(value),
            ..
        }) if matches!(event_type, "codex.turn.completed" | "codex.test.failed") => {
            safe_summary(value)
        }
        _ => None,
    };
    let task = match context {
        Some(NotificationContext::Activity {
            task_label: Some(value),
            ..
        }) => safe_label(value),
        _ => None,
    };
    let detail = result.as_deref().or(task.as_deref()).unwrap_or(fallback);
    copy.body = if detail.to_lowercase().contains(&project.to_lowercase()) {
        detail.into()
    } else {
        format!("{detail} · {project}")
    };
    copy
}

pub fn event_words(event_type: &str) -> (&'static str, &'static str) {
    match event_type {
        "codex.turn.started" => ("Codex đã bắt đầu", "Đang xử lý yêu cầu"),
        "codex.turn.completed" => ("Codex đã xong việc", "Mở Codex trên laptop để xem kết quả"),
        "codex.attention.permission_required" => ("Codex đang chờ bạn", "Cần xác nhận để tiếp tục"),
        "codex.test.failed" => (
            "Kiểm thử mã nguồn chưa đạt",
            "Lần kiểm thử Codex ghi nhận chưa đạt; xem lại trên laptop",
        ),
        "codex.preview.ready" => (
            "Bản xem trước đã sẵn sàng",
            "Mở bản xem trước trong Codex trên laptop",
        ),
        "codex.allowance.low" => ("Hạn mức Codex sắp thấp", "Mở VibePing để xem hạn mức"),
        "codex.allowance.critical" => ("Hạn mức Codex gần hết", "Mở VibePing để xem hạn mức"),
        "codex.allowance.exhausted" => {
            ("Codex đã chạm hạn mức", "Mở VibePing để xem chu kỳ làm mới")
        }
        _ => ("Codex có cập nhật", "Mở VibePing để xem chi tiết"),
    }
}

fn private_body(event_type: &str) -> &'static str {
    match event_type {
        "codex.attention.permission_required" => "Mở Codex trên laptop để xác nhận.",
        "codex.test.failed" => {
            "Lần kiểm thử mã nguồn gần nhất Codex ghi nhận chưa đạt. Xem lại trong Codex trên laptop."
        }
        "codex.turn.completed" => "Mở Codex trên laptop để xem kết quả.",
        "codex.preview.ready" => "Mở bản xem trước trong Codex trên laptop.",
        _ => "Mở VibePing để xem chi tiết.",
    }
}

fn reset_body(label: &str, resets_at: i64, now: DateTime<Utc>) -> String {
    let label = safe_label(label).unwrap_or_else(|| "Lượt dùng Codex".into());
    let seconds = resets_at.saturating_sub(now.timestamp());
    if seconds <= 0 {
        return format!("{label} đã qua mốc làm mới; mở VibePing để cập nhật.");
    }
    let minutes = seconds.saturating_add(59) / 60;
    let (hours, rest) = (minutes / 60, minutes % 60);
    let duration = match (hours, rest) {
        (0, minutes) => format!("{minutes} phút"),
        (hours, 0) => format!("{hours} giờ"),
        (hours, minutes) => format!("{hours} giờ {minutes} phút"),
    };
    format!("{label} làm mới sau {duration}.")
}
