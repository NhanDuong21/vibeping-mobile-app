use std::{collections::VecDeque, time::Duration};

use anyhow::{Context, Result, anyhow, bail};
use serde_json::{Value, json};
use tokio::{
    io::{AsyncBufReadExt, AsyncRead, AsyncWrite, AsyncWriteExt, BufReader},
    sync::mpsc,
    time::timeout,
};

pub struct JsonLineClient<W> {
    messages: mpsc::Receiver<Result<Value, &'static str>>,
    writer: W,
    request_timeout: Duration,
    pending_notifications: VecDeque<Value>,
}

impl<W> JsonLineClient<W>
where
    W: AsyncWrite + Unpin,
{
    pub fn new<R>(reader: R, writer: W, request_timeout: Duration) -> Self
    where
        R: AsyncRead + Unpin + Send + 'static,
    {
        let (sender, messages) = mpsc::channel(64);
        tokio::spawn(read_lines(reader, sender));
        Self {
            messages,
            writer,
            request_timeout,
            pending_notifications: VecDeque::new(),
        }
    }

    pub async fn request(&mut self, id: u64, method: &str, params: Option<Value>) -> Result<Value> {
        let mut message = json!({ "method": method, "id": id });
        if let Some(params) = params {
            message["params"] = params;
        }
        self.write_message(&message).await?;
        timeout(self.request_timeout, self.read_matching_response(id))
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

    pub async fn read_message(&mut self) -> Result<Value> {
        if let Some(message) = self.pending_notifications.pop_front() {
            return Ok(message);
        }
        self.receive_raw().await
    }

    async fn receive_raw(&mut self) -> Result<Value> {
        self.messages
            .recv()
            .await
            .context("APP_SERVER_EXITED_EARLY")?
            .map_err(|code| anyhow!(code))
    }

    async fn write_message(&mut self, message: &Value) -> Result<()> {
        let mut line = serde_json::to_vec(message)?;
        line.push(b'\n');
        self.writer
            .write_all(&line)
            .await
            .context("APP_SERVER_WRITE_FAILED")?;
        self.writer.flush().await.context("APP_SERVER_FLUSH_FAILED")
    }

    async fn read_matching_response(&mut self, expected_id: u64) -> Result<Value> {
        loop {
            let message = self.receive_raw().await?;
            if message.get("id").and_then(Value::as_u64) != Some(expected_id) {
                if message.get("method").is_some() {
                    self.pending_notifications.push_back(message);
                }
                continue;
            }
            if let Some(error) = message.get("error") {
                let code = error
                    .get("code")
                    .and_then(Value::as_i64)
                    .unwrap_or_default();
                bail!("APP_SERVER_REMOTE_ERROR_{code}")
            }
            return message
                .get("result")
                .cloned()
                .context("APP_SERVER_RESULT_MISSING");
        }
    }
}

async fn read_lines<R>(reader: R, sender: mpsc::Sender<Result<Value, &'static str>>)
where
    R: AsyncRead + Unpin,
{
    let mut lines = BufReader::new(reader).lines();
    loop {
        let message = match lines.next_line().await {
            Ok(Some(line)) => serde_json::from_str(&line).map_err(|_| "APP_SERVER_MALFORMED_JSONL"),
            Ok(None) => break,
            Err(_) => Err("APP_SERVER_READ_FAILED"),
        };
        let should_stop = message.is_err();
        if sender.send(message).await.is_err() || should_stop {
            break;
        }
    }
}
