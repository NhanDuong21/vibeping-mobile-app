use serde::{Deserialize, Serialize};
use serde_json::Value;
use utoipa::ToSchema;

use crate::features::notifications::safe_summary;

const MAX_RESULT_CHARACTERS: usize = 8_000;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CodexResult {
    pub text: String,
    pub truncated: bool,
}

impl CodexResult {
    pub fn from_text(value: &str) -> Option<Self> {
        let cleaned: String = value
            .chars()
            .filter(|c| {
                (!c.is_control() || matches!(c, '\n' | '\t'))
                    && !matches!(c, '\u{200b}'..='\u{200f}' | '\u{202a}'..='\u{202e}' | '\u{2060}'..='\u{206f}')
            })
            .take(MAX_RESULT_CHARACTERS + 1)
            .collect();
        let truncated = cleaned.chars().count() > MAX_RESULT_CHARACTERS;
        let text: String = cleaned.chars().take(MAX_RESULT_CHARACTERS).collect();
        let text = text.trim().to_owned();
        (!text.is_empty()).then_some(Self { text, truncated })
    }

    pub fn bounded(&self) -> Option<Self> {
        let mut result = Self::from_text(&self.text)?;
        result.truncated |= self.truncated;
        Some(result)
    }

    pub fn excerpt(&self) -> Option<String> {
        self.text
            .lines()
            .find_map(|line| {
                let plain = line.trim().trim_start_matches(['-', '*', '#', '>']).trim();
                let plain = plain.replace(['*', '`'], "");
                safe_summary(&plain)
            })
            .or_else(|| Some("Mở chi tiết để đọc câu trả lời của Codex".into()))
    }
}

pub(super) fn from_notify(value: &Value) -> Option<CodexResult> {
    CodexResult::from_text(value.get("last-assistant-message")?.as_str()?)
}

pub(super) fn from_thread(value: &Value, turn_id: &str) -> Option<CodexResult> {
    let turn = value
        .get("thread")?
        .get("turns")?
        .as_array()?
        .iter()
        .find(|turn| {
            turn.get("id").and_then(Value::as_str) == Some(turn_id)
                && turn.get("status").and_then(Value::as_str) == Some("completed")
        })?;
    let messages = turn.get("items")?.as_array()?;
    // Never use progress narration, reasoning, command output, or another turn's answer.
    let message = messages
        .iter()
        .rev()
        .find(|item| {
            item.get("type").and_then(Value::as_str) == Some("agentMessage")
                && item.get("phase").and_then(Value::as_str) == Some("final_answer")
        })
        .or_else(|| {
            messages.iter().rev().find(|item| {
                item.get("type").and_then(Value::as_str) == Some("agentMessage")
                    && item.get("phase").is_none_or(Value::is_null)
            })
        })?;
    CodexResult::from_text(message.get("text")?.as_str()?)
}
