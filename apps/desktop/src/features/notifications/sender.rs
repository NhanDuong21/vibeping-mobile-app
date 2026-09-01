use std::{path::Path, time::Duration};

use anyhow::{Context, Result, bail};
use axum::body::Body;
use base64ct::{Base64UrlUnpadded, Encoding as _};
use hyper::{StatusCode, header};
use hyper_tls::HttpsConnector;
use hyper_util::{client::legacy::Client, rt::TokioExecutor};
use serde_json::json;
use web_push_native::{Auth, WebPushBuilder, p256::PublicKey};

use super::{VapidIdentity, store::DeliveryJob};

const VAPID_SUBJECT: &str = "https://vibeping.local";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct DeliveryOutcome {
    pub kind: &'static str,
    pub status: Option<u16>,
}

pub async fn deliver(data_dir: &Path, job: &DeliveryJob) -> DeliveryOutcome {
    match build_and_send(data_dir, job).await {
        Ok(status) if status.is_success() => outcome("accepted", Some(status)),
        Ok(status @ (StatusCode::NOT_FOUND | StatusCode::GONE)) => outcome("stale", Some(status)),
        Ok(status) if status == StatusCode::TOO_MANY_REQUESTS || status.is_server_error() => {
            outcome("retry", Some(status))
        }
        Ok(status) => outcome("rejected", Some(status)),
        Err(error) if error.to_string().contains("PROVIDER_UNREACHABLE") => outcome("retry", None),
        Err(_) => outcome("malformed", None),
    }
}

async fn build_and_send(data_dir: &Path, job: &DeliveryJob) -> Result<StatusCode> {
    let identity = VapidIdentity::load_or_create(data_dir)?;
    let public =
        Base64UrlUnpadded::decode_vec(&job.p256dh).context("Đăng ký thông báo không hợp lệ")?;
    let auth =
        Base64UrlUnpadded::decode_vec(&job.auth).context("Đăng ký thông báo không hợp lệ")?;
    if auth.len() != 16 {
        bail!("Đăng ký thông báo không hợp lệ")
    }
    let seconds = (job.expires_at - chrono::Utc::now()).num_seconds().max(1) as u64;
    let builder = WebPushBuilder::new(
        job.endpoint
            .parse()
            .context("Đăng ký thông báo không hợp lệ")?,
        PublicKey::from_sec1_bytes(&public).context("Đăng ký thông báo không hợp lệ")?,
        Auth::clone_from_slice(&auth),
    )
    .with_valid_duration(Duration::from_secs(seconds))
    .with_vapid(identity.key_pair(), VAPID_SUBJECT);
    let payload = json!({
        "notification": {
            "title": job.title,
            "body": job.body,
            "tag": job.tag,
            "data": {
                "onActionClick": {
                    "default": {
                        "operation": "navigateLastFocusedOrOpen",
                        "url": job.target_url
                    }
                }
            }
        }
    });
    let mut request = builder.build(payload.to_string())?.map(Body::from);
    request.headers_mut().insert(
        header::USER_AGENT,
        "VibePing/1.0".parse().expect("static user agent"),
    );
    let client = Client::builder(TokioExecutor::new()).build(HttpsConnector::new());
    client
        .request(request)
        .await
        .map(|response| response.status())
        .context("PROVIDER_UNREACHABLE")
}

fn outcome(kind: &'static str, status: Option<StatusCode>) -> DeliveryOutcome {
    DeliveryOutcome {
        kind,
        status: status.map(|value| value.as_u16()),
    }
}

#[cfg(test)]
mod tests {
    use serde_json::Value;

    #[test]
    fn angular_payload_has_one_click_navigation_contract() {
        let payload: Value = serde_json::json!({
            "notification": {"data": {"onActionClick": {"default": {
                "operation": "navigateLastFocusedOrOpen", "url": "/settings/notifications"
            }}}}
        });
        assert_eq!(
            payload
                .pointer("/notification/data/onActionClick/default/operation")
                .and_then(Value::as_str),
            Some("navigateLastFocusedOrOpen")
        );
    }
}
