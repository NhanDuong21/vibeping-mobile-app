use std::collections::BTreeMap;

use anyhow::{Context, Result, bail};
use chrono::Utc;
use serde::Deserialize;
use serde_json::Value;
use sha2::{Digest, Sha256};

use super::model::{NormalizedLimits, NormalizedWindow};

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
    primary: Option<RawWindow>,
    secondary: Option<RawWindow>,
    rate_limit_reached_type: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawWindow {
    used_percent: f64,
    window_duration_mins: i64,
    resets_at: i64,
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
            windows.push(normalize_window(&bucket, &limit_id, "primary", window)?);
        }
        if let Some(ref window) = bucket.secondary {
            windows.push(normalize_window(&bucket, &limit_id, "secondary", window)?);
        }
    }
    if windows.is_empty() {
        bail!("RATE_LIMIT_WINDOWS_EMPTY")
    }
    windows.sort_by_key(|window| (window.duration_minutes, window.window_key.clone()));
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
) -> Result<NormalizedWindow> {
    if window.window_duration_mins <= 0 {
        bail!("RATE_LIMIT_DURATION_INVALID")
    }
    let used = if window.used_percent.is_finite() {
        window.used_percent.clamp(0.0, 100.0)
    } else {
        100.0
    };
    let readable_name = bucket
        .limit_name
        .as_deref()
        .filter(|name| safe_label(name, limit_id));
    Ok(NormalizedWindow {
        window_key: digest(&format!("{limit_id}:{window_kind}")),
        label: readable_name
            .map(|name| format!("{name} · {}", duration_label(window.window_duration_mins)))
            .unwrap_or_else(|| duration_label(window.window_duration_mins)),
        window_kind,
        remaining_percent: (100.0 - used).clamp(0.0, 100.0),
        duration_minutes: window.window_duration_mins,
        resets_at: window.resets_at,
        reached: bucket.rate_limit_reached_type.is_some() || used >= 100.0,
    })
}

fn safe_label(name: &str, limit_id: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    name != limit_id
        && !name.contains(['_', '@'])
        && !lower.contains("bearer")
        && !lower.contains("sk-")
        && !lower.contains("token")
        && name.len() <= 40
        && !name.chars().any(char::is_control)
}

pub fn duration_label(minutes: i64) -> String {
    match minutes {
        300 => "Lượt dùng 5 giờ".into(),
        10_080 => "Hạn mức tuần".into(),
        value if value >= 1_440 && value % 1_440 == 0 => {
            format!("Chu kỳ {} ngày", value / 1_440)
        }
        value if value >= 60 && value % 60 == 0 => format!("Chu kỳ {} giờ", value / 60),
        value => format!("Chu kỳ {value} phút"),
    }
}

fn digest(value: &str) -> String {
    Sha256::digest(value.as_bytes())
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}
