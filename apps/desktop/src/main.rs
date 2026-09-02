use std::process::ExitCode;

use clap::{Parser, Subcommand};
use vibeping::features::{
    codex_attention::command::{self as codex_command, CodexIntegrationArgs},
    lifecycle::{self, DataOptions, HostOptions, LifecycleCommand},
    recovery::{self, BackupArgs, ResetNotificationsArgs, RestoreArgs},
};

#[derive(Debug, Parser)]
#[command(
    name = "vibeping",
    version,
    about = "Cầu nối chú ý riêng tư cho Codex",
    subcommand_required = true,
    arg_required_else_help = true
)]
struct Cli {
    #[command(subcommand)]
    command: RootCommand,
}

#[derive(Debug, Subcommand)]
enum RootCommand {
    #[command(about = "Khởi động VibePing ở nền")]
    Start(HostOptions),
    #[command(about = "Chạy VibePing ở cửa sổ hiện tại")]
    Run(HostOptions),
    #[command(about = "Dừng VibePing an toàn")]
    Stop(DataOptions),
    #[command(about = "Khởi động lại VibePing")]
    Restart(HostOptions),
    #[command(about = "Xem trạng thái hiện tại")]
    Status(DataOptions),
    #[command(about = "Kiểm tra khả năng vận hành")]
    Doctor(DataOptions),
    #[command(about = "Mở VibePing bằng trình duyệt mặc định")]
    Open(DataOptions),
    #[command(about = "Tạo bản sao dữ liệu cục bộ")]
    Backup(BackupArgs),
    #[command(about = "Khôi phục từ bản sao dữ liệu")]
    Restore(RestoreArgs),
    #[command(about = "Đặt lại dữ liệu có xác nhận")]
    Reset {
        #[command(subcommand)]
        action: ResetCommand,
    },
    #[command(about = "Quản lý tích hợp")]
    Integrations {
        #[command(subcommand)]
        integration: IntegrationCommand,
    },
}

#[derive(Debug, Subcommand)]
enum IntegrationCommand {
    #[command(about = "Tích hợp chú ý từ Codex")]
    Codex(CodexIntegrationArgs),
}

#[derive(Debug, Subcommand)]
enum ResetCommand {
    #[command(about = "Xóa đăng ký thông báo để đăng ký lại")]
    Notifications(ResetNotificationsArgs),
}

#[tokio::main]
async fn main() -> ExitCode {
    let result = match Cli::parse().command {
        RootCommand::Start(value) => lifecycle::execute(LifecycleCommand::Start(value)).await,
        RootCommand::Run(value) => lifecycle::execute(LifecycleCommand::Run(value)).await,
        RootCommand::Stop(value) => lifecycle::execute(LifecycleCommand::Stop(value)).await,
        RootCommand::Restart(value) => lifecycle::execute(LifecycleCommand::Restart(value)).await,
        RootCommand::Status(value) => lifecycle::execute(LifecycleCommand::Status(value)).await,
        RootCommand::Doctor(value) => lifecycle::execute(LifecycleCommand::Doctor(value)).await,
        RootCommand::Open(value) => lifecycle::execute(LifecycleCommand::Open(value)).await,
        RootCommand::Backup(value) => recovery::command::backup(value).await,
        RootCommand::Restore(value) => recovery::command::restore(value).await,
        RootCommand::Reset {
            action: ResetCommand::Notifications(value),
        } => recovery::command::reset_notifications(value).await,
        RootCommand::Integrations {
            integration: IntegrationCommand::Codex(value),
        } => codex_command::execute(value).await,
    };
    match result {
        Ok(message) => {
            println!("{message}");
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("VibePing chưa hoàn tất thao tác: {error}");
            ExitCode::FAILURE
        }
    }
}
