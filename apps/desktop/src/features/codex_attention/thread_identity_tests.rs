use std::collections::HashMap;

use chrono::{Duration, Utc};
use serde_json::json;

use super::{
    ActivityStore, CodexIngress, CodexResult, CodexSignal, ThreadIdentity,
    classifier::digest,
    thread_identity::{ThreadMetadata, resolve},
};
use crate::infrastructure::database;

#[test]
fn explicit_nested_ancestry_groups_agents_but_not_user_forks_or_same_project() {
    let records = [
        json!({"id":"root","name":"Công việc chính","sessionId":"shared","cwd":"same"}),
        json!({"id":"child","parentThreadId":"root","sessionId":"child"}),
        json!({"id":"nested","source":{"subagent":{"thread_spawn":{"parent_thread_id":"child"}}}}),
        json!({"id":"fork","forkedFromId":"root","sessionId":"shared","cwd":"same"}),
    ];
    let metadata: HashMap<_, _> = records
        .iter()
        .filter_map(ThreadMetadata::parse)
        .map(|t| (t.id.clone(), t))
        .collect();
    let nested = resolve("nested", &metadata).unwrap();
    assert_eq!(nested.root_key, digest("root"));
    assert_eq!(nested.title.as_deref(), Some("Công việc chính"));
    assert_eq!(resolve("fork", &metadata).unwrap().root_key, digest("fork"));
    let safe = serde_json::to_string(&nested).unwrap();
    assert!(!safe.contains("shared"));
    assert!(!safe.contains("cwd"));
}

#[test]
fn unknown_invalid_cyclic_and_too_deep_ancestry_is_never_guessed() {
    for value in [
        json!({"id":"child","parentThreadId":""}),
        json!({"id":"child","parentThreadId":"bad\nidentity"}),
        json!({"id":""}),
    ] {
        assert!(ThreadMetadata::parse(&value).is_none());
    }
    let mut metadata = HashMap::new();
    for (id, parent) in [("a", "b"), ("b", "a"), ("missing", "unknown")] {
        let t = ThreadMetadata::parse(&json!({"id":id,"parentThreadId":parent})).unwrap();
        metadata.insert(id.to_owned(), t);
    }
    assert!(resolve("a", &metadata).is_none());
    assert!(resolve("missing", &metadata).is_none());
    for n in 0..17 {
        let id = n.to_string();
        let t =
            ThreadMetadata::parse(&json!({"id":id,"parentThreadId":(n+1).to_string()})).unwrap();
        metadata.insert(id, t);
    }
    assert!(resolve("0", &metadata).is_none());
}

fn signal(thread: &str, turn: &str, minute: i64, kind: CodexSignal) -> CodexIngress {
    CodexIngress {
        session_key: digest(thread),
        turn_key: digest(&format!("{thread}:{turn}")),
        project_name: "same-project".into(),
        task_label: None,
        thread_identity: None,
        result: (kind == CodexSignal::Completed).then(|| CodexResult {
            text: format!("Kết quả nguyên bản {thread}\n\n- Đã kiểm tra."),
            truncated: false,
        }),
        signal: kind,
        occurred_at: Utc::now() - Duration::minutes(30) + Duration::minutes(minute),
    }
}

