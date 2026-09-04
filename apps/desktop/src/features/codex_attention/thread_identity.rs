use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::classifier::digest;
use crate::features::notifications::safe_label;

/// A verified conversation root. Raw Codex identifiers never enter VibePing storage.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ThreadIdentity {
    pub root_key: String,
    pub title: Option<String>,
}

#[derive(Clone)]
pub(super) struct ThreadMetadata {
    pub id: String,
    pub parent: Option<String>,
    pub title: Option<String>,
}

impl ThreadMetadata {
    pub fn parse(thread: &Value) -> Option<Self> {
        let id = valid_id(thread.get("id")?)?.to_owned();
        // sessionId is also shared by user-created forks. Only explicit agent
        // ancestry proves that two threads belong in the same work detail.
        let parent = thread
            .get("parentThreadId")
            .filter(|value| !value.is_null())
            .or_else(|| thread.pointer("/source/subagent/thread_spawn/parent_thread_id"));
        Some(Self {
            id,
            parent: match parent {
                Some(value) => Some(valid_id(value)?.to_owned()),
                None => None,
            },
            title: thread
                .get("name")
                .and_then(Value::as_str)
                .and_then(safe_label),
        })
    }
}

pub(super) fn resolve(
    id: &str,
    metadata: &HashMap<String, ThreadMetadata>,
) -> Option<ThreadIdentity> {
    let mut next = id;
    let mut visited = HashSet::new();
    for _ in 0..16 {
        if !visited.insert(next) {
            return None;
        }
        let thread = metadata.get(next)?;
        match &thread.parent {
            Some(parent) => next = parent,
            None => {
                return Some(ThreadIdentity {
                    root_key: digest(&thread.id),
                    title: thread.title.clone(),
                });
            }
        }
    }
    None
}

fn valid_id(value: &Value) -> Option<&str> {
    value
        .as_str()
        .filter(|id| !id.trim().is_empty() && id.len() <= 256 && !id.chars().any(char::is_control))
}
