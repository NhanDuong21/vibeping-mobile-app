use super::{CodexSignal, installer};
use crate::{
    RuntimeConfig,
    features::{lifecycle::RuntimePaths, notifications::safe_label},
    infrastructure::codex_app_server::CodexAppServer,
};
use serde_json::{Value, json};
use std::{path::PathBuf, time::Duration};
use tokio::time::timeout;

pub async fn task_label(
    bytes: &[u8],
    signal: CodexSignal,
    data_dir: Option<PathBuf>,
) -> Option<String> {
    if !matches!(
        signal,
        CodexSignal::Started
            | CodexSignal::PermissionRequired
            | CodexSignal::PreviewReady
            | CodexSignal::Stopped
            | CodexSignal::Completed
    ) {
        return None;
    }
    let config = RuntimeConfig::discover(8790, data_dir).ok()?;
    if !RuntimePaths::new(config.data_dir().to_path_buf()).is_enabled() {
        return None;
    }
    let value: Value = serde_json::from_slice(bytes).ok()?;
    let id = ["session_id", "thread-id", "thread_id"]
        .iter()
        .find_map(|key| value.get(key)?.as_str())?;
    if id.is_empty() || id.len() > 256 || id.chars().any(char::is_control) {
        return None;
    }
    let executable = installer::metadata_executable().ok()??;
    // Best effort metadata must not block hooks (5 seconds) or change the work's lifecycle.
    timeout(Duration::from_secs(2), async {
        let mut server = CodexAppServer::start(&executable).await.ok()?;
        let response = server
            .request(
                "thread/read",
                Some(json!({
                    "threadId": id, "includeTurns": false
                })),
            )
            .await
            .ok()?;
        label_from_response(&response)
    })
    .await
    .ok()
    .flatten()
}

fn label_from_response(response: &Value) -> Option<String> {
    safe_label(response.get("thread")?.get("name")?.as_str()?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_named_metadata_is_used_never_preview_or_turn_output() {
        assert_eq!(label_from_response(&json!({"thread": {
            "name": "Hoàn thiện màn Hoạt động", "preview": "private prompt", "turns": ["private output"]
        }})).as_deref(), Some("Hoàn thiện màn Hoạt động"));
        for name in [
            Value::Null,
            json!(""),
            json!("task\nprivate output"),
            json!("secret@example.test"),
        ] {
            assert!(
                label_from_response(&json!({"thread": {"name": name, "preview": "Never use me"}}))
                    .is_none()
            );
        }
    }

    #[tokio::test]
    async fn explicit_stop_does_not_launch_metadata_reader() {
        let temp = tempfile::tempdir().unwrap();
        let paths = RuntimePaths::new(temp.path().into());
        paths.ensure().unwrap();
        paths.write_intent(false).unwrap();
        assert!(
            task_label(
                br#"{"session_id":"fake"}"#,
                CodexSignal::Completed,
                Some(temp.path().into())
            )
            .await
            .is_none()
        );
    }
}
