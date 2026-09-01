use std::path::Path;

use anyhow::{Context, Result, bail};
use chrono::Utc;
use serde_json::Value;
use sha2::{Digest, Sha256};

use super::{CodexIngress, CodexSignal};

const MAX_INPUT_BYTES: usize = 64 * 1024;

pub fn normalize(source: &str, bytes: &[u8]) -> Result<Option<CodexIngress>> {
    if bytes.len() > MAX_INPUT_BYTES {
        bail!("Tín hiệu Codex vượt giới hạn an toàn")
    }
    let value: Value = serde_json::from_slice(bytes).context("Tín hiệu Codex không hợp lệ")?;
    let signal = match source {
        "notify" => notify_signal(&value),
        "hook" => hook_signal(&value),
        _ => None,
    };
    let Some(signal) = signal else {
        return Ok(None);
    };
    let session =
        text(&value, &["session_id", "thread-id", "thread_id"]).unwrap_or("unknown-session");
    let turn = text(&value, &["turn_id", "turn-id"]).unwrap_or("unknown-turn");
    let cwd = text(&value, &["cwd"]).unwrap_or("Codex");
    Ok(Some(CodexIngress {
        session_key: digest(session),
        turn_key: digest(&format!("{session}:{turn}")),
        project_name: project_name(cwd),
        signal,
        occurred_at: Utc::now(),
    }))
}

fn notify_signal(value: &Value) -> Option<CodexSignal> {
    (text(value, &["type"]) == Some("agent-turn-complete")).then_some(CodexSignal::Completed)
}

fn hook_signal(value: &Value) -> Option<CodexSignal> {
    match text(value, &["hook_event_name"])? {
        "UserPromptSubmit" => Some(CodexSignal::Started),
        "PermissionRequest" => Some(CodexSignal::PermissionRequired),
        "Stop" => Some(CodexSignal::Stopped),
        "PostToolUse" => classify_tool(value),
        _ => None,
    }
}

fn classify_tool(value: &Value) -> Option<CodexSignal> {
    let tool = text(value, &["tool_name"]).unwrap_or_default();
    if tool == "mcp__codex_app__open_in_codex" && response_succeeded(value) {
        return Some(CodexSignal::PreviewReady);
    }
    let input = value.get("tool_input")?.to_string().to_ascii_lowercase();
    if !is_test_command(tool, &input) {
        return None;
    }
    Some(if response_succeeded(value) {
        CodexSignal::TestPassed
    } else {
        CodexSignal::TestFailed
    })
}

fn is_test_command(tool: &str, input: &str) -> bool {
    matches!(tool, "Bash" | "shell" | "exec_command")
        && [
            "cargo test",
            "pnpm test",
            "npm test",
            "playwright test",
            "vitest",
        ]
        .iter()
        .any(|candidate| input.contains(candidate))
}

fn response_succeeded(value: &Value) -> bool {
    let Some(response) = value.get("tool_response") else {
        return false;
    };
    if response.get("isError").and_then(Value::as_bool) == Some(true) {
        return false;
    }
    if let Some(code) = response.get("exit_code").and_then(Value::as_i64) {
        return code == 0;
    }
    !response.to_string().to_ascii_lowercase().contains("error")
}

fn text<'a>(value: &'a Value, keys: &[&str]) -> Option<&'a str> {
    keys.iter().find_map(|key| value.get(key)?.as_str())
}

fn project_name(cwd: &str) -> String {
    Path::new(cwd)
        .file_name()
        .and_then(|value| value.to_str())
        .filter(|value| !value.is_empty())
        .unwrap_or("Codex")
        .chars()
        .filter(|character| !character.is_control())
        .take(80)
        .collect()
}

fn digest(value: &str) -> String {
    Sha256::digest(value.as_bytes())
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}
