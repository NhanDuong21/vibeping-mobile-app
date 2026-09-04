//! A windowless logon launcher; lifecycle and recovery stay in the main executable.
#![cfg_attr(windows, windows_subsystem = "windows")]

fn main() {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let Ok(executable) = std::env::current_exe() else {
            return;
        };
        let _ = std::process::Command::new(executable.with_file_name("vibeping.exe"))
            .args(["always-ready", "login"])
            .args(std::env::args_os().skip(1))
            .creation_flags(windows_sys::Win32::System::Threading::CREATE_NO_WINDOW)
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn();
    }
}
