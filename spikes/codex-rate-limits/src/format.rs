use chrono::{DateTime, Datelike, Local, TimeZone};

use crate::normalize::{NormalizedLimits, NormalizedWindow};

pub fn format_vietnamese(limits: &NormalizedLimits) -> String {
    let now = Local::now();
    let mut lines = vec!["Hạn mức Codex".to_owned()];
    for window in &limits.windows {
        lines.push(String::new());
        lines.push(window.label.clone());
        lines.push(format!("Còn {:.0}%", window.remaining_percent));
        lines.push(format_reset(now, window));
    }
    lines.push(String::new());
    lines.push("Cập nhật vừa xong".into());
    lines.join("\n")
}

fn format_reset(now: DateTime<Local>, window: &NormalizedWindow) -> String {
    let Some(reset) = Local.timestamp_opt(window.resets_at, 0).single() else {
        return "Chưa có giờ làm mới".into();
    };
    let remaining = reset.signed_duration_since(now);
    if remaining.num_seconds() <= 0 {
        return "Đang làm mới".into();
    }
    if remaining.num_hours() < 24 {
        return format!("Làm mới sau {}", relative_duration(remaining.num_seconds()));
    }
    format!(
        "Làm mới vào {}, {}",
        vietnamese_weekday(reset.weekday()),
        reset.format("%H:%M")
    )
}

pub fn relative_duration(seconds: i64) -> String {
    let total_minutes = ((seconds.max(0) + 59) / 60).max(1);
    let hours = total_minutes / 60;
    let minutes = total_minutes % 60;
    match (hours, minutes) {
        (0, value) => format!("{value} phút"),
        (value, 0) => format!("{value} giờ"),
        (hours, minutes) => format!("{hours} giờ {minutes} phút"),
    }
}

fn vietnamese_weekday(day: chrono::Weekday) -> &'static str {
    match day {
        chrono::Weekday::Mon => "Thứ Hai",
        chrono::Weekday::Tue => "Thứ Ba",
        chrono::Weekday::Wed => "Thứ Tư",
        chrono::Weekday::Thu => "Thứ Năm",
        chrono::Weekday::Fri => "Thứ Sáu",
        chrono::Weekday::Sat => "Thứ Bảy",
        chrono::Weekday::Sun => "Chủ Nhật",
    }
}

#[cfg(test)]
mod tests {
    use serde_json::Value;

    use super::*;
    use crate::normalize::normalize_response;

    #[test]
    fn relative_time_is_human_readable() {
        assert_eq!(relative_duration(8_280), "2 giờ 18 phút");
        assert_eq!(relative_duration(60), "1 phút");
    }

    #[test]
    fn human_output_never_uses_internal_bucket_as_heading() {
        let value: Value =
            serde_json::from_str(include_str!("../fixtures/multiple-buckets.json")).unwrap();
        let output = format_vietnamese(&normalize_response(value).unwrap());
        assert!(!output.contains("codex_other"));
        assert!(output.contains("Còn 72%"));
    }

    #[test]
    fn timestamp_converts_to_local_timezone_without_changing_instant() {
        let timestamp = 1_730_947_200;
        let local = Local.timestamp_opt(timestamp, 0).single().unwrap();
        assert_eq!(local.timestamp(), timestamp);
    }
}
