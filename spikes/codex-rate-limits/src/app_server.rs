use std::{process::Stdio, time::Duration};

use anyhow::{Context, Result, bail};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tokio::{io::AsyncReadExt, process::Command, time::timeout};

use crate::protocol::JsonLineClient;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountSummary {
    pub auth_type: String,
    pub plan_type: Option<String>,
}

impl AccountSummary {
    pub fn human_auth_label(&self) -> &'static str {
        match self.auth_type.as_str() {
            "chatgpt" | "chatgptAuthTokens" | "agentIdentity" | "personalAccessToken" => "ChatGPT",
            "apiKey" => "Khóa API (không hỗ trợ hạn mức ChatGPT)",
            "amazonBedrock" => "Amazon Bedrock (không hỗ trợ hạn mức ChatGPT)",
            _ => "Không xác định",
        }
    }
}

#[derive(Clone, Debug)]
pub struct RealAccountRead {
    pub account: AccountSummary,
    pub rate_limits: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AccountReadResponse {
    account: Option<Value>,
    requires_openai_auth: bool,
}

pub async fn read_real_account(request_timeout: Duration) -> Result<RealAccountRead> {
    let executable = std::env::var_os("VIBEPING_CODEX_BIN").unwrap_or_else(|| "codex".into());
    let mut child = Command::new(executable)
        .arg("app-server")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .context("CODEX_APP_SERVER_NOT_FOUND")?;
    let stdin = child
        .stdin
        .take()
        .context("App Server stdin is unavailable")?;
    let stdout = child
        .stdout
        .take()
        .context("App Server stdout is unavailable")?;
    let stderr = child
        .stderr
        .take()
        .context("App Server stderr is unavailable")?;
    let stderr_task = tokio::spawn(async move {
        let mut output = String::new();
        stderr.take(65_536).read_to_string(&mut output).await.ok();
        output
    });

    let mut client = JsonLineClient::new(stdout, stdin, request_timeout);
    client
        .request(
            0,
            "initialize",
            Some(json!({
                "clientInfo": {
                    "name": "vibeping_gate1",
                    "title": "VibePing Gate 1",
                    "version": env!("CARGO_PKG_VERSION")
                }
            })),
        )
        .await?;
    client.notify("initialized", None).await?;
    let account_value = client
        .request(1, "account/read", Some(json!({ "refreshToken": false })))
        .await?;
    let account = parse_account(account_value)?;
    let rate_limits = client.request(2, "account/rateLimits/read", None).await?;
    drop(client);

    if timeout(Duration::from_secs(2), child.wait()).await.is_err() {
        child
            .start_kill()
            .context("could not stop Codex App Server")?;
        let _ = timeout(Duration::from_secs(2), child.wait()).await;
    }
    let _sanitized_stderr = stderr_task.await.unwrap_or_default();
    Ok(RealAccountRead {
        account,
        rate_limits,
    })
}

fn parse_account(value: Value) -> Result<AccountSummary> {
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
        .unwrap_or("unknown")
        .to_owned();
    if matches!(auth_type.as_str(), "apiKey" | "amazonBedrock") {
        bail!("ACCOUNT_MODE_UNSUPPORTED_{auth_type}");
    }
    let plan_type = account
        .get("planType")
        .and_then(Value::as_str)
        .map(str::to_owned);
    Ok(AccountSummary {
        auth_type,
        plan_type,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn signed_out_account_is_reported() {
        let fixture: Value =
            serde_json::from_str(include_str!("../fixtures/not-signed-in.json")).unwrap();
        let error = parse_account(fixture).unwrap_err();
        assert!(error.to_string().contains("NOT_SIGNED_IN"));
    }

    #[test]
    fn api_key_account_is_not_misrepresented() {
        let fixture: Value =
            serde_json::from_str(include_str!("../fixtures/api-key-account.json")).unwrap();
        let error = parse_account(fixture).unwrap_err();
        assert!(error.to_string().contains("UNSUPPORTED_apiKey"));
    }
}
