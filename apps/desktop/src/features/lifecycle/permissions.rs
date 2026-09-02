use std::path::Path;

use anyhow::Result;

pub fn secure(path: &Path) -> Result<()> {
    #[cfg(windows)]
    secure_windows(path)?;
    #[cfg(not(windows))]
    let _ = path;
    Ok(())
}

#[cfg(windows)]
fn secure_windows(path: &Path) -> Result<()> {
    use std::{env, fs, process::Command};

    use anyhow::{Context, bail};

    let marker = path.join(".protection-v2");
    if marker.is_file() {
        return Ok(());
    }
    let resolved = fs::canonicalize(path).context("Không xác minh được thư mục dữ liệu")?;
    let profile = env::var_os("USERPROFILE").map(std::path::PathBuf::from);
    let current = env::current_dir().ok();
    if resolved.parent().is_none()
        || profile.as_deref() == Some(resolved.as_path())
        || current.as_deref() == Some(resolved.as_path())
    {
        bail!("Thư mục dữ liệu quá rộng để bảo vệ an toàn")
    }
    let sid = current_user_sid()?;
    let mut command = Command::new("icacls.exe");
    command
        .arg(&resolved)
        .args(["/inheritance:r", "/grant:r"])
        .arg(format!("*{sid}:F"))
        .arg(format!("*{sid}:(OI)(CI)F"))
        .arg("*S-1-5-18:F")
        .arg("*S-1-5-18:(OI)(CI)F")
        .args(["/T", "/C", "/Q"]);
    hide_window(&mut command);
    let result = command
        .output()
        .context("Không áp dụng được bảo vệ dữ liệu Windows")?;
    if !result.status.success() {
        bail!("Không bảo vệ được thư mục dữ liệu Windows")
    }
    fs::write(marker, b"restricted-current-user-and-system")
        .context("Không ghi được trạng thái bảo vệ dữ liệu")
}

#[cfg(windows)]
fn current_user_sid() -> Result<String> {
    use std::process::Command;

    use anyhow::{Context, bail};

    let mut command = Command::new("whoami.exe");
    command.args(["/user", "/fo", "csv", "/nh"]);
    hide_window(&mut command);
    let output = command
        .output()
        .context("Không đọc được người dùng Windows hiện tại")?;
    if !output.status.success() {
        bail!("Không xác minh được người dùng Windows hiện tại")
    }
    String::from_utf8_lossy(&output.stdout)
        .split(',')
        .nth(1)
        .map(|value| value.trim().trim_matches('"').to_owned())
        .filter(|value| value.starts_with("S-1-5-"))
        .context("Không đọc được mã người dùng Windows")
}

#[cfg(windows)]
fn hide_window(command: &mut std::process::Command) {
    use std::os::windows::process::CommandExt;
    use windows_sys::Win32::System::Threading::CREATE_NO_WINDOW;

    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(all(test, windows))]
mod tests {
    use tempfile::tempdir;

    use super::*;

    #[test]
    fn data_directory_is_restricted_to_current_user_and_system() {
        let temp = tempdir().unwrap();
        let path = temp.path().join("protected");
        let nested = path.join("nested");
        std::fs::create_dir_all(&nested).unwrap();
        let existing = nested.join("existing.txt");
        std::fs::write(&existing, b"private").unwrap();
        secure(&path).unwrap();
        assert!(path.join(".protection-v2").is_file());
        assert_eq!(std::fs::read(&existing).unwrap(), b"private");
        let sid = current_user_sid().unwrap();
        let acl = std::process::Command::new("icacls.exe")
            .arg(&path)
            .arg("/findsid")
            .arg(format!("*{sid}"))
            .args(["/T", "/C"])
            .output()
            .unwrap();
        let text = String::from_utf8_lossy(&acl.stdout);
        assert!(acl.status.success());
        assert!(text.contains(path.to_string_lossy().as_ref()));
        let acl = std::process::Command::new("icacls.exe")
            .arg(&path)
            .output()
            .unwrap();
        let text = String::from_utf8_lossy(&acl.stdout);
        assert!(text.contains("S-1-5-18") || text.contains("SYSTEM"));
    }
}
