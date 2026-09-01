use std::{env, path::PathBuf, process::Command};

use anyhow::{Context, Result, bail};
use serde_json::Value;

#[derive(Clone, Debug)]
pub struct TailscaleState {
    pub online: bool,
    pub stable_origin: Option<String>,
    pub root_proxy: Option<String>,
    pub funnel_active: bool,
}

pub fn probe() -> Result<TailscaleState> {
    #[cfg(debug_assertions)]
    if env::var_os("VIBEPING_TEST_TAILSCALE_READY").is_some() {
        return Ok(TailscaleState {
            online: true,
            stable_origin: Some("https://test-device.example.ts.net".into()),
            root_proxy: Some("http://127.0.0.1:8787".into()),
            funnel_active: false,
        });
    }

    let executable = resolve_executable()?;
    let status = command_output(&executable, &["status", "--json"])?;
    let serve = command_output(&executable, &["serve", "status", "--json"])?;
    let funnel = command_output(&executable, &["funnel", "status"])?;
    parse_state(&status, &serve, &funnel)
}

pub fn require_private_serve() -> Result<TailscaleState> {
    let state = probe()?;
    if !state.online {
        bail!("Tailscale chưa kết nối")
    }
    if state.root_proxy.is_none() || state.stable_origin.is_none() {
        bail!("Tailscale Serve chưa sẵn sàng")
    }
    if state.funnel_active {
        bail!("Tailscale Funnel đang bật; VibePing sẽ không khởi động")
    }
    Ok(state)
}

fn resolve_executable() -> Result<PathBuf> {
    if let Some(path) = executable_on_path("tailscale.exe") {
        return Ok(path);
    }
    for variable in ["ProgramFiles", "ProgramFiles(x86)"] {
        if let Some(root) = env::var_os(variable) {
            let path = PathBuf::from(root).join("Tailscale").join("tailscale.exe");
            if path.is_file() {
                return Ok(path);
            }
        }
    }
    bail!("Không tìm thấy Tailscale trên máy này")
}

fn executable_on_path(name: &str) -> Option<PathBuf> {
    let path = env::var_os("PATH")?;
    env::split_paths(&path)
        .map(|directory| directory.join(name))
        .find(|candidate| candidate.is_file())
}

fn command_output(executable: &PathBuf, arguments: &[&str]) -> Result<String> {
    let mut command = Command::new(executable);
    command.args(arguments);
    hide_window(&mut command);
    let output = command
        .output()
        .context("Không đọc được trạng thái Tailscale")?;
    if !output.status.success() {
        bail!("Tailscale chưa trả về trạng thái")
    }
    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

#[cfg(windows)]
fn hide_window(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    use windows_sys::Win32::System::Threading::CREATE_NO_WINDOW;

    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn hide_window(_command: &mut Command) {}

fn parse_state(status: &str, serve: &str, funnel: &str) -> Result<TailscaleState> {
    let status: Value =
        serde_json::from_str(status).context("Trạng thái Tailscale không hợp lệ")?;
    let serve: Value = serde_json::from_str(serve).context("Trạng thái Serve không hợp lệ")?;
    let online = status["BackendState"] == "Running" && status["Self"]["Online"] == true;
    let stable_origin = status["Self"]["DNSName"]
        .as_str()
        .filter(|value| !value.is_empty())
        .map(|value| format!("https://{}", value.trim_end_matches('.')));
    let root_proxy = serve["Web"]
        .as_object()
        .and_then(|web| web.values().find_map(root_proxy_from_web));
    let funnel_active =
        funnel.contains("(Funnel on)") || funnel.contains("Available on the internet");
    Ok(TailscaleState {
        online,
        stable_origin,
        root_proxy,
        funnel_active,
    })
}

fn root_proxy_from_web(web: &Value) -> Option<String> {
    web["Handlers"]["/"]["Proxy"].as_str().map(str::to_owned)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn private_serve_is_parsed_without_exposing_the_full_snapshot() {
        let status =
            r#"{"BackendState":"Running","Self":{"Online":true,"DNSName":"pc.example.ts.net."}}"#;
        let serve = r#"{"Web":{"https:443":{"Handlers":{"/":{"Proxy":"http://127.0.0.1:8787"}}}}}"#;
        let state = parse_state(status, serve, "No Funnel configuration").unwrap();
        assert!(state.online);
        assert_eq!(
            state.stable_origin.as_deref(),
            Some("https://pc.example.ts.net")
        );
        assert_eq!(state.root_proxy.as_deref(), Some("http://127.0.0.1:8787"));
        assert!(!state.funnel_active);
    }

    #[test]
    fn funnel_is_detected_fail_closed() {
        let status =
            r#"{"BackendState":"Running","Self":{"Online":true,"DNSName":"pc.example.ts.net."}}"#;
        let serve = r#"{"Web":{}}"#;
        let state = parse_state(status, serve, "Available on the internet (Funnel on)").unwrap();
        assert!(state.funnel_active);
    }
}
