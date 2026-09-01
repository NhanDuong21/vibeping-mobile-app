use std::time::Duration;

use anyhow::{Context, Result, anyhow, bail};
use serde_json::{Value, json};
use tokio::{
    io::{AsyncBufReadExt, AsyncRead, AsyncWrite, AsyncWriteExt, BufReader},
    time::timeout,
};

pub struct JsonLineClient<R, W> {
    reader: BufReader<R>,
    writer: W,
    timeout: Duration,
}

impl<R, W> JsonLineClient<R, W>
where
    R: AsyncRead + Unpin,
    W: AsyncWrite + Unpin,
{
    pub fn new(reader: R, writer: W, timeout: Duration) -> Self {
        Self {
            reader: BufReader::new(reader),
            writer,
            timeout,
        }
    }

    pub async fn request(&mut self, id: u64, method: &str, params: Option<Value>) -> Result<Value> {
        let mut message = json!({ "method": method, "id": id });
        if let Some(params) = params {
            message["params"] = params;
        }
        self.write_message(&message).await?;
        timeout(self.timeout, self.read_matching_response(id))
            .await
            .map_err(|_| anyhow!("APP_SERVER_TIMEOUT"))?
    }

    pub async fn notify(&mut self, method: &str, params: Option<Value>) -> Result<()> {
        let mut message = json!({ "method": method });
        if let Some(params) = params {
            message["params"] = params;
        }
        self.write_message(&message).await
    }

    async fn write_message(&mut self, message: &Value) -> Result<()> {
        let mut line = serde_json::to_vec(message)?;
        line.push(b'\n');
        self.writer
            .write_all(&line)
            .await
            .context("could not write App Server request")?;
        self.writer
            .flush()
            .await
            .context("could not flush App Server request")
    }

    async fn read_matching_response(&mut self, expected_id: u64) -> Result<Value> {
        loop {
            let mut line = String::new();
            let bytes = self
                .reader
                .read_line(&mut line)
                .await
                .context("could not read App Server output")?;
            if bytes == 0 {
                bail!("APP_SERVER_EXITED_EARLY");
            }
            let message: Value = serde_json::from_str(line.trim_end())
                .map_err(|_| anyhow!("APP_SERVER_MALFORMED_JSONL"))?;
            if message.get("id").and_then(Value::as_u64) != Some(expected_id) {
                continue;
            }
            if let Some(error) = message.get("error") {
                let code = error
                    .get("code")
                    .and_then(Value::as_i64)
                    .unwrap_or_default();
                bail!("APP_SERVER_REMOTE_ERROR_{code}");
            }
            return message
                .get("result")
                .cloned()
                .context("App Server response has no result");
        }
    }
}

#[cfg(test)]
mod tests {
    use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader, duplex};

    use super::*;

    #[tokio::test]
    async fn matches_request_id_through_interleaved_notifications() {
        let (client_read, mut server_write) = duplex(4096);
        let (server_read, client_write) = duplex(4096);
        let server = tokio::spawn(async move {
            let mut request = String::new();
            BufReader::new(server_read)
                .read_line(&mut request)
                .await
                .unwrap();
            assert_eq!(serde_json::from_str::<Value>(&request).unwrap()["id"], 7);
            server_write
                .write_all(include_bytes!("../fixtures/notification-interleaved.jsonl"))
                .await
                .unwrap();
        });
        let mut client = JsonLineClient::new(client_read, client_write, Duration::from_secs(1));
        let response = client.request(7, "account/read", None).await.unwrap();
        assert_eq!(response["ok"], true);
        server.await.unwrap();
    }

    #[tokio::test]
    async fn malformed_line_is_rejected() {
        let (client_read, mut server_write) = duplex(128);
        let (_server_read, client_write) = duplex(128);
        tokio::spawn(async move { server_write.write_all(b"not-json\n").await.unwrap() });
        let mut client = JsonLineClient::new(client_read, client_write, Duration::from_secs(1));
        let error = client.request(1, "test", None).await.unwrap_err();
        assert!(error.to_string().contains("MALFORMED_JSONL"));
    }

    #[tokio::test]
    async fn timeout_is_bounded() {
        let (client_read, _server_write) = duplex(128);
        let (_server_read, client_write) = duplex(128);
        let mut client = JsonLineClient::new(client_read, client_write, Duration::from_millis(20));
        let error = client.request(1, "test", None).await.unwrap_err();
        assert!(error.to_string().contains("TIMEOUT"));
    }
}
