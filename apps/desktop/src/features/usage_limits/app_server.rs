use std::{path::Path, process::Stdio, time::Duration};

use anyhow::{Context, Result, bail};
use serde::Deserialize;
use serde_json::{Value, json};
use tokio::{
    io::AsyncReadExt,
    process::{Child, ChildStdin, Command},
};

use super::protocol::JsonLineClient;

type Client = JsonLineClient<ChildStdin>;

pub struct AppServerSession {
    _child: Child,
    client: Client,
    next_id: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AccountReadResponse {
    account: Option<Value>,
    requires_openai_auth: bool,
}

impl AppServerSession {
    pub async fn start(executable: &Path) -> Result<Self> {
        let mut command = Command::new(executable);
        command
            .arg("app-server")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);
        hide_window(&mut command);
        let mut child = command.spawn().context("CODEX_APP_SERVER_NOT_FOUND")?;
        let stdin = child.stdin.take().context("APP_SERVER_STDIN_MISSING")?;
        let stdout = child.stdout.take().context("APP_SERVER_STDOUT_MISSING")?;
        let mut stderr = child.stderr.take().context("APP_SERVER_STDERR_MISSING")?;
        tokio::spawn(async move {
            let mut discard = Vec::new();
            let _ = (&mut stderr).take(65_536).read_to_end(&mut discard).await;
        });
        let mut session = Self {
            _child: child,
            client: JsonLineClient::new(stdout, stdin, Duration::from_secs(12)),
            next_id: 1,
        };
        session.initialize().await?;
        session.require_supported_account().await?;
        Ok(session)
    }

    pub async fn read_limits(&mut self) -> Result<Value> {
        self.request("account/rateLimits/read", None).await
    }

    pub async fn next_notification(&mut self) -> Result<bool> {
        let message = self.client.read_message().await?;
        Ok(message.get("method").and_then(Value::as_str) == Some("account/rateLimits/updated"))
    }

    async fn initialize(&mut self) -> Result<()> {
        self.request(
            "initialize",
            Some(json!({
                "clientInfo": {
                    "name": "vibeping",
                    "title": "VibePing",
                    "version": env!("CARGO_PKG_VERSION")
                }
            })),
        )
        .await?;
        self.client.notify("initialized", None).await
    }

    async fn require_supported_account(&mut self) -> Result<()> {
        let value = self
            .request("account/read", Some(json!({ "refreshToken": false })))
            .await?;
        parse_account(value)
    }

    async fn request(&mut self, method: &str, params: Option<Value>) -> Result<Value> {
        let id = self.next_id;
        self.next_id += 1;
        self.client.request(id, method, params).await
    }
}

fn parse_account(value: Value) -> Result<()> {
    let response: AccountReadResponse =
        serde_json::from_value(value).context("ACCOUNT_RESPONSE_MALFORMED")?;
    let Some(account) = response.account else {
        if response.requires_openai_auth {
            bail!("ACCOUNT_NOT_SIGNED_IN")
        }
        bail!("ACCOUNT_MODE_UNSUPPORTED")
    };
    let auth_type = account
        .get("type")
        .and_then(Value::as_str)
        .unwrap_or("unknown");
    if matches!(auth_type, "apiKey" | "amazonBedrock") {
        bail!("ACCOUNT_MODE_UNSUPPORTED")
    }
    Ok(())
}

#[cfg(windows)]
fn hide_window(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    use windows_sys::Win32::System::Threading::CREATE_NO_WINDOW;
    command.as_std_mut().creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn hide_window(_command: &mut Command) {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn signed_out_and_api_key_accounts_are_not_misrepresented() {
        assert!(
            parse_account(json!({
                "account": null, "requiresOpenaiAuth": true
            }))
            .unwrap_err()
            .to_string()
            .contains("NOT_SIGNED_IN")
        );
        assert!(
            parse_account(json!({
                "account": {"type": "apiKey", "email": "private@example.com"},
                "requiresOpenaiAuth": false
            }))
            .unwrap_err()
            .to_string()
            .contains("UNSUPPORTED")
        );
    }

    #[test]
    fn signed_in_account_is_accepted_without_returning_identity_fields() {
        assert!(
            parse_account(json!({
                "account": {"type": "chatgpt", "email": "private@example.com"},
                "requiresOpenaiAuth": false
            }))
            .is_ok()
        );
    }
}
