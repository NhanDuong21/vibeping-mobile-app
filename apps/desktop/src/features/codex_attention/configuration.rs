use std::{
    env, fs,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};
use chrono::Utc;
use serde_json::{Value, json};
use toml_edit::{Array, DocumentMut, Item};

use crate::features::lifecycle::RuntimePaths;

pub const OWNER_MARKER: &str = "vibeping-hook-v1";

pub fn codex_home() -> Result<PathBuf> {
    if let Some(path) = env::var_os("CODEX_HOME") {
        return Ok(PathBuf::from(path));
    }
    let profile = env::var_os("USERPROFILE").context("Không tìm thấy thư mục người dùng")?;
    Ok(PathBuf::from(profile).join(".codex"))
}

pub fn merge_hooks(mut root: Value, executable: &Path) -> Value {
    if !root.is_object() {
        root = json!({});
    }
    let hooks = root
        .as_object_mut()
        .expect("object")
        .entry("hooks")
        .or_insert_with(|| json!({}));
    if !hooks.is_object() {
        *hooks = json!({});
    }
    let hooks = hooks.as_object_mut().expect("object");
    let command = hook_command(executable);
    for event in [
        "UserPromptSubmit",
        "PermissionRequest",
        "PostToolUse",
        "Stop",
    ] {
        let entries = hooks.entry(event).or_insert_with(|| json!([]));
        if !entries.is_array() {
            *entries = json!([]);
        }
        let entries = entries.as_array_mut().expect("array");
        entries.retain(|entry| !entry.to_string().contains(OWNER_MARKER));
        let hook = json!({"type": "command", "command": command, "timeout": 5});
        entries.push(json!({"hooks": [hook]}));
    }
    root
}

pub fn remove_owned_hooks(mut root: Value) -> Value {
    if let Some(hooks) = root.get_mut("hooks").and_then(Value::as_object_mut) {
        for entries in hooks.values_mut().filter_map(Value::as_array_mut) {
            entries.retain(|entry| !entry.to_string().contains(OWNER_MARKER));
        }
    }
    root
}

pub fn notify_command(executable: &Path) -> Vec<String> {
    vec![
        executable.to_string_lossy().into_owned(),
        "integrations".into(),
        "codex".into(),
        "ingest-notify".into(),
    ]
}

fn hook_command(executable: &Path) -> String {
    let executable = executable.to_string_lossy().replace('"', "");
    let executable = if executable.chars().any(needs_shell_quotes) {
        format!("\"{executable}\"")
    } else {
        executable
    };
    format!("{executable} integrations codex ingest-hook --source {OWNER_MARKER}")
}

fn needs_shell_quotes(character: char) -> bool {
    character.is_whitespace()
        || matches!(
            character,
            '&' | '<'
                | '>'
                | '['
                | ']'
                | '|'
                | '{'
                | '}'
                | '^'
                | '='
                | ';'
                | '!'
                | '\''
                | '+'
                | ','
                | '`'
                | '~'
                | '%'
                | '('
                | ')'
        )
}

pub fn read_string_array(item: Option<&Item>) -> Option<Vec<String>> {
    item?
        .as_array()?
        .iter()
        .map(|value| value.as_str().map(str::to_string))
        .collect::<Option<Vec<_>>>()
}

pub fn string_array(values: &[String]) -> Array {
    values.iter().map(String::as_str).collect()
}

pub fn read_toml(path: &Path) -> Result<DocumentMut> {
    if !path.is_file() {
        return Ok(DocumentMut::new());
    }
    fs::read_to_string(path)?
        .parse()
        .context("Cấu hình Codex không hợp lệ")
}

pub fn read_json(path: &Path) -> Result<Value> {
    if !path.is_file() {
        return Ok(json!({}));
    }
    serde_json::from_slice(&fs::read(path)?).context("Hooks Codex không hợp lệ")
}

pub fn backup_if_present(paths: &RuntimePaths, source: &Path) -> Result<()> {
    if !source.is_file() {
        return Ok(());
    }
    let directory = paths.data_dir().join("backups").join("codex");
    fs::create_dir_all(&directory).context("Không tạo được thư mục sao lưu")?;
    let name = source
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("config");
    let stamp = Utc::now().format("%Y%m%d-%H%M%S-%f");
    fs::copy(source, directory.join(format!("{stamp}-{name}.bak")))
        .context("Không sao lưu được cấu hình Codex")?;
    Ok(())
}

pub fn replace_file(path: &Path, bytes: &[u8]) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let temporary = path.with_extension("vibeping-new");
    fs::write(&temporary, bytes).context("Không chuẩn bị được cấu hình mới")?;
    if !path.is_file() {
        return fs::rename(temporary, path).context("Không lưu được cấu hình Codex");
    }
    let old = path.with_extension("vibeping-old");
    if old.is_file() {
        fs::remove_file(&old)?;
    }
    fs::rename(path, &old).context("Không giữ được cấu hình cũ")?;
    if let Err(error) = fs::rename(&temporary, path) {
        let _ = fs::rename(&old, path);
        return Err(error).context("Không thay được cấu hình Codex");
    }
    fs::remove_file(old).context("Không dọn được tệp thay thế")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hook_merge_is_idempotent_and_preserves_other_integrations() {
        let existing = json!({
            "description": "Impeccable and local hooks",
            "hooks": {"Stop": [{"hooks": [{"type": "command", "command": "impeccable"}]}]}
        });
        let once = merge_hooks(existing, Path::new("C:\\VibePing\\vibeping.exe"));
        let twice = merge_hooks(once.clone(), Path::new("C:\\VibePing\\vibeping.exe"));
        assert_eq!(once, twice);
        assert!(twice.to_string().contains("impeccable"));
        let removed = remove_owned_hooks(twice);
        assert!(removed.to_string().contains("impeccable"));
        assert!(!removed.to_string().contains(OWNER_MARKER));
    }

    #[test]
    fn repair_reinstates_missing_owned_hooks_without_duplicating_other_hooks() {
        let executable = Path::new("C:\\VibePing\\vibeping.exe");
        let original = json!({
            "hooks": {
                "Stop": [{"hooks": [{"type": "command", "command": "keep-me"}]}],
                "PermissionRequest": []
            }
        });
        let repaired = merge_hooks(original, executable);
        let repaired_again = merge_hooks(repaired.clone(), executable);
        assert_eq!(repaired, repaired_again);
        assert_eq!(repaired.to_string().matches("keep-me").count(), 1);
        assert_eq!(repaired.to_string().matches(OWNER_MARKER).count(), 4);
        assert!(repaired["hooks"]["PostToolUse"][0].get("matcher").is_none());
    }

    #[test]
    fn hook_command_avoids_unneeded_leading_quote_for_older_codex_on_windows() {
        let command = hook_command(Path::new("C:\\VibePing\\vibeping.exe"));
        assert_eq!(
            command,
            "C:\\VibePing\\vibeping.exe integrations codex ingest-hook --source vibeping-hook-v1"
        );
    }

    #[test]
    fn hook_command_quotes_paths_with_shell_sensitive_characters() {
        let command = hook_command(Path::new("C:\\Vibe Ping\\vibeping.exe"));
        assert_eq!(
            command,
            "\"C:\\Vibe Ping\\vibeping.exe\" integrations codex ingest-hook --source vibeping-hook-v1"
        );
    }
}
