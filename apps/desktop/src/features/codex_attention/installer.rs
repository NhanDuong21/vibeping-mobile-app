use std::{
    env, fs,
    path::{Path, PathBuf},
    process::{Command, Stdio},
};

use anyhow::{Context, Result, bail};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use toml_edit::value;

use crate::{RuntimeConfig, features::lifecycle::RuntimePaths};

use super::configuration::{
    OWNER_MARKER, backup_if_present, codex_home, merge_hooks, notify_command, read_json,
    read_string_array, read_toml, remove_owned_hooks, replace_file, string_array,
};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallState {
    pub codex_path: PathBuf,
    pub codex_version: String,
    pub executable_source: String,
    pub previous_notify: Option<Vec<String>>,
    pub owned_notify: Vec<String>,
    pub installed_at: String,
}

pub fn install(codex_override: Option<PathBuf>, repair: bool) -> Result<String> {
    let paths = local_paths()?;
    paths.ensure()?;
    let codex = resolve_codex(codex_override)?;
    let executable = env::current_exe().context("Không tìm thấy tệp chạy VibePing")?;
    let config_dir = codex_home()?;
    fs::create_dir_all(&config_dir).context("Không mở được cấu hình Codex")?;
    let config_path = config_dir.join("config.toml");
    let hooks_path = config_dir.join("hooks.json");
    let mut config = read_toml(&config_path)?;
    let owned_notify = notify_command(&executable);
    let existing = read_string_array(config.get("notify"));
    let previous_notify = if existing.as_deref() == Some(&owned_notify) {
        read_state(&paths)?.and_then(|state| state.previous_notify)
    } else {
        existing
    };
    config["notify"] = value(string_array(&owned_notify));
    let hooks = merge_hooks(read_json(&hooks_path)?, &executable);
    backup_if_present(&paths, &config_path)?;
    backup_if_present(&paths, &hooks_path)?;
    replace_file(&config_path, config.to_string().as_bytes())?;
    replace_file(&hooks_path, &serde_json::to_vec_pretty(&hooks)?)?;
    let state = InstallState {
        codex_path: codex.path,
        codex_version: codex.version,
        executable_source: codex.source,
        previous_notify,
        owned_notify,
        installed_at: Utc::now().to_rfc3339(),
    };
    replace_file(
        &integration_file(&paths),
        &serde_json::to_vec_pretty(&state)?,
    )?;
    let action = if repair { "Đã sửa" } else { "Đã cài" };
    Ok(format!(
        "{action} tích hợp Codex ({})\nMở Codex, chạy /hooks và xác nhận các hook VibePing.",
        state.codex_version
    ))
}

pub fn status() -> Result<String> {
    let paths = local_paths()?;
    let Some(state) = read_state(&paths)? else {
        return Ok("Tích hợp Codex chưa được cài".into());
    };
    let config = read_toml(&codex_home()?.join("config.toml"))?;
    let notify_ready = read_string_array(config.get("notify")) == Some(state.owned_notify);
    let hooks = read_json(&codex_home()?.join("hooks.json"))?;
    let hooks_ready = hooks.to_string().contains(OWNER_MARKER);
    Ok(format!(
        "Codex: {}\nNguồn: {}\nNotify: {}\nHooks: {}\nTin cậy hook: cần kiểm tra bằng /hooks",
        state.codex_version,
        state.executable_source,
        ready(notify_ready),
        ready(hooks_ready),
    ))
}

pub fn remove() -> Result<String> {
    let paths = local_paths()?;
    let Some(state) = read_state(&paths)? else {
        return Ok("Tích hợp Codex đã được gỡ".into());
    };
    let config_path = codex_home()?.join("config.toml");
    let hooks_path = codex_home()?.join("hooks.json");
    let mut config = read_toml(&config_path)?;
    if read_string_array(config.get("notify")) == Some(state.owned_notify) {
        match state.previous_notify {
            Some(previous) => config["notify"] = value(string_array(&previous)),
            None => {
                config.remove("notify");
            }
        }
    }
    let hooks = remove_owned_hooks(read_json(&hooks_path)?);
    backup_if_present(&paths, &config_path)?;
    backup_if_present(&paths, &hooks_path)?;
    replace_file(&config_path, config.to_string().as_bytes())?;
    replace_file(&hooks_path, &serde_json::to_vec_pretty(&hooks)?)?;
    fs::remove_file(integration_file(&paths)).context("Không dọn được trạng thái tích hợp")?;
    Ok("Đã gỡ tích hợp Codex; cấu hình trước đó đã được giữ lại".into())
}

