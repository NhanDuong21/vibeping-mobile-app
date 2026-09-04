use super::{
    command,
    config::{self, ReadyStatus},
};
use crate::features::lifecycle::{self, DataOptions, HostOptions, LifecycleCommand, RuntimePaths};
use anyhow::Result;
use chrono::Utc;
use std::{
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
    },
    time::Duration,
};
use tokio::{sync::mpsc, time::Instant};

#[derive(Clone, Copy)]
pub(super) enum TrayAction {
    Open,
    Start,
    Stop,
    ToggleAutoStart,
    Disable,
}

pub async fn run(paths: RuntimePaths, logon: bool) -> Result<String> {
    let Ok(_lock) = lifecycle::InstanceLock::acquire(&paths.data_dir().join("companion.lock"))
    else {
        return Ok("Khay VibePing đã chạy".into());
    };
    let settings = config::read(paths.data_dir());
    if !settings.enabled {
        return Ok("Sẵn sàng trên Windows đang tắt".into());
    }
    if logon && settings.auto_start {
        paths.write_intent(true)?;
    }
    let shared = Arc::new(Mutex::new(config::status(paths.data_dir())));
    let stop = Arc::new(AtomicBool::new(false));
    let available = Arc::new(AtomicBool::new(false));
    let (sender, mut receiver) = mpsc::unbounded_channel();
    #[cfg(windows)]
    let tray = super::tray::spawn(sender, shared.clone(), stop.clone(), available.clone());
    #[cfg(not(windows))]
    {
        let _ = sender;
        anyhow::bail!("Chức năng này cần Windows");
    }
    let mut failures = 0;
    let mut next_recovery = Instant::now();
    let mut tick = tokio::time::interval(Duration::from_secs(10));
    loop {
        tokio::select! {
            _ = tick.tick() => {},
            Some(action) = receiver.recv() => {
                    let result = apply_action(&paths, action).await;
                    if result.is_err() { shared.lock().unwrap().state = "attention".into(); }
                    next_recovery = Instant::now();
            }
        }
        let settings = config::read(paths.data_dir());
        if !settings.enabled {
            break;
        }
        let mut status = shared.lock().unwrap().clone();
        status.enabled = true;
        status.auto_start = settings.auto_start;
        status.tray_available = available.load(Ordering::Relaxed);
        if !paths.is_enabled() {
            status.state = "stopped".into();
            failures = 0;
        } else if healthy(&paths).await {
            status.state = "healthy".into();
            failures = 0;
        } else if Instant::now() >= next_recovery {
            status.state = "recovering".into();
            publish(&paths, &shared, &mut status);
            let result = lifecycle::recover(&paths, settings.port).await;
            if !paths.is_enabled() {
                status.state = "stopped".into();
            } else if result.is_ok() && healthy(&paths).await {
                status.state = "healthy".into();
                status.recovery_count = status.recovery_count.saturating_add(1);
                failures = 0;
            } else {
                status.state = "attention".into();
                failures += 1;
            }
            next_recovery = Instant::now() + retry_delay(failures);
        }
        publish(&paths, &shared, &mut status);
    }
    stop.store(true, Ordering::Relaxed);
    #[cfg(windows)]
    let _ = tokio::task::spawn_blocking(move || tray.join()).await;
    Ok("Đã đóng khay VibePing".into())
}

fn publish(paths: &RuntimePaths, shared: &Mutex<ReadyStatus>, status: &mut ReadyStatus) {
    status.checked_at = Some(Utc::now());
    *shared.lock().unwrap() = status.clone();
    let _ = config::save_status(paths.data_dir(), status);
}

async fn healthy(paths: &RuntimePaths) -> bool {
    match paths.read_metadata().ok().flatten() {
        Some(metadata) => lifecycle::health_ready(&metadata.api_address).await,
        None => false,
    }
}

async fn apply_action(paths: &RuntimePaths, action: TrayAction) -> Result<()> {
    let mut settings = config::read(paths.data_dir());
    let data = DataOptions {
        data_dir: Some(paths.data_dir().to_owned()),
    };
    match action {
        TrayAction::Open => {
            lifecycle::execute(LifecycleCommand::Open(data)).await?;
        }
        TrayAction::Start => {
            lifecycle::execute(LifecycleCommand::Start(HostOptions {
                port: settings.port,
                data_dir: data.data_dir,
            }))
            .await?;
        }
        TrayAction::Stop => {
            lifecycle::execute(LifecycleCommand::Stop(data)).await?;
        }
        TrayAction::ToggleAutoStart => {
            command::set_auto_start(paths, settings.port, !settings.auto_start)?;
            settings.auto_start = !settings.auto_start;
            config::write(paths.data_dir(), &settings)?;
        }
        TrayAction::Disable => {
            command::set_auto_start(paths, settings.port, false)?;
            settings.enabled = false;
            settings.auto_start = false;
            config::write(paths.data_dir(), &settings)?;
        }
    }
    Ok(())
}

fn retry_delay(failures: u32) -> Duration {
    Duration::from_secs(match failures {
        0 | 1 => 30,
        2 => 60,
        3 => 120,
        _ => 300,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn recovery_backs_off_and_stays_bounded() {
        assert_eq!(
            [1, 2, 3, 4, 100].map(|n| retry_delay(n).as_secs()),
            [30, 60, 120, 300, 300]
        );
    }
    #[tokio::test]
    async fn explicit_stop_prevents_recovery_from_starting_a_host() {
        let temp = tempfile::tempdir().unwrap();
        let paths = RuntimePaths::new(temp.path().to_owned());
        paths.ensure().unwrap();
        paths.write_intent(false).unwrap();
        lifecycle::recover(&paths, 1).await.unwrap();
        assert!(!paths.is_enabled());
        assert!(paths.read_metadata().unwrap().is_none());
    }
}
