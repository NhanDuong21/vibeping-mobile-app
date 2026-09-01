use std::time::Duration;

use anyhow::Result;
use tokio::{
    sync::{broadcast, mpsc, oneshot},
    time::{interval, sleep},
};

use crate::features::{
    codex_attention::{ActivityEvent, runtime_executable},
    usage_limits::{app_server::AppServerSession, normalize::normalize_response},
};

use super::{UsageLimitStore, model::UsageLimitsSnapshot};

const POLL_INTERVAL: Duration = Duration::from_secs(10 * 60);
const RESTART_DELAYS: [u64; 4] = [1, 5, 20, 60];

pub struct RefreshRequest {
    completion: Option<oneshot::Sender<bool>>,
}

impl RefreshRequest {
    pub fn background() -> Self {
        Self { completion: None }
    }

    pub fn interactive() -> (Self, oneshot::Receiver<bool>) {
        let (sender, receiver) = oneshot::channel();
        (
            Self {
                completion: Some(sender),
            },
            receiver,
        )
    }
}

pub async fn run(
    store: UsageLimitStore,
    mut refresh: mpsc::Receiver<RefreshRequest>,
    usage_events: broadcast::Sender<String>,
    activity_events: broadcast::Sender<String>,
) {
    let executable = runtime_executable();
    let Ok(executable) = executable else {
        let _ = store.mark_failure("CODEX_NOT_AVAILABLE").await;
        return;
    };
    let mut failures = 0_usize;
    loop {
        match AppServerSession::start(&executable).await {
            Ok(session) => {
                failures = 0;
                if run_session(
                    session,
                    &store,
                    &mut refresh,
                    &usage_events,
                    &activity_events,
                )
                .await
                .is_err()
                {
                    let _ = store.mark_failure("CODEX_ALLOWANCE_UNAVAILABLE").await;
                    publish_snapshot(&store, &usage_events).await;
                }
            }
            Err(_) => {
                let _ = store.mark_failure("CODEX_ACCOUNT_UNAVAILABLE").await;
                publish_snapshot(&store, &usage_events).await;
            }
        }
        let delay = restart_delay(failures);
        failures = failures.saturating_add(1);
        sleep(Duration::from_secs(delay)).await;
    }
}

fn restart_delay(failures: usize) -> u64 {
    RESTART_DELAYS[failures.min(RESTART_DELAYS.len() - 1)]
}

async fn run_session(
    mut session: AppServerSession,
    store: &UsageLimitStore,
    refresh: &mut mpsc::Receiver<RefreshRequest>,
    usage_events: &broadcast::Sender<String>,
    activity_events: &broadcast::Sender<String>,
) -> Result<()> {
    refresh_once(&mut session, store, usage_events, activity_events).await?;
    let mut polling = interval(POLL_INTERVAL);
    polling.tick().await;
    loop {
        tokio::select! {
            notification = session.next_notification() => {
                if notification? {
                    refresh_once(&mut session, store, usage_events, activity_events).await?;
                }
            },
            request = refresh.recv() => {
                let Some(request) = request else { return Ok(()); };
                let mut completions = Vec::new();
                if let Some(completion) = request.completion { completions.push(completion); }
                while let Ok(request) = refresh.try_recv() {
                    if let Some(completion) = request.completion { completions.push(completion); }
                }
                let succeeded = refresh_once(
                    &mut session, store, usage_events, activity_events,
                ).await.is_ok();
                for completion in completions { let _ = completion.send(succeeded); }
                if !succeeded { anyhow::bail!("CODEX_ALLOWANCE_REFRESH_FAILED"); }
            },
            _ = polling.tick() => {
                refresh_once(&mut session, store, usage_events, activity_events).await?;
            }
        }
    }
}

async fn refresh_once(
    session: &mut AppServerSession,
    store: &UsageLimitStore,
    usage_events: &broadcast::Sender<String>,
    activity_events: &broadcast::Sender<String>,
) -> Result<()> {
    let limits = normalize_response(session.read_limits().await?)?;
    let outcome = store.save(&limits).await?;
    publish_usage(&outcome.snapshot, usage_events);
    for event in outcome.activities {
        publish_activity(&event, activity_events);
    }
    Ok(())
}

async fn publish_snapshot(store: &UsageLimitStore, events: &broadcast::Sender<String>) {
    if let Ok(snapshot) = store.snapshot().await {
        publish_usage(&snapshot, events);
    }
}

fn publish_usage(snapshot: &UsageLimitsSnapshot, events: &broadcast::Sender<String>) {
    if let Ok(json) = serde_json::to_string(snapshot) {
        let _ = events.send(json);
    }
}

fn publish_activity(event: &ActivityEvent, events: &broadcast::Sender<String>) {
    if let Ok(json) = serde_json::to_string(event) {
        let _ = events.send(json);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn child_restart_backoff_is_bounded() {
        assert_eq!(
            (0..6).map(restart_delay).collect::<Vec<_>>(),
            [1, 5, 20, 60, 60, 60]
        );
    }

    #[tokio::test]
    async fn concurrent_refresh_requests_fit_one_serialized_batch() {
        let (sender, mut receiver) = mpsc::channel(8);
        let mut completions = Vec::new();
        for _ in 0..3 {
            let (request, completion) = RefreshRequest::interactive();
            sender.send(request).await.unwrap();
            completions.push(completion);
        }
        let first = receiver.recv().await.unwrap();
        let mut batch = usize::from(first.completion.is_some());
        while let Ok(request) = receiver.try_recv() {
            batch += usize::from(request.completion.is_some());
        }
        assert_eq!(batch, 3);
        assert_eq!(completions.len(), 3);
    }
}
