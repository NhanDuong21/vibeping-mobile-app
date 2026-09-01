use std::collections::BTreeMap;

use anyhow::{Context, Result, bail};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawResponse {
    rate_limits: Option<RawBucket>,
    #[serde(default)]
    rate_limits_by_limit_id: BTreeMap<String, RawBucket>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawBucket {
    limit_id: Option<String>,
    limit_name: Option<String>,
    plan_type: Option<String>,
    primary: Option<RawWindow>,
    secondary: Option<RawWindow>,
    rate_limit_reached_type: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawWindow {
    used_percent: f64,
    window_duration_mins: u64,
    resets_at: i64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedLimits {
    pub read_at: DateTime<Utc>,
    pub windows: Vec<NormalizedWindow>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedWindow {
    pub limit_id: String,
    pub limit_name: Option<String>,
    pub plan_type: Option<String>,
    pub window_kind: &'static str,
    pub label: String,
    pub used_percent: f64,
    pub remaining_percent: f64,
    pub window_duration_mins: u64,
    pub resets_at: i64,
    pub reached: bool,
}

pub fn normalize_response(value: Value) -> Result<NormalizedLimits> {
    let raw: RawResponse =
        serde_json::from_value(value).context("RATE_LIMIT_RESPONSE_MALFORMED")?;
    let buckets: Vec<(String, RawBucket)> = if raw.rate_limits_by_limit_id.is_empty() {
        raw.rate_limits
            .map(|bucket| {
                (
                    bucket.limit_id.clone().unwrap_or_else(|| "codex".into()),
                    bucket,
                )
            })
            .into_iter()
            .collect()
    } else {
        raw.rate_limits_by_limit_id.into_iter().collect()
    };
    if buckets.is_empty() {
        bail!("RATE_LIMITS_EMPTY")
    }

    let mut windows = Vec::new();
    for (map_id, bucket) in buckets {
        let limit_id = bucket.limit_id.clone().unwrap_or(map_id);
        if let Some(ref window) = bucket.primary {
            windows.push(normalize_window(&bucket, &limit_id, "primary", window));
        }
        if let Some(ref window) = bucket.secondary {
            windows.push(normalize_window(&bucket, &limit_id, "secondary", window));
        }
    }
    if windows.is_empty() {
        bail!("RATE_LIMIT_WINDOWS_EMPTY")
    }
    windows.sort_by_key(|window| (window.window_duration_mins, window.limit_id.clone()));
    Ok(NormalizedLimits {
        read_at: Utc::now(),
        windows,
    })
}

fn normalize_window(
    bucket: &RawBucket,
    limit_id: &str,
    window_kind: &'static str,
    window: &RawWindow,
) -> NormalizedWindow {
    let used_percent = window.used_percent.clamp(0.0, 100.0);
    NormalizedWindow {
        limit_id: limit_id.to_owned(),
        limit_name: bucket.limit_name.clone(),
        plan_type: bucket.plan_type.clone(),
        window_kind,
        label: duration_label(window.window_duration_mins),
        used_percent,
        remaining_percent: (100.0 - used_percent).clamp(0.0, 100.0),
        window_duration_mins: window.window_duration_mins,
        resets_at: window.resets_at,
        reached: bucket.rate_limit_reached_type.is_some() || used_percent >= 100.0,
    }
}

pub fn duration_label(minutes: u64) -> String {
    match minutes {
        300 => "Lượt dùng 5 giờ".into(),
        10_080 => "Hạn mức tuần".into(),
        value if value >= 1_440 && value % 1_440 == 0 => format!("Chu kỳ {} ngày", value / 1_440),
        value if value >= 60 && value % 60 == 0 => format!("Chu kỳ {} giờ", value / 60),
        value => format!("Chu kỳ {value} phút"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture(name: &str) -> Value {
        let text = match name {
            "single" => include_str!("../fixtures/single-bucket.json"),
            "multi" => include_str!("../fixtures/multiple-buckets.json"),
            "primary-secondary" => include_str!("../fixtures/primary-secondary.json"),
            "null-name" => include_str!("../fixtures/null-limit-name.json"),
            "unknown" => include_str!("../fixtures/unknown-window.json"),
            "reached" => include_str!("../fixtures/reached-limit.json"),
            "malformed" => include_str!("../fixtures/malformed-response.json"),
            _ => unreachable!(),
        };
        serde_json::from_str(text).unwrap()
    }

    #[test]
    fn multi_bucket_view_is_preferred() {
        let normalized = normalize_response(fixture("multi")).unwrap();
        assert_eq!(normalized.windows.len(), 2);
        assert!(
            normalized
                .windows
                .iter()
                .any(|window| window.limit_id == "codex_other")
        );
    }

    #[test]
    fn primary_and_secondary_are_both_normalized() {
        let normalized = normalize_response(fixture("primary-secondary")).unwrap();
        assert_eq!(normalized.windows.len(), 2);
        assert_eq!(normalized.windows[0].window_kind, "primary");
        assert_eq!(normalized.windows[1].window_kind, "secondary");
    }

    #[test]
    fn percentages_are_clamped() {
        let normalized = normalize_response(fixture("single")).unwrap();
        assert_eq!(normalized.windows[0].remaining_percent, 72.0);
        let reached = normalize_response(fixture("reached")).unwrap();
        assert_eq!(reached.windows[0].remaining_percent, 0.0);
        assert!(reached.windows[0].reached);
    }

    #[test]
    fn neutral_labels_cover_unknown_durations_and_null_names() {
        let unknown = normalize_response(fixture("unknown")).unwrap();
        assert_eq!(unknown.windows[0].label, "Chu kỳ 2 giờ");
        let null_name = normalize_response(fixture("null-name")).unwrap();
        assert_eq!(null_name.windows[0].limit_name, None);
    }

    #[test]
    fn malformed_response_fails() {
        assert!(normalize_response(fixture("malformed")).is_err());
    }
}
