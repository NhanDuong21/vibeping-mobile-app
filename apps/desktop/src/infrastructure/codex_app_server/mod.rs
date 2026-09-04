mod protocol;

use anyhow::{Context, Result};
pub(crate) use protocol::JsonLineClient;
use serde_json::{Value, json};
use std::{path::Path, process::Stdio, time::Duration};
use tokio::process::{Child, ChildStdin, Command};

pub struct CodexAppServer {
    _child: Child,
    client: JsonLineClient<ChildStdin>,
    next_id: u64,
}

impl CodexAppServer {
    pub async fn start(executable: &Path) -> Result<Self> {
        let mut command = Command::new(executable);
        command
            .arg("app-server")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .kill_on_drop(true);
        hide_window(&mut command);
        let mut child = command.spawn().context("CODEX_APP_SERVER_NOT_FOUND")?;
        let stdin = child.stdin.take().context("APP_SERVER_STDIN_MISSING")?;
        let stdout = child.stdout.take().context("APP_SERVER_STDOUT_MISSING")?;
        let mut session = Self {
            _child: child,
            client: JsonLineClient::new(stdout, stdin, Duration::from_secs(12)),
            next_id: 1,
        };
        session.request("initialize", Some(json!({
            "clientInfo": { "name": "vibeping", "title": "VibePing", "version": env!("CARGO_PKG_VERSION") }
        }))).await?;
        session.client.notify("initialized", None).await?;
        Ok(session)
    }

    pub async fn request(&mut self, method: &str, params: Option<Value>) -> Result<Value> {
        let id = self.next_id;
        self.next_id += 1;
        self.client.request(id, method, params).await
    }

    pub async fn read_message(&mut self) -> Result<Value> {
        self.client.read_message().await
    }
}

#[cfg(windows)]
fn hide_window(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    use windows_sys::Win32::System::Threading::CREATE_NO_WINDOW;
    command.as_std_mut().creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn hide_window(_command: &mut Command) {}