#[tokio::test]
async fn backfill_retains_all_results_targets_and_pages_while_root_stays_primary() {
    let temp = tempfile::tempdir().unwrap();
    let path = temp.path().join("identity.sqlite3");
    let pool = database::connect(&path).await.unwrap();
    let store = ActivityStore::new(pool.clone());
    let main = signal("root", "same-turn", 0, CodexSignal::Started);
    store.ingest(&main).await.unwrap();
    let root_id = store.list_threads(None, 20).await.unwrap().events[0]
        .id
        .clone();
    let mut saved = Vec::new();
    for n in 1..=12 {
        let value = signal(
            &format!("child-{n}"),
            "same-turn",
            n,
            CodexSignal::Completed,
        );
        let event = store.ingest(&value).await.unwrap().unwrap();
        let detail = store.session_detail(&event.id).await.unwrap().unwrap();
        saved.push((event.id, detail));
    }
    store
        .ingest(&signal("separate", "same-turn", 15, CodexSignal::Completed))
        .await
        .unwrap();
    assert_eq!(store.list_threads(None, 20).await.unwrap().events.len(), 14);
    let identity = ThreadIdentity {
        root_key: digest("root"),
        title: Some("Công việc chính".into()),
    };
    let identities = (1..=12)
        .map(|n| (digest(&format!("child-{n}")), identity.clone()))
        .collect::<Vec<_>>();
    assert!(store.remember_identities(&identities).await.unwrap());
    assert!(!store.remember_identities(&identities).await.unwrap());
    let feed = store.list_threads(None, 20).await.unwrap();
    assert_eq!(feed.events.len(), 2);
    let work = feed.events.iter().find(|e| e.id == root_id).unwrap();
    let context = work.session.as_ref().unwrap().thread.as_ref().unwrap();
    assert_eq!(context.turn_count, 13);
    assert_eq!(context.latest_turn_id, root_id);
    assert_eq!(context.title.as_deref(), Some("Công việc chính"));
    assert_eq!(work.session.as_ref().unwrap().state, "unconfirmed");

    let mut page = store
        .list_thread_turns(&digest("child-1"), None, 5)
        .await
        .unwrap();
    assert_eq!(page.events[0].id, root_id);
    let mut ids = Vec::new();
    loop {
        ids.extend(page.events.iter().map(|e| e.id.clone()));
        let Some(cursor) = page.next_cursor else {
            break;
        };
        page = store
            .list_thread_turns(&digest("root"), Some(&cursor), 5)
            .await
            .unwrap();
    }
    assert_eq!(ids.len(), 13);
    assert_eq!(
        ids.iter().collect::<std::collections::HashSet<_>>().len(),
        13
    );
    let first = store
        .list_thread_turns(&digest("root"), None, 1)
        .await
        .unwrap();
    let rest = store
        .list_thread_turns(&digest("root"), first.next_cursor.as_deref(), 20)
        .await
        .unwrap();
    assert_eq!(rest.events.len(), 12);
    assert!(rest.events.iter().all(|event| event.id != root_id));
    for (notification_id, before) in saved {
        let after = store
            .session_detail(&notification_id)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(after.event.id, before.event.id);
        assert_eq!(after.result.unwrap().text, before.result.unwrap().text);
        assert_eq!(
            serde_json::to_value(after.timeline).unwrap(),
            serde_json::to_value(before.timeline).unwrap()
        );
        assert_eq!(
            after.event.session.unwrap().thread.unwrap().id,
            digest("root")
        );
    }
    // Late child hooks cannot take over the foreground or split the verified work.
    store
        .ingest(&signal("child-1", "next", 16, CodexSignal::Started))
        .await
        .unwrap();
    assert_eq!(
        store.current_work().await.unwrap().unwrap().session_id,
        Some(root_id.clone())
    );
    assert!(
        !store
            .remember_identities(&[(
                digest("child-1"),
                ThreadIdentity {
                    root_key: digest("child-1"),
                    title: None,
                }
            )])
            .await
            .unwrap()
    );
    let raw_keys: i64 = sqlx::query_scalar("SELECT COUNT(DISTINCT session_key) FROM codex_turns")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(raw_keys, 14);
    pool.close().await;
    let reopened = ActivityStore::new(database::connect(&path).await.unwrap());
    assert_eq!(
        reopened.list_threads(None, 20).await.unwrap().events.len(),
        2
    );
}

#[tokio::test]
async fn new_hook_identity_links_preexisting_and_future_turns_without_rekeying_them() {
    let temp = tempfile::tempdir().unwrap();
    let store = ActivityStore::new(
        database::connect(&temp.path().join("hooks.sqlite3"))
            .await
            .unwrap(),
    );
    store
        .ingest(&signal("child", "one", 1, CodexSignal::Completed))
        .await
        .unwrap();
    let mut next = signal("child", "two", 2, CodexSignal::Completed);
    next.thread_identity = Some(ThreadIdentity {
        root_key: digest("root"),
        title: None,
    });
    store.ingest(&next).await.unwrap();
    store
        .ingest(&signal("child", "three", 3, CodexSignal::Completed))
        .await
        .unwrap();
    let page = store
        .list_thread_turns(&digest("root"), None, 10)
        .await
        .unwrap();
    assert_eq!(page.events.len(), 3);
    assert!(
        page.events
            .iter()
            .all(|e| e.session.as_ref().unwrap().thread.as_ref().unwrap().id == digest("root"))
    );
}
