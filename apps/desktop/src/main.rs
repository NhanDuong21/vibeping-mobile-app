use std::path::PathBuf;

use anyhow::Result;
use clap::Parser;
use vibeping::{RuntimeConfig, run};

#[derive(Debug, Parser)]
#[command(name = "vibeping", version, about = "Cầu nối chú ý riêng tư cho Codex")]
struct Cli {
    #[arg(long, default_value_t = 8790)]
    port: u16,
    #[arg(long)]
    data_dir: Option<PathBuf>,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .compact()
        .init();

    let cli = Cli::parse();
    run(RuntimeConfig::discover(cli.port, cli.data_dir)?).await
}
