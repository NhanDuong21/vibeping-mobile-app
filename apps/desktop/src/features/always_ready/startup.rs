use crate::features::lifecycle::{RuntimePaths, windows_command_line};
use anyhow::{Context, Result, bail};
use std::{ffi::OsString, ptr};
use windows_sys::Win32::{
    Foundation::{ERROR_FILE_NOT_FOUND, ERROR_SUCCESS},
    System::Registry::{
        HKEY, HKEY_CURRENT_USER, KEY_SET_VALUE, REG_OPTION_NON_VOLATILE, REG_SZ, RegCloseKey,
        RegCreateKeyExW, RegDeleteValueW, RegSetValueExW,
    },
};

fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain([0]).collect()
}

/// HKCU only, with one application-owned value. No elevation, service or public listener.
pub fn set(paths: &RuntimePaths, port: u16, enabled: bool) -> Result<()> {
    let executable = std::env::current_exe()
        .context("Không tìm thấy VibePing")?
        .with_file_name("vibeping-ready.exe");
    if enabled && !executable.is_file() {
        bail!("Gói Windows thiếu trình khởi động. Hãy giải nén lại đầy đủ gói VibePing.");
    }
    let command = windows_command_line(
        executable.as_os_str(),
        &[
            OsString::from("--port"),
            OsString::from(port.to_string()),
            OsString::from("--data-dir"),
            paths.data_dir().as_os_str().to_owned(),
        ],
    );
    if enabled && command.len() > 260 {
        bail!(
            "Đường dẫn quá dài để khởi động cùng Windows. Hãy chuyển gói VibePing vào thư mục ngắn hơn."
        );
    }
    let key_name = wide("Software\\Microsoft\\Windows\\CurrentVersion\\Run");
    let name = wide("VibePing");
    let mut key: HKEY = ptr::null_mut();
    let opened = unsafe {
        RegCreateKeyExW(
            HKEY_CURRENT_USER,
            key_name.as_ptr(),
            0,
            ptr::null(),
            REG_OPTION_NON_VOLATILE,
            KEY_SET_VALUE,
            ptr::null(),
            &mut key,
            ptr::null_mut(),
        )
    };
    if opened != ERROR_SUCCESS {
        bail!("Windows chưa cho phép đổi mục khởi động VibePing");
    }
    let result = unsafe {
        let result = if enabled {
            RegSetValueExW(
                key,
                name.as_ptr(),
                0,
                REG_SZ,
                command.as_ptr().cast(),
                (command.len() * 2) as u32,
            )
        } else {
            RegDeleteValueW(key, name.as_ptr())
        };
        RegCloseKey(key);
        result
    };
    if result != ERROR_SUCCESS && !(result == ERROR_FILE_NOT_FOUND && !enabled) {
        bail!("Không lưu được mục khởi động VibePing");
    }
    Ok(())
}
