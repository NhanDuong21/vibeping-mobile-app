use std::{fs, path::PathBuf, time::Duration};

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use vibeping_gate1::{
    app_server::read_real_account,
    format::format_vietnamese,
    normalize::{NormalizedLimits, normalize_response},
    redact::redact_sensitive_text,
};

#[derive(Debug, Parser)]
#[command(name = "vibeping-gate1", version, about)]
struct Cli {
    #[arg(long, default_value_t = 12)]
    timeout_seconds: u64,
    #[command(subcommand)]
    command: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
    /// Đọc hạn mức hiện tại từ tài khoản Codex đang đăng nhập.
    Read {
        #[arg(long)]
        json: bool,
    },
    /// Kiểm tra đường kết nối tới Codex mà không in email hoặc khóa.
    Doctor,
}

#[tokio::main]
async fn main() {
    if let Err(error) = run().await {
        eprintln!(
            "Chưa đọc được thông tin từ Codex: {}",
            redact_sensitive_text(&error.to_string())
        );
        std::process::exit(1);
    }
}

async fn run() -> Result<()> {
    let cli = Cli::parse();
    let read = read_real_account(Duration::from_secs(cli.timeout_seconds)).await?;
    let normalized = normalize_response(read.rate_limits)?;
    persist_last_read(&normalized)?;

    match cli.command {
        Command::Read { json: true } => println!("{}", serde_json::to_string_pretty(&normalized)?),
        Command::Read { json: false } => println!("{}", format_vietnamese(&normalized)),
        Command::Doctor => {
            println!("Codex App Server: sẵn sàng");
            println!("Tài khoản: {}", read.account.human_auth_label());
            println!("Cửa sổ hạn mức: {}", normalized.windows.len());
            println!("Không đọc tệp đăng nhập hoặc khóa truy cập.");
        }
    }
    Ok(())
}

fn persist_last_read(limits: &NormalizedLimits) -> Result<()> {
    let directory = runtime_directory()?;
    fs::create_dir_all(&directory).context("could not create ignored Gate 1 runtime directory")?;
    let content = serde_json::to_vec_pretty(limits)?;
    fs::write(directory.join("last-read.json"), content)
        .context("could not write ignored Gate 1 result")
}

fn runtime_directory() -> Result<PathBuf> {
    Ok(std::env::current_dir()?.join(".runtime").join("gate1"))
}
