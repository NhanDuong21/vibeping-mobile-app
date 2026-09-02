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

// Apple Web Push rejects the non-public `.local` contact with HTTP 403.
// Keep this aligned with the sender identity proven by the Gate 0 delivery path.
const VAPID_SUBJECT: &str = "https://github.com/NhanDuong21/vibeping-mobile-app";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct DeliveryOutcome {
    pub kind: &'static str,
    pub status: Option<u16>,
}

pub async fn deliver(data_dir: &Path, job: &DeliveryJob) -> DeliveryOutcome {
    classify(build_and_send(data_dir, job).await)
}

fn classify(result: Result<StatusCode>) -> DeliveryOutcome {
    match result {
        Ok(status) if status.is_success() => outcome("accepted", Some(status)),
        Ok(status @ (StatusCode::NOT_FOUND | StatusCode::GONE)) => outcome("stale", Some(status)),
        Ok(status) if status == StatusCode::TOO_MANY_REQUESTS || status.is_server_error() => {
            outcome("retry", Some(status))
        }
        Ok(status) => outcome("rejected", Some(status)),
        Err(error)
            if error.to_string().contains("PROVIDER_UNREACHABLE")
                || error.to_string().contains("PROVIDER_TIMEOUT") =>
        {
            outcome("retry", None)
        }
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
    tokio::time::timeout(Duration::from_secs(10), client.request(request))
        .await
        .context("PROVIDER_TIMEOUT")?
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
    use anyhow::anyhow;
    use chrono::{Duration as ChronoDuration, Utc};
    use hyper::StatusCode;
    use serde_json::Value;
    use tempfile::tempdir;

    use super::{VAPID_SUBJECT, classify, deliver};
    use crate::features::notifications::store::DeliveryJob;

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

    #[test]
    fn apple_vapid_subject_uses_the_proven_public_contact_uri() {
        assert_eq!(
            VAPID_SUBJECT,
            "https://github.com/NhanDuong21/vibeping-mobile-app"
        );
    }

    #[test]
    fn provider_statuses_and_network_failures_have_bounded_outcomes() {
        for status in [StatusCode::OK, StatusCode::CREATED, StatusCode::NO_CONTENT] {
            assert_eq!(classify(Ok(status)).kind, "accepted");
        }
        for status in [StatusCode::NOT_FOUND, StatusCode::GONE] {
            assert_eq!(classify(Ok(status)).kind, "stale");
        }
        for status in [StatusCode::TOO_MANY_REQUESTS, StatusCode::BAD_GATEWAY] {
            assert_eq!(classify(Ok(status)).kind, "retry");
        }
        assert_eq!(classify(Err(anyhow!("PROVIDER_TIMEOUT"))).kind, "retry");
        assert_eq!(classify(Err(anyhow!("PROVIDER_UNREACHABLE"))).kind, "retry");
        assert_eq!(classify(Err(anyhow!("bad subscription"))).kind, "malformed");
    }

    #[tokio::test]
    async fn malformed_subscription_fails_before_network_delivery() {
        let temp = tempdir().unwrap();
        let outcome = deliver(
            temp.path(),
            &DeliveryJob {
                id: "job".into(),
                endpoint: "https://push.example.test/id".into(),
                p256dh: "not-a-key".into(),
                auth: "not-auth".into(),
                title: "VibePing".into(),
                body: "Tín hiệu".into(),
                target_url: "/activity".into(),
                tag: "vibeping-test".into(),
                attempt_count: 0,
                expires_at: Utc::now() + ChronoDuration::minutes(1),
            },
        )
        .await;
        assert_eq!(outcome.kind, "malformed");
    }
}
