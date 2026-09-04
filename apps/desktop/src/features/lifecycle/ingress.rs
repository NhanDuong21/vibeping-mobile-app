use std::{fs, path::PathBuf};

use anyhow::{Context, Result};
use tokio::sync::mpsc;

use crate::{RuntimeConfig, features::codex_attention::CodexIngress};

use super::{RuntimePaths, ipc};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum IngressDelivery {
    Delivered,
    Spooled,
    Ignored,
}

pub async fn deliver_ingress(
    payload: CodexIngress,
    data_dir: Option<PathBuf>,
) -> Result<IngressDelivery> {
    let config = RuntimeConfig::discover(8790, data_dir)?;
    let paths = RuntimePaths::new(config.data_dir().to_path_buf());
    if let Ok(Some(metadata)) = paths.read_metadata()
        && ipc::request_ingress(
            &metadata.control_address,
            &metadata.control_token,
            payload.clone(),
        )
        .await
        .is_ok()
    {
        return Ok(IngressDelivery::Delivered);
    }
    if !paths.is_enabled() {
        return Ok(IngressDelivery::Ignored);
    }
    let bytes = serde_json::to_vec(&payload).context("Không chuẩn bị được mục chờ Codex")?;
    paths.spool(&bytes)?;
    Ok(IngressDelivery::Spooled)
}

pub async fn restore_pending(
    paths: &RuntimePaths,
    sender: &mpsc::Sender<CodexIngress>,
) -> Result<usize> {
    let mut restored = 0;
    for path in paths.pending_files()? {
        let bytes = fs::read(&path).context("Không đọc được mục Codex đang chờ")?;
        let Ok(payload) = serde_json::from_slice(&bytes) else {
            paths.quarantine(&path)?;
            continue;
        };
        sender
            .send(payload)
            .await
            .context("Kênh Codex chưa sẵn sàng")?;
        fs::remove_file(path).context("Không dọn được mục Codex đã khôi phục")?;
        restored += 1;
    }
    Ok(restored)
}

#[cfg(test)]
mod tests {
    use chrono::Utc;
    use tempfile::tempdir;

    use crate::features::codex_attention::CodexSignal;

    use super::*;

    fn event() -> CodexIngress {
        CodexIngress {
            session_key: "session".into(),
            turn_key: "turn".into(),
            project_name: "project".into(),
            task_label: None,
            thread_identity: None,
            result: None,
            signal: CodexSignal::Started,
            occurred_at: Utc::now(),
        }
    }

    #[tokio::test]
    async fn explicit_stop_ignores_and_unexpected_unavailability_spools_once() {
        let temp = tempdir().unwrap();
        let data = temp.path().join("data");
        let paths = RuntimePaths::new(data.clone());
        paths.ensure().unwrap();
        paths.write_intent(false).unwrap();
        assert_eq!(
            deliver_ingress(event(), Some(data.clone())).await.unwrap(),
            IngressDelivery::Ignored
        );
        assert!(!paths.spool_dir().join("incoming").exists());

        paths.write_intent(true).unwrap();
        assert_eq!(
            deliver_ingress(event(), Some(data)).await.unwrap(),
            IngressDelivery::Spooled
        );
        assert_eq!(paths.drain_spool().unwrap(), 1);
        let (sender, mut receiver) = mpsc::channel(2);
        assert_eq!(restore_pending(&paths, &sender).await.unwrap(), 1);
        assert_eq!(receiver.recv().await.unwrap().turn_key, "turn");
        assert_eq!(restore_pending(&paths, &sender).await.unwrap(), 0);
    }
}
