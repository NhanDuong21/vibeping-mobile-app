use std::{net::SocketAddr, time::Duration};

use anyhow::{Context, Result, bail};
use serde::{Deserialize, Serialize};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::{TcpListener, TcpStream},
    sync::mpsc,
    time::{Instant, sleep, timeout},
};

use crate::features::codex_attention::CodexIngress;

const IO_TIMEOUT: Duration = Duration::from_secs(3);
const MAX_MESSAGE_BYTES: u64 = 64 * 1024;

#[derive(Debug, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum ControlRequest {
    Shutdown {
        token: String,
    },
    Codex {
        token: String,
        payload: CodexIngress,
    },
}

pub async fn bind_control() -> Result<TcpListener> {
    TcpListener::bind(SocketAddr::from(([127, 0, 0, 1], 0)))
        .await
        .context("Không mở được kênh điều khiển cục bộ")
}

pub async fn wait_for_control(
    listener: TcpListener,
    expected_token: String,
    ingress: mpsc::Sender<CodexIngress>,
) {
    loop {
        let Ok((stream, peer)) = listener.accept().await else {
            continue;
        };
        if !peer.ip().is_loopback() {
            continue;
        }
        match accept_request(stream, &expected_token, &ingress).await {
            Ok(true) => return,
            Ok(false) => {}
            Err(error) => {
                let reason = crate::infrastructure::observability::SafeErrorCode::from_error(
                    "CONTROL_REQUEST_REJECTED",
                    &error,
                );
                tracing::warn!(%reason, "Kênh điều khiển từ chối yêu cầu");
            }
        }
    }
}

pub async fn request_shutdown(address: &str, token: &str) -> Result<()> {
    send_request(
        address,
        &ControlRequest::Shutdown {
            token: token.into(),
        },
    )
    .await
}

pub async fn request_ingress(address: &str, token: &str, payload: CodexIngress) -> Result<()> {
    send_request(
        address,
        &ControlRequest::Codex {
            token: token.into(),
            payload,
        },
    )
    .await
}

async fn send_request(address: &str, request: &ControlRequest) -> Result<()> {
    let address: SocketAddr = address.parse().context("Kênh cục bộ không hợp lệ")?;
    let bytes = serde_json::to_vec(request).context("Không chuẩn bị được yêu cầu cục bộ")?;
    timeout(IO_TIMEOUT, async {
        let mut stream = TcpStream::connect(address)
            .await
            .context("Không kết nối được với VibePing đang chạy")?;
        stream
            .write_all(&bytes)
            .await
            .context("Không gửi được yêu cầu")?;
        stream
            .shutdown()
            .await
            .context("Không hoàn tất được yêu cầu")?;
        let mut response = [0_u8; 3];
        stream
            .read_exact(&mut response)
            .await
            .context("VibePing chưa xác nhận yêu cầu")?;
        if &response != b"OK\n" {
            bail!("VibePing từ chối yêu cầu")
        }
        Ok(())
    })
    .await
    .context("VibePing chưa phản hồi yêu cầu")?
}

async fn accept_request(
    mut stream: TcpStream,
    expected_token: &str,
    ingress: &mpsc::Sender<CodexIngress>,
) -> Result<bool> {
    let mut bytes = Vec::new();
    timeout(
        IO_TIMEOUT,
        (&mut stream)
            .take(MAX_MESSAGE_BYTES)
            .read_to_end(&mut bytes),
    )
    .await
    .context("Yêu cầu cục bộ hết thời gian")??;
    let request: ControlRequest =
        serde_json::from_slice(&bytes).context("Yêu cầu cục bộ không hợp lệ")?;
    let shutdown = match request {
        ControlRequest::Shutdown { token } if token == expected_token => true,
        ControlRequest::Codex { token, payload } if token == expected_token => {
            ingress
                .send(payload)
                .await
                .context("Kênh Codex chưa sẵn sàng")?;
            false
        }
        _ => bail!("Mã xác nhận cục bộ không hợp lệ"),
    };
    stream
        .write_all(b"OK\n")
        .await
        .context("Không phản hồi được yêu cầu")?;
    Ok(shutdown)
}

pub async fn health_ready(address: &str) -> bool {
    timeout(Duration::from_secs(2), probe_health(address))
        .await
        .ok()
        .and_then(Result::ok)
        .unwrap_or(false)
}

pub async fn wait_until_ready(address: &str, duration: Duration) -> Result<()> {
    let deadline = Instant::now() + duration;
    while Instant::now() < deadline {
        if health_ready(address).await {
            return Ok(());
        }
        sleep(Duration::from_millis(150)).await;
    }
    bail!("VibePing chưa sẵn sàng trong thời gian chờ")
}

pub async fn wait_until_stopped(address: &str, duration: Duration) -> bool {
    let deadline = Instant::now() + duration;
    while Instant::now() < deadline {
        if !health_ready(address).await {
            return true;
        }
        sleep(Duration::from_millis(100)).await;
    }
    false
}

async fn probe_health(address: &str) -> Result<bool> {
    let mut stream = TcpStream::connect(address)
        .await
        .context("Không kết nối được với trạng thái cục bộ")?;
    let request =
        format!("GET /api/v1/health HTTP/1.1\r\nHost: {address}\r\nConnection: close\r\n\r\n");
    stream
        .write_all(request.as_bytes())
        .await
        .context("Không gửi được kiểm tra")?;
    let mut response = Vec::new();
    (&mut stream)
        .take(16_384)
        .read_to_end(&mut response)
        .await
        .context("Không đọc được trạng thái VibePing")?;
    let response = String::from_utf8_lossy(&response);
    Ok(response.contains(" 200 OK") && response.contains("\"service\":\"vibeping\""))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::features::codex_attention::CodexSignal;
    use chrono::Utc;

    fn ingress() -> CodexIngress {
        CodexIngress {
            session_key: "session".into(),
            turn_key: "turn".into(),
            project_name: "project".into(),
            task_label: None,
            result: None,
            signal: CodexSignal::Started,
            occurred_at: Utc::now(),
        }
    }

    #[tokio::test]
    async fn control_requires_token_and_accepts_ingress_then_shutdown() {
        let listener = bind_control().await.unwrap();
        let address = listener.local_addr().unwrap().to_string();
        let (sender, mut receiver) = mpsc::channel(4);
        let task = tokio::spawn(wait_for_control(listener, "secret".into(), sender));
        assert!(request_ingress(&address, "wrong", ingress()).await.is_err());
        request_ingress(&address, "secret", ingress())
            .await
            .unwrap();
        assert_eq!(receiver.recv().await.unwrap().turn_key, "turn");
        request_shutdown(&address, "secret").await.unwrap();
        timeout(Duration::from_secs(1), task)
            .await
            .unwrap()
            .unwrap();
    }
}
