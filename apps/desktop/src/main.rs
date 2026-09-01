use std::process::ExitCode;

use clap::Parser;
use vibeping::features::lifecycle::{LifecycleCommand, execute};

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
    command: LifecycleCommand,
}

#[tokio::main]
async fn main() -> ExitCode {
    match execute(Cli::parse().command).await {
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