pub fn forward_previous(payload: &str) -> Result<()> {
    let paths = local_paths()?;
    let Some(state) = read_state(&paths)? else {
        return Ok(());
    };
    let Some(command) = state.previous_notify else {
        return Ok(());
    };
    if command.is_empty() || command == state.owned_notify {
        return Ok(());
    }
    let mut child = Command::new(&command[0]);
    child
        .args(&command[1..])
        .arg(payload)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    hide_window(&mut child);
    child
        .spawn()
        .context("Không chuyển tiếp được notify Codex")?;
    Ok(())
}

struct CodexExecutable {
    path: PathBuf,
    version: String,
    source: String,
}

fn resolve_codex(override_path: Option<PathBuf>) -> Result<CodexExecutable> {
    let candidates = match override_path {
        Some(path) => vec![(path, "chỉ định".to_string())],
        None => where_candidates()?,
    };
    select_codex(candidates, probe)
}

fn select_codex(
    candidates: Vec<(PathBuf, String)>,
    probe_command: impl Fn(&Path, &[&str]) -> Result<String>,
) -> Result<CodexExecutable> {
    for (path, source) in candidates {
        let Ok(version) = probe_command(&path, &["--version"]) else {
            continue;
        };
        if probe_command(&path, &["app-server", "--help"]).is_ok() {
            return Ok(CodexExecutable {
                path,
                version: version.trim().chars().take(80).collect(),
                source,
            });
        }
    }
    bail!("Không tìm thấy Codex có app-server tương thích")
}

fn where_candidates() -> Result<Vec<(PathBuf, String)>> {
    let output = Command::new("where.exe")
        .arg("codex")
        .output()
        .context("Không tìm được lệnh Codex")?;
    Ok(String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| (PathBuf::from(value), "PATH".into()))
        .collect())
}

fn probe(path: &Path, arguments: &[&str]) -> Result<String> {
    let output = Command::new(path)
        .args(arguments)
        .output()
        .context("Không chạy được Codex")?;
    if !output.status.success() {
        bail!("Codex chưa hỗ trợ thao tác cần thiết")
    }
    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

fn local_paths() -> Result<RuntimePaths> {
    let config = RuntimeConfig::discover(8790, None)?;
    Ok(RuntimePaths::new(config.data_dir().to_path_buf()))
}

fn integration_file(paths: &RuntimePaths) -> PathBuf {
    paths.data_dir().join("codex-integration.json")
}

fn read_state(paths: &RuntimePaths) -> Result<Option<InstallState>> {
    let path = integration_file(paths);
    if !path.is_file() {
        return Ok(None);
    }
    serde_json::from_slice(&fs::read(path)?)
        .map(Some)
        .context("Trạng thái tích hợp Codex không hợp lệ")
}

fn ready(value: bool) -> &'static str {
    if value { "sẵn sàng" } else { "cần sửa" }
}

#[cfg(windows)]
fn hide_window(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    use windows_sys::Win32::System::Threading::CREATE_NO_WINDOW;
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn hide_window(_command: &mut Command) {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn selection_skips_broken_and_incompatible_executables() {
        let candidates = vec![
            (PathBuf::from("broken"), "PATH".into()),
            (PathBuf::from("old"), "PATH".into()),
            (PathBuf::from("ready"), "chỉ định".into()),
        ];
        let selected = select_codex(candidates, |path, arguments| {
            let name = path.to_string_lossy();
            if name == "broken" || (name == "old" && arguments[0] == "app-server") {
                bail!("unavailable")
            }
            Ok(if arguments[0] == "--version" {
                "codex-cli 9.9.9".into()
            } else {
                "help".into()
            })
        })
        .unwrap();
        assert_eq!(selected.path, PathBuf::from("ready"));
        assert_eq!(selected.version, "codex-cli 9.9.9");
        assert_eq!(selected.source, "chỉ định");
        assert!(select_codex(Vec::new(), |_, _| Ok(String::new())).is_err());
    }
}
