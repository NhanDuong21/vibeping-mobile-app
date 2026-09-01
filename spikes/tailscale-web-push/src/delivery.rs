use anyhow::{Context, Result, bail};
use axum::{
    body::Body,
    http::{HeaderValue, StatusCode},
};
use base64ct::{Base64UrlUnpadded, Encoding as _};
use hyper::header;
use hyper_tls::HttpsConnector;
use hyper_util::{client::legacy::Client, rt::TokioExecutor};
use serde_json::json;
use web_push_native::{Auth, WebPushBuilder, p256::PublicKey};

use crate::{paths::Gate0Paths, storage};

const VAPID_SUBJECT: &str = "https://github.com/NhanDuong21/vibeping-mobile-app";

#[derive(Clone, Debug)]
pub struct Notification {
    title: String,
    body: String,
    url: String,
}

impl Notification {
    pub fn new(title: String, body: String, url: String) -> Self {
        Self { title, body, url }
    }

    pub fn test() -> Self {
        Self::new(
            "VibePing".into(),
            "Kết nối riêng tư đã hoạt động 🎉".into(),
            "/".into(),
        )
    }
}

#[derive(Clone, Debug)]
pub struct DeliveryResult {
    pub accepted: bool,
    pub stale: bool,
    pub retryable: bool,
}

impl DeliveryResult {
    pub fn human_message(&self) -> &'static str {
        if self.accepted {
            "Nơi chuyển tiếp đã nhận thông báo. Hãy kiểm tra iPhone."
        } else if self.stale {
            "Điện thoại cần bật lại thông báo."
        } else if self.retryable {
            "Chưa gửi được thông báo. VibePing sẽ tự thử lại."
        } else {
            "Chưa gửi được thông báo thử."
        }
    }
}

pub async fn send_notification(
    paths: &Gate0Paths,
    notification: Notification,
) -> Result<DeliveryResult> {
    let subscription = storage::load_subscription(paths)?;
    let key_pair = storage::create_or_load_vapid(paths)?;
    let p256dh = Base64UrlUnpadded::decode_vec(&subscription.keys.p256dh)
        .context("phone registration public key is malformed")?;
    let auth_bytes = Base64UrlUnpadded::decode_vec(&subscription.keys.auth)
        .context("phone registration authentication key is malformed")?;
    if auth_bytes.len() != 16 {
        bail!("phone registration authentication key has an invalid length");
    }

    let builder = WebPushBuilder::new(
        subscription
            .endpoint
            .parse()
            .context("phone registration endpoint is malformed")?,
        PublicKey::from_sec1_bytes(&p256dh).context("phone registration public key is invalid")?,
        Auth::clone_from_slice(&auth_bytes),
    )
    .with_vapid(&key_pair, VAPID_SUBJECT);
    let payload = json!({
        "title": notification.title,
        "body": notification.body,
        "tag": "vibeping-gate0",
        "url": notification.url,
        "timestamp": chrono::Utc::now().timestamp_millis(),
    });
    let mut request = builder.build(payload.to_string())?.map(Body::from);
    request
        .headers_mut()
        .insert("TTL", HeaderValue::from_static("86400"));
    request.headers_mut().insert(
        header::USER_AGENT,
        HeaderValue::from_static("VibePing-Gate0/0.1"),
    );

    let https = HttpsConnector::new();
    let client = Client::builder(TokioExecutor::new()).build(https);
    let response = client
        .request(request)
        .await
        .context("push provider is unreachable")?;
    let status = response.status();
    let stale = matches!(status, StatusCode::NOT_FOUND | StatusCode::GONE);
    if stale {
        storage::remove_subscription(paths)?;
    }
    Ok(DeliveryResult {
        accepted: status.is_success(),
        stale,
        retryable: status == StatusCode::TOO_MANY_REQUESTS || status.is_server_error(),
    })
}
