use crate::infrastructure::codex_app_server::CodexAppServer;
use anyhow::{Context, Result, bail};
use serde::Deserialize;
use serde_json::{Value, json};
use std::{path::Path, time::Duration};

// Real Codex allowance reads can take over 12 seconds on a slow connection.
pub(super) const READ_TIMEOUT: Duration = Duration::from_secs(30);

pub struct AppServerSession {
    server: CodexAppServer,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AccountReadResponse {
    account: Option<Value>,
    requires_openai_auth: bool,
}

impl AppServerSession {
    pub async fn start(executable: &Path) -> Result<Self> {
        let mut server = CodexAppServer::start(executable, READ_TIMEOUT).await?;
        parse_account(
            server
                .request("account/read", Some(json!({ "refreshToken": false })))
                .await?,
        )?;
        Ok(Self { server })
    }

    pub async fn read_limits(&mut self) -> Result<Value> {
        self.server.request("account/rateLimits/read", None).await
    }

    pub async fn next_notification(&mut self) -> Result<bool> {
        let message = self.server.read_message().await?;
        Ok(message.get("method").and_then(Value::as_str) == Some("account/rateLimits/updated"))
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
