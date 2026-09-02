use std::{path::PathBuf, sync::Mutex, time::Duration};

use anyhow::{Context, Result, bail};
use chrono::Utc;
use clap::{Args, Subcommand};
use tokio::sync::mpsc;
use tokio::time::{Instant, sleep};
use uuid::Uuid;

use crate::{
    RuntimeConfig, app,
    features::pairing::{PairingStore, PairingUseCase},
    infrastructure,
};

use super::{
    DoctorReport, LifecycleStatus, RuntimePaths, ingress,
    instance_lock::InstanceLock,
    ipc,
    model::RuntimeMetadata,
    process_support,
    tailscale::{self, TailscaleState},
};

#[derive(Clone, Debug, Args)]
pub struct HostOptions {
    #[arg(long, default_value_t = 8790, help = "Cổng cục bộ")]
    port: u16,
    #[arg(long, help = "Thư mục dữ liệu cục bộ")]
    data_dir: Option<PathBuf>,
}

#[derive(Clone, Debug, Args)]
pub struct DataOptions {
    #[arg(long, help = "Thư mục dữ liệu cục bộ")]
    data_dir: Option<PathBuf>,
}

#[derive(Clone, Debug, Subcommand)]
pub enum LifecycleCommand {
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
}

pub async fn execute(command: LifecycleCommand) -> Result<String> {
    match command {
        LifecycleCommand::Start(options) => start(options).await,
        LifecycleCommand::Run(options) => run(options).await,
        LifecycleCommand::Stop(options) => stop(paths_for(options.data_dir)?).await,
        LifecycleCommand::Restart(options) => restart(options).await,
        LifecycleCommand::Status(options) => status(paths_for(options.data_dir)?).await,
        LifecycleCommand::Doctor(options) => doctor(paths_for(options.data_dir)?).await,
        LifecycleCommand::Open(options) => open(paths_for(options.data_dir)?).await,
    }
}

async fn start(options: HostOptions) -> Result<String> {
    let config = RuntimeConfig::discover(options.port, options.data_dir.clone())?;
    let paths = RuntimePaths::new(config.data_dir().to_path_buf());
    paths.ensure()?;
    paths.write_intent(true)?;
    let result = start_enabled(&options, &paths).await;
    if result.is_err() {
        paths.write_intent(false)?;
        clean_failed_start(&paths).await;
    }
    result
}

async fn start_enabled(options: &HostOptions, paths: &RuntimePaths) -> Result<String> {
    match inspect_status(paths).await {
        LifecycleStatus::Running { .. } => return Ok("VibePing đã sẵn sàng".into()),
        LifecycleStatus::Stale => paths.clear_metadata()?,
        LifecycleStatus::Stopped => {}
    }
    tailscale::require_private_serve()?;
    let ready_message = prepare_pairing_message(paths).await?;
    process_support::spawn_background(options.port, paths)?;
    let metadata = wait_for_metadata(paths, Duration::from_secs(8)).await?;
    ipc::wait_until_ready(&metadata.api_address, Duration::from_secs(15)).await?;
    Ok(ready_message)
}

async fn prepare_pairing_message(paths: &RuntimePaths) -> Result<String> {
    let database = infrastructure::database::connect(&paths.database_file()).await?;
    let code = PairingUseCase::new(PairingStore::new(database.clone()))
        .prepare_code()
        .await?;
    database.close().await;
    Ok(match code {
        Some(value) => format!(
            "VibePing đã sẵn sàng\nMã ghép nối: {}\nMã hết hạn sau 10 phút.",
            value.code
        ),
        None => "VibePing đã sẵn sàng".into(),
    })
}

async fn clean_failed_start(paths: &RuntimePaths) {
    let Ok(Some(metadata)) = paths.read_metadata() else {
        return;
    };
    if ipc::health_ready(&metadata.api_address).await {
        let _ = ipc::request_shutdown(&metadata.control_address, &metadata.control_token).await;
        let _ = ipc::wait_until_stopped(&metadata.api_address, Duration::from_secs(5)).await;
    }
    let _ = paths.clear_metadata();
}

async fn run(options: HostOptions) -> Result<String> {
    let config = RuntimeConfig::discover(options.port, options.data_dir)?;
    let paths = RuntimePaths::new(config.data_dir().to_path_buf());
    paths.ensure()?;
    paths.write_intent(true)?;
    init_logging(&paths)?;
    let _lock = InstanceLock::acquire(&paths.lock_file())?;
    let drained = paths.drain_spool()?;
    let (ingress_sender, ingress_receiver) = mpsc::channel(256);
    let restored = ingress::restore_pending(&paths, &ingress_sender).await?;
    let control = ipc::bind_control().await?;
    let metadata = RuntimeMetadata {
        process_id: std::process::id(),
        api_address: config.bind_address().to_string(),
        control_address: control.local_addr()?.to_string(),
        control_token: Uuid::new_v4().to_string(),
        started_at: Utc::now(),
    };
    paths.write_metadata(&metadata)?;
    tracing::info!(drained, restored, "Đã kiểm tra hàng đợi khôi phục");
    let token = metadata.control_token.clone();
    let control_ingress = ingress_sender.clone();
    let result = app::run_with_shutdown(config, ingress_receiver, async move {
        tokio::select! {
            _ = tokio::signal::ctrl_c() => {},
            _ = ipc::wait_for_control(control, token, control_ingress) => {},
        }
    })
    .await;
    paths.clear_metadata()?;
    result?;
    Ok("VibePing đã dừng".into())
}

