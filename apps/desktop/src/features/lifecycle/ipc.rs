use std::{net::SocketAddr, time::Duration};

use anyhow::{Context, Result, bail};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::{TcpListener, TcpStream},
    time::{Instant, sleep, timeout},
};

const IO_TIMEOUT: Duration = Duration::from_secs(3);

pub async fn bind_control() -> Result<TcpListener> {
    TcpListener::bind(SocketAddr::from(([127, 0, 0, 1], 0)))
        .await
        .context("Không mở được kênh dừng cục bộ")
}

pub async fn wait_for_shutdown(listener: TcpListener, expected_token: String) {
    loop {
        let Ok((stream, peer)) = listener.accept().await else {
            continue;
        };
        if peer.ip().is_loopback() && accept_shutdown(stream, &expected_token).await {
            return;
        }
    }
}

pub async fn request_shutdown(address: &str, token: &str) -> Result<()> {
    let address: SocketAddr = address.parse().context("Kênh dừng cục bộ không hợp lệ")?;
    timeout(IO_TIMEOUT, async {
        let mut stream = TcpStream::connect(address)
            .await
            .context("Không kết nối được với VibePing đang chạy")?;
        stream
            .write_all(token.as_bytes())
            .await
            .context("Không gửi được yêu cầu dừng")?;
        stream
            .shutdown()
            .await
            .context("Không hoàn tất yêu cầu dừng")?;
        let mut response = [0_u8; 3];
        stream
            .read_exact(&mut response)
            .await
            .context("VibePing chưa xác nhận yêu cầu dừng")?;
        if &response != b"OK\n" {
            bail!("VibePing từ chối yêu cầu dừng")
        }
        Ok(())
    })
    .await
    .context("VibePing chưa phản hồi yêu cầu dừng")?
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

async fn accept_shutdown(mut stream: TcpStream, expected_token: &str) -> bool {
    let mut request = Vec::new();
    let read = timeout(
        IO_TIMEOUT,
        (&mut stream).take(512).read_to_end(&mut request),
    )
    .await;
    if !matches!(read, Ok(Ok(_))) || request != expected_token.as_bytes() {
        return false;
    }
    stream.write_all(b"OK\n").await.is_ok()
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
        .context("Không gửi được kiểm tra trạng thái")?;
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

    #[tokio::test]
    async fn shutdown_requires_the_runtime_token() {
        let listener = bind_control().await.unwrap();
        let address = listener.local_addr().unwrap().to_string();
        let task = tokio::spawn(wait_for_shutdown(listener, "secret".into()));
        assert!(request_shutdown(&address, "wrong").await.is_err());
        request_shutdown(&address, "secret").await.unwrap();
        timeout(Duration::from_secs(1), task)
            .await
            .unwrap()
            .unwrap();
    }

    #[tokio::test]
    async fn unresponsive_control_channel_times_out() {
        let listener = bind_control().await.unwrap();
        let address = listener.local_addr().unwrap().to_string();
        let blocker = tokio::spawn(async move {
            let (_stream, _) = listener.accept().await.unwrap();
            sleep(Duration::from_secs(5)).await;
        });
        let started = Instant::now();
        assert!(request_shutdown(&address, "secret").await.is_err());
        assert!(started.elapsed() < Duration::from_secs(4));
        blocker.abort();
    }
}
