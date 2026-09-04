use std::{
    collections::{HashMap, HashSet},
    time::Duration,
};

use anyhow::{Result, bail};
use serde_json::{Value, json};
use tokio::{
    sync::broadcast,
    time::{sleep, timeout},
};

use super::{
    ActivityStore,
    classifier::digest,
    runtime_executable,
    thread_identity::{self, ThreadMetadata},
};
use crate::infrastructure::codex_app_server::CodexAppServer;

const SOURCES: &[&str] = &[
    "cli",
    "vscode",
    "exec",
    "appServer",
    "subAgent",
    "subAgentReview",
    "subAgentCompact",
    "subAgentThreadSpawn",
    "subAgentOther",
    "unknown",
];

/// Runs only inside the explicitly started host. Startup and bounded retries repair
/// retained history after an upgrade or a best-effort hook metadata timeout.
pub async fn run(store: ActivityStore, activity_events: broadcast::Sender<String>) {
    loop {
        if store.has_unresolved_threads().await.unwrap_or(false) {
            let _ = timeout(Duration::from_secs(45), reconcile(&store, &activity_events)).await;
        }
        sleep(Duration::from_secs(300)).await;
    }
}

async fn reconcile(store: &ActivityStore, events: &broadcast::Sender<String>) -> Result<()> {
    let retained: HashSet<_> = store.retained_thread_keys().await?.into_iter().collect();
    let executable = runtime_executable()?;
    let mut server =
        CodexAppServer::start_experimental(&executable, Duration::from_secs(5)).await?;
    let mut roots = Vec::new();
    for archived in [false, true] {
        roots.extend(list(&mut server, None, archived).await?);
    }
    for root in roots
        .into_iter()
        .filter(|root| retained.contains(&digest(&root.id)))
    {
        if root.parent.is_some() {
            continue;
        }
        let mut metadata = HashMap::from([(root.id.clone(), root.clone())]);
        for archived in [false, true] {
            for child in list(&mut server, Some(&root.id), archived).await? {
                metadata.insert(child.id.clone(), child);
            }
        }
        let identities = metadata
            .keys()
            .filter_map(|id| {
                let key = digest(id);
                retained
                    .contains(&key)
                    .then(|| thread_identity::resolve(id, &metadata).map(|value| (key, value)))
                    .flatten()
            })
            .collect::<Vec<_>>();
        if store.remember_identities(&identities).await? {
            // A reconciliation signal asks connected phones to refetch authoritative
            // membership. It creates neither an activity record nor a push notification.
            let _ = events.send("{}".into());
        }
    }
    Ok(())
}

async fn list(
    server: &mut CodexAppServer,
    ancestor: Option<&str>,
    archived: bool,
) -> Result<Vec<ThreadMetadata>> {
    let mut cursor: Option<String> = None;
    let mut threads = Vec::new();
    for _ in 0..10 {
        let mut params = json!({"limit": 100, "cursor": cursor, "archived": archived,
            "sourceKinds": SOURCES, "useStateDbOnly": true});
        if let Some(id) = ancestor {
            params["ancestorThreadId"] = json!(id);
        }
        let response = server.request("thread/list", Some(params)).await?;
        let Some(data) = response.get("data").and_then(Value::as_array) else {
            bail!("CODEX_THREAD_METADATA_UNAVAILABLE");
        };
        threads.extend(data.iter().filter_map(ThreadMetadata::parse));
        cursor = response
            .get("nextCursor")
            .and_then(Value::as_str)
            .map(str::to_owned);
        if cursor.is_none() {
            return Ok(threads);
        }
    }
    // Do not treat an incomplete ancestor list as proof that an unknown parent is a root.
    Ok(threads)
}