async fn stop(paths: RuntimePaths) -> Result<String> {
    paths.ensure()?;
    paths.write_intent(false)?;
    let metadata = match paths.read_metadata() {
        Ok(Some(metadata)) => metadata,
        Ok(None) => return Ok("VibePing đã dừng".into()),
        Err(_) => {
            paths.clear_metadata()?;
            return Ok("VibePing đã dừng; trạng thái cũ đã được dọn".into());
        }
    };
    if !ipc::health_ready(&metadata.api_address).await {
        paths.clear_metadata()?;
        return Ok("VibePing đã dừng; trạng thái cũ đã được dọn".into());
    }
    ipc::request_shutdown(&metadata.control_address, &metadata.control_token).await?;
    if !ipc::wait_until_stopped(&metadata.api_address, Duration::from_secs(12)).await {
        bail!("VibePing chưa dừng an toàn trong thời gian chờ")
    }
    paths.clear_metadata()?;
    Ok("VibePing đã dừng an toàn".into())
}

async fn restart(options: HostOptions) -> Result<String> {
    let paths = paths_for(options.data_dir.clone())?;
    let _ = stop(paths).await?;
    start(options).await
}

async fn status(paths: RuntimePaths) -> Result<String> {
    Ok(match inspect_status(&paths).await {
        LifecycleStatus::Running {
            process_id,
            api_address,
        } => format!("VibePing đang chạy (PID {process_id}, {api_address})"),
        LifecycleStatus::Stopped => "VibePing đang dừng".into(),
        LifecycleStatus::Stale => "VibePing đang dừng; có trạng thái cũ cần dọn".into(),
    })
}

async fn doctor(paths: RuntimePaths) -> Result<String> {
    let report = build_doctor_report(&paths).await;
    let state = match report.status {
        LifecycleStatus::Running { .. } => "đang chạy",
        LifecycleStatus::Stopped => "đang dừng",
        LifecycleStatus::Stale => "có trạng thái cũ",
    };
    let origin = report.stable_origin.as_deref().unwrap_or("chưa có");
    let funnel = if !report.tailscale_checked {
        "chưa xác minh"
    } else if report.funnel_active {
        "đang bật"
    } else {
        "đang tắt"
    };
    Ok(format!(
        "Dữ liệu: {}\nVibePing: {state}\nTailscale: {}\nServe riêng tư: {}\nFunnel: {}\nĐịa chỉ riêng: {origin}",
        yes_no(report.data_directory_ready),
        yes_no(report.tailscale_online),
        yes_no(report.serve_ready),
        funnel,
    ))
}

async fn open(paths: RuntimePaths) -> Result<String> {
    if !matches!(
        inspect_status(&paths).await,
        LifecycleStatus::Running { .. }
    ) {
        bail!("VibePing chưa chạy")
    }
    let state = tailscale::require_private_serve()?;
    let origin = state
        .stable_origin
        .context("Chưa có địa chỉ riêng ổn định")?;
    process_support::launch_url(&origin)?;
    Ok("Đã mở VibePing bằng trình duyệt mặc định".into())
}

async fn inspect_status(paths: &RuntimePaths) -> LifecycleStatus {
    match paths.read_metadata() {
        Ok(Some(metadata)) if ipc::health_ready(&metadata.api_address).await => {
            LifecycleStatus::Running {
                process_id: metadata.process_id,
                api_address: metadata.api_address,
            }
        }
        Ok(Some(_)) | Err(_) => LifecycleStatus::Stale,
        Ok(None) => LifecycleStatus::Stopped,
    }
}

pub(crate) async fn ensure_stopped(paths: &RuntimePaths) -> Result<()> {
    if matches!(inspect_status(paths).await, LifecycleStatus::Running { .. }) {
        bail!("Hãy dừng VibePing trước khi tiếp tục")
    }
    Ok(())
}

async fn build_doctor_report(paths: &RuntimePaths) -> DoctorReport {
    let data_directory_ready = paths.ensure().is_ok();
    let status = inspect_status(paths).await;
    let result = tailscale::probe();
    let tailscale_checked = result.is_ok();
    let tailscale = result.unwrap_or(TailscaleState {
        online: false,
        stable_origin: None,
        root_proxy: None,
        funnel_active: false,
    });
    DoctorReport {
        data_directory_ready,
        status,
        tailscale_checked,
        tailscale_online: tailscale.online,
        serve_ready: tailscale.root_proxy.is_some(),
        funnel_active: tailscale.funnel_active,
        stable_origin: tailscale.stable_origin,
    }
}

fn paths_for(data_dir: Option<PathBuf>) -> Result<RuntimePaths> {
    let config = RuntimeConfig::discover(8790, data_dir)?;
    Ok(RuntimePaths::new(config.data_dir().to_path_buf()))
}

fn init_logging(paths: &RuntimePaths) -> Result<()> {
    let file = paths.open_log()?;
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .compact()
        .with_writer(Mutex::new(file))
        .try_init()
        .map_err(|_| anyhow::anyhow!("Không khởi tạo được nhật ký cục bộ"))
}

async fn wait_for_metadata(paths: &RuntimePaths, duration: Duration) -> Result<RuntimeMetadata> {
    let deadline = Instant::now() + duration;
    while Instant::now() < deadline {
        if let Ok(Some(metadata)) = paths.read_metadata() {
            return Ok(metadata);
        }
        sleep(Duration::from_millis(100)).await;
    }
    bail!("VibePing chưa tạo trạng thái chạy trong thời gian chờ")
}

fn yes_no(value: bool) -> &'static str {
    if value {
        "sẵn sàng"
    } else {
        "chưa sẵn sàng"
    }
}
