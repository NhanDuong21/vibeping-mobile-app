use super::thread_identity::{self, ThreadIdentity, ThreadMetadata};
use super::{CodexResult, CodexSignal, installer, result_content};
use crate::{
    RuntimeConfig,
    features::{lifecycle::RuntimePaths, notifications::safe_label},
    infrastructure::codex_app_server::CodexAppServer,
};
use serde_json::{Value, json};
use std::collections::HashMap;
use std::{path::PathBuf, time::Duration};
use tokio::time::timeout;

pub struct TaskMetadata {
    pub label: Option<String>,
    pub result: Option<CodexResult>,
    pub identity: Option<ThreadIdentity>,
}

pub async fn read(
    bytes: &[u8],
    signal: CodexSignal,
    needs_result: bool,
    data_dir: Option<PathBuf>,
) -> Option<TaskMetadata> {
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
    let turn_id = ["turn_id", "turn-id"]
        .iter()
        .find_map(|key| value.get(key)?.as_str());
    let include_result = signal == CodexSignal::Completed && needs_result && turn_id.is_some();
    // Best effort metadata must not block hooks (5 seconds) or change the work's lifecycle.
    let (mut server, response) = timeout(Duration::from_secs(2), async {
        let executable = installer::runtime_executable().ok()?;
        let mut server = CodexAppServer::start(&executable, Duration::from_secs(12))
            .await
            .ok()?;
        let response = server
            .request(
                "thread/read",
                Some(json!({
                    "threadId": id, "includeTurns": include_result
                })),
            )
            .await
            .ok()?;
        Some((server, response))
    })
    .await
    .ok()
    .flatten()?;
    let metadata = TaskMetadata {
        label: label_from_response(&response),
        result: include_result
            .then(|| result_content::from_thread(&response, turn_id?))
            .flatten(),
        identity: None,
    };
    Some(complete_identity(metadata, read_identity(&mut server, id, &response)).await)
}

async fn complete_identity(
    mut metadata: TaskMetadata,
    lookup: impl std::future::Future<Output = Option<ThreadIdentity>>,
) -> TaskMetadata {
    // An optional parent lookup may time out, but never discard an answer already read.
    metadata.identity = timeout(Duration::from_millis(500), lookup)
        .await
        .ok()
        .flatten();
    metadata
}

async fn read_identity(
    server: &mut CodexAppServer,
    id: &str,
    response: &Value,
) -> Option<ThreadIdentity> {
    let first = ThreadMetadata::parse(response.get("thread")?)?;
    if first.id != id {
        return None;
    }
    let mut parent = first.parent.clone();
    let mut metadata = HashMap::from([(first.id.clone(), first)]);
    for _ in 0..16 {
        let Some(next) = parent else {
            return thread_identity::resolve(id, &metadata);
        };
        if metadata.contains_key(&next) {
            return None;
        }
        let response = server
            .request(
                "thread/read",
                Some(json!({"threadId": next, "includeTurns": false})),
            )
            .await
            .ok()?;
        let thread = ThreadMetadata::parse(response.get("thread")?)?;
        if thread.id != next {
            return None;
        }
        parent = thread.parent.clone();
        metadata.insert(thread.id.clone(), thread);
    }
    None
}

fn label_from_response(response: &Value) -> Option<String> {
    safe_label(response.get("thread")?.get("name")?.as_str()?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn stalled_ancestry_preserves_the_completed_answer_and_label() {
        let value = TaskMetadata {
            label: Some("Kết quả chính".into()),
            result: Some(CodexResult {
                text: "Câu trả lời đã đọc đầy đủ".into(),
                truncated: false,
            }),
            identity: None,
        };
        let kept = complete_identity(value, std::future::pending()).await;
        assert_eq!(kept.label.as_deref(), Some("Kết quả chính"));
        assert_eq!(kept.result.unwrap().text, "Câu trả lời đã đọc đầy đủ");
        assert!(kept.identity.is_none());
    }

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
            read(
                br#"{"session_id":"fake"}"#,
                CodexSignal::Completed,
                true,
                Some(temp.path().into())
            )
            .await
            .is_none()
        );
    }
}
