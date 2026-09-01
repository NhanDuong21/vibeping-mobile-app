use std::{
    ffi::{OsStr, OsString},
    path::Path,
    process::Command,
};

use anyhow::{Context, Result, bail};

use super::RuntimePaths;

pub fn spawn_background(port: u16, paths: &RuntimePaths) -> Result<()> {
    let executable = std::env::current_exe().context("Không tìm thấy tệp chạy VibePing")?;
    let arguments = [
        OsString::from("run"),
        OsString::from("--port"),
        OsString::from(port.to_string()),
        OsString::from("--data-dir"),
        paths.data_dir().as_os_str().to_owned(),
    ];
    spawn_detached(&executable, &arguments)
}

pub fn launch_url(origin: &str) -> Result<()> {
    if !origin.starts_with("https://") || !origin.ends_with(".ts.net") {
        bail!("Địa chỉ riêng chưa hợp lệ")
    }
    let mut command = Command::new("rundll32.exe");
    command.args(["url.dll,FileProtocolHandler", origin]);
    hide_window(&mut command);
    command
        .spawn()
        .context("Không mở được trình duyệt mặc định")?;
    Ok(())
}

#[cfg(windows)]
fn spawn_detached(executable: &Path, arguments: &[OsString]) -> Result<()> {
    use std::{mem::size_of, os::windows::ffi::OsStrExt, ptr};
    use windows_sys::Win32::{
        Foundation::CloseHandle,
        System::Threading::{
            CREATE_NEW_PROCESS_GROUP, CREATE_NO_WINDOW, CreateProcessW, PROCESS_INFORMATION,
            STARTUPINFOW,
        },
    };

    let application = executable
        .as_os_str()
        .encode_wide()
        .chain([0])
        .collect::<Vec<_>>();
    let mut command_line = windows_command_line(executable.as_os_str(), arguments);
    let mut startup: STARTUPINFOW = unsafe { std::mem::zeroed() };
    startup.cb = size_of::<STARTUPINFOW>() as u32;
    let mut process: PROCESS_INFORMATION = unsafe { std::mem::zeroed() };
    let created = unsafe {
        CreateProcessW(
            application.as_ptr(),
            command_line.as_mut_ptr(),
            ptr::null(),
            ptr::null(),
            0,
            CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW,
            ptr::null(),
            ptr::null(),
            &startup,
            &mut process,
        )
    };
    if created == 0 {
        return Err(std::io::Error::last_os_error()).context("Không khởi động được VibePing ở nền");
    }
    unsafe {
        CloseHandle(process.hThread);
        CloseHandle(process.hProcess);
    }
    Ok(())
}

#[cfg(windows)]
fn windows_command_line(executable: &OsStr, arguments: &[OsString]) -> Vec<u16> {
    use std::os::windows::ffi::OsStrExt;

    let mut command = Vec::new();
    for argument in std::iter::once(executable).chain(arguments.iter().map(OsString::as_os_str)) {
        if !command.is_empty() {
            command.push(b' ' as u16);
        }
        append_quoted(&mut command, &argument.encode_wide().collect::<Vec<_>>());
    }
    command.push(0);
    command
}

#[cfg(windows)]
fn append_quoted(command: &mut Vec<u16>, argument: &[u16]) {
    command.push(b'"' as u16);
    let mut backslashes = 0;
    for &character in argument {
        if character == b'\\' as u16 {
            backslashes += 1;
        } else {
            let extra = usize::from(character == b'"' as u16);
            command.extend(std::iter::repeat_n(
                b'\\' as u16,
                backslashes * (extra + 1) + extra,
            ));
            command.push(character);
            backslashes = 0;
        }
    }
    command.extend(std::iter::repeat_n(b'\\' as u16, backslashes * 2));
    command.push(b'"' as u16);
}

#[cfg(not(windows))]
fn spawn_detached(executable: &Path, arguments: &[OsString]) -> Result<()> {
    use std::process::Stdio;

    Command::new(executable)
        .args(arguments)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .context("Không khởi động được VibePing ở nền")?;
    Ok(())
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
    fn rejects_non_tailnet_urls() {
        assert!(launch_url("https://example.com").is_err());
    }
}
