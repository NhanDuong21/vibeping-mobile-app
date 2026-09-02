use std::{
    io::{self, Read},
    path::PathBuf,
};

use anyhow::{Context, Result};
use clap::{Args, Subcommand};

use crate::features::lifecycle::deliver_ingress;

use super::{installer, normalize};

#[derive(Clone, Debug, Args)]
pub struct CodexIntegrationArgs {
    #[command(subcommand)]
    pub command: CodexIntegrationCommand,
}

#[derive(Clone, Debug, Subcommand)]
pub enum CodexIntegrationCommand {
    #[command(about = "Cài tích hợp Codex an toàn")]
    Install {
        #[arg(long, help = "Tệp chạy Codex cần dùng")]
        codex_path: Option<PathBuf>,
    },
    #[command(about = "Xem trạng thái tích hợp Codex")]
    Status,
    #[command(about = "Sửa tích hợp Codex và giữ cấu hình hiện có")]
    Repair {
        #[arg(long, help = "Tệp chạy Codex cần dùng")]
        codex_path: Option<PathBuf>,
    },
    #[command(about = "Gỡ tích hợp Codex")]
    Remove,
    #[command(hide = true)]
    IngestHook {
        #[arg(long)]
        source: String,
        #[arg(long)]
        data_dir: Option<PathBuf>,
    },
    #[command(hide = true)]
    IngestNotify {
        payload: String,
        #[arg(long)]
        data_dir: Option<PathBuf>,
    },
}

pub async fn execute(args: CodexIntegrationArgs) -> Result<String> {
    match args.command {
        CodexIntegrationCommand::Install { codex_path } => installer::install(codex_path, false),
        CodexIntegrationCommand::Status => installer::status(),
        CodexIntegrationCommand::Repair { codex_path } => installer::install(codex_path, true),
        CodexIntegrationCommand::Remove => installer::remove(),
        CodexIntegrationCommand::IngestHook { source, data_dir } => {
            if source != "vibeping-hook-v1" {
                return Ok("{}".into());
            }
            let mut bytes = Vec::new();
            io::stdin()
                .take(64 * 1024 + 1)
                .read_to_end(&mut bytes)
                .context("Không đọc được tín hiệu Codex")?;
            ingest("hook", &bytes, data_dir).await?;
            Ok("{}".into())
        }
        CodexIntegrationCommand::IngestNotify { payload, data_dir } => {
            ingest("notify", payload.as_bytes(), data_dir).await?;
            let _ = installer::forward_previous(&payload);
            Ok(String::new())
        }
    }
}

async fn ingest(source: &str, bytes: &[u8], data_dir: Option<PathBuf>) -> Result<()> {
    if let Some(payload) = normalize(source, bytes)? {
        let _ = deliver_ingress(payload, data_dir).await?;
    }
    Ok(())
}
