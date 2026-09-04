use super::{
    config::{self, ReadyConfig},
    supervisor,
};
use crate::{
    RuntimeConfig,
    features::lifecycle::{self, RuntimePaths},
};
use anyhow::{Context, Result};
use clap::{Args, Subcommand};
use std::{ffi::OsString, path::PathBuf};

#[derive(Clone, Debug, Args)]
pub struct ReadyArgs {
    #[command(subcommand)]
    pub action: ReadyAction,
    #[arg(long, global = true, default_value_t = 8787)]
    pub port: u16,
    #[arg(long, global = true)]
    pub data_dir: Option<PathBuf>,
}
#[derive(Clone, Debug, Subcommand)]
pub enum ReadyAction {
    #[command(about = "Bật khay Windows, khôi phục host và chạy khi đăng nhập")]
    Enable,
    #[command(about = "Tắt khay và khởi động cùng Windows; host vẫn giữ trạng thái hiện tại")]
    Disable,
    #[command(about = "Xem trạng thái sẵn sàng")]
    Status,
    #[command(hide = true)]
    Watch,
    #[command(hide = true)]
    Login,
}

pub async fn execute(args: ReadyArgs) -> Result<String> {
    let runtime = RuntimeConfig::discover(args.port, args.data_dir.clone())?;
    let paths = RuntimePaths::new(runtime.data_dir().to_owned());
    paths.ensure()?;
    match args.action {
        ReadyAction::Enable => {
            set_auto_start(&paths, args.port, true)?;
            config::write(
                paths.data_dir(),
                &ReadyConfig {
                    enabled: true,
                    auto_start: true,
                    port: args.port,
                },
            )?;
            paths.write_intent(true)?;
            spawn(&paths, args.port)?;
            for _ in 0..16 {
                if config::status(paths.data_dir()).tray_available {
                    return Ok("Đã bật Sẵn sàng trên Windows. Tìm mèo VibePing trong khay hoặc nhóm biểu tượng ẩn.".into());
                }
                tokio::time::sleep(std::time::Duration::from_secs(1)).await;
            }
            Ok("Đã lưu lựa chọn Sẵn sàng. Khay chưa phản hồi; hãy kiểm tra lại bằng always-ready status.".into())
        }
        ReadyAction::Disable => {
            set_auto_start(&paths, args.port, false)?;
            config::write(
                paths.data_dir(),
                &ReadyConfig {
                    enabled: false,
                    auto_start: false,
                    port: args.port,
                },
            )?;
            Ok("Đã tắt khay, khôi phục tự động và khởi động cùng Windows.".into())
        }
        ReadyAction::Status => Ok(serde_json::to_string(&config::status(paths.data_dir()))?),
        ReadyAction::Watch => supervisor::run(paths, false).await,
        ReadyAction::Login => supervisor::run(paths, true).await,
    }
}

pub(super) fn set_auto_start(paths: &RuntimePaths, port: u16, enabled: bool) -> Result<()> {
    #[cfg(windows)]
    {
        super::startup::set(paths, port, enabled)
    }
    #[cfg(not(windows))]
    {
        let _ = (paths, port, enabled);
        anyhow::bail!("Chức năng này cần Windows");
    }
}

fn spawn(paths: &RuntimePaths, port: u16) -> Result<()> {
    let executable = std::env::current_exe().context("Không tìm thấy VibePing")?;
    lifecycle::spawn_detached(
        &executable,
        &[
            OsString::from("always-ready"),
            OsString::from("watch"),
            OsString::from("--port"),
            OsString::from(port.to_string()),
            OsString::from("--data-dir"),
            paths.data_dir().as_os_str().to_owned(),
        ],
    )
}
