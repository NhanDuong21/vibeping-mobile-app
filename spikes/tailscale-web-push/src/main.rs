mod api;
mod delivery;
mod models;
mod paths;
mod server;
mod storage;

use anyhow::Result;
use clap::{Parser, Subcommand};
use delivery::{Notification, send_notification};
use paths::Gate0Paths;

#[derive(Debug, Parser)]
#[command(name = "vibeping-gate0", version, about)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
    /// Chạy máy chủ kiểm tra trên 127.0.0.1:8787.
    Serve {
        #[arg(long)]
        stop_file: Option<std::path::PathBuf>,
    },
    /// Gửi thông báo thử tới điện thoại đã lưu.
    Send {
        #[arg(long, default_value = "VibePing")]
        title: String,
        #[arg(long, default_value = "Kết nối riêng tư đã hoạt động 🎉")]
        body: String,
        #[arg(long, default_value = "/")]
        url: String,
    },
    /// Xem trạng thái dữ liệu cục bộ của Gate 0.
    Status,
    /// Xóa đăng ký điện thoại nhưng giữ nguyên danh tính gửi.
    ResetSubscription,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .compact()
        .init();

    let paths = Gate0Paths::discover()?;
    match Cli::parse().command {
        Command::Serve { stop_file } => server::serve(paths, stop_file).await,
        Command::Send { title, body, url } => {
            let result = send_notification(&paths, Notification::new(title, body, url)).await?;
            println!("{}", result.human_message());
            if result.accepted {
                Ok(())
            } else {
                std::process::exit(2)
            }
        }
        Command::Status => {
            println!("Danh tính gửi: {}", ready(paths.vapid_file().is_file()));
            println!(
                "Điện thoại: {}",
                ready(storage::load_subscription(&paths).is_ok())
            );
            Ok(())
        }
        Command::ResetSubscription => {
            storage::remove_subscription(&paths)?;
            println!("Đã xóa đăng ký điện thoại. Danh tính gửi vẫn được giữ nguyên.");
            Ok(())
        }
    }
}

fn ready(value: bool) -> &'static str {
    if value { "sẵn sàng" } else { "chưa có" }
}
