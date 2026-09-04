use super::{config::ReadyStatus, supervisor::TrayAction};
use std::{
    ptr,
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
    },
    thread,
};
use tokio::sync::mpsc::UnboundedSender;
use windows_sys::Win32::{
    Foundation::*,
    System::LibraryLoader::GetModuleHandleW,
    UI::{Shell::*, WindowsAndMessaging::*},
};

const CALLBACK: u32 = WM_APP + 1;
struct TrayContext {
    sender: UnboundedSender<TrayAction>,
    status: Arc<Mutex<ReadyStatus>>,
    stop: Arc<AtomicBool>,
    available: Arc<AtomicBool>,
    icon: HICON,
    taskbar_created: u32,
}
fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain([0]).collect()
}

pub fn spawn(
    sender: UnboundedSender<TrayAction>,
    status: Arc<Mutex<ReadyStatus>>,
    stop: Arc<AtomicBool>,
    available: Arc<AtomicBool>,
) -> thread::JoinHandle<()> {
    thread::spawn(move || unsafe {
        let instance = GetModuleHandleW(ptr::null());
        let class_name = wide("VibePingCompanion");
        let class = WNDCLASSW {
            lpfnWndProc: Some(window_proc),
            hInstance: instance,
            lpszClassName: class_name.as_ptr(),
            ..std::mem::zeroed()
        };
        if RegisterClassW(&class) == 0 {
            return;
        }
        let mut pixels =
            include_bytes!("../../../../mobile/public/assets/logo-icon-192.png").to_vec();
        let icon = CreateIconFromResourceEx(
            pixels.as_mut_ptr(),
            pixels.len() as u32,
            1,
            0x00030000,
            32,
            32,
            LR_DEFAULTCOLOR,
        );
        if icon.is_null() {
            return;
        }
        let mut context = Box::new(TrayContext {
            sender,
            status,
            stop,
            available,
            icon,
            taskbar_created: RegisterWindowMessageW(wide("TaskbarCreated").as_ptr()),
        });
        let window = CreateWindowExW(
            0,
            class_name.as_ptr(),
            wide("VibePing").as_ptr(),
            WS_OVERLAPPED,
            0,
            0,
            0,
            0,
            ptr::null_mut(),
            ptr::null_mut(),
            instance,
            (&mut *context as *mut TrayContext).cast(),
        );
        if !window.is_null() {
            notify(window, &context, NIM_ADD);
            SetTimer(window, 1, 1000, None);
            let mut message: MSG = std::mem::zeroed();
            while GetMessageW(&mut message, ptr::null_mut(), 0, 0) > 0 {
                TranslateMessage(&message);
                DispatchMessageW(&message);
            }
        }
        context.available.store(false, Ordering::Relaxed);
        DestroyIcon(icon);
        UnregisterClassW(class_name.as_ptr(), instance);
    })
}

unsafe extern "system" fn window_proc(
    window: HWND,
    message: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    // Windows owns message ordering; this pointer stays alive until the message loop exits.
    unsafe {
        if message == WM_NCCREATE {
            let create = &*(lparam as *const CREATESTRUCTW);
            SetWindowLongPtrW(window, GWLP_USERDATA, create.lpCreateParams as isize);
        }
        let pointer = GetWindowLongPtrW(window, GWLP_USERDATA) as *const TrayContext;
        if pointer.is_null() {
            return DefWindowProcW(window, message, wparam, lparam);
        }
        let context = &*pointer;
        if message == context.taskbar_created && message != 0 {
            notify(window, context, NIM_ADD);
            return 0;
        }
        match message {
            CALLBACK => {
                match (lparam as u32) & 0xffff {
                    NIN_SELECT | 0x401 => {
                        let _ = context.sender.send(TrayAction::Open);
                    }
                    WM_CONTEXTMENU => menu(window, context),
                    _ => {}
                }
                0
            }
            WM_TIMER => {
                if context.stop.load(Ordering::Relaxed) {
                    DestroyWindow(window);
                } else {
                    notify(
                        window,
                        context,
                        if context.available.load(Ordering::Relaxed) {
                            NIM_MODIFY
                        } else {
                            NIM_ADD
                        },
                    );
                }
                0
            }
            WM_DESTROY => {
                notify(window, context, NIM_DELETE);
                PostQuitMessage(0);
                0
            }
            _ => DefWindowProcW(window, message, wparam, lparam),
        }
    }
}

unsafe fn notify(window: HWND, context: &TrayContext, operation: u32) {
    unsafe {
        let status = context.status.lock().unwrap();
        let state = match status.state.as_str() {
            "healthy" => "Đang chạy",
            "stopped" => "Đã dừng",
            "recovering" => "Đang khôi phục",
            _ => "Đang kiểm tra kết nối",
        };
        let mut data: NOTIFYICONDATAW = std::mem::zeroed();
        data.cbSize = std::mem::size_of::<NOTIFYICONDATAW>() as u32;
        data.hWnd = window;
        data.uID = 1;
        data.uFlags = NIF_MESSAGE | NIF_ICON | NIF_TIP | NIF_SHOWTIP;
        data.uCallbackMessage = CALLBACK;
        data.hIcon = context.icon;
        for (to, from) in data
            .szTip
            .iter_mut()
            .zip(wide(&format!("VibePing · {state}")))
        {
            *to = from;
        }
        let success = Shell_NotifyIconW(operation, &data) != 0;
        context
            .available
            .store(success && operation != NIM_DELETE, Ordering::Relaxed);
        if success && operation == NIM_ADD {
            data.Anonymous.uVersion = NOTIFYICON_VERSION_4;
            Shell_NotifyIconW(NIM_SETVERSION, &data);
        }
    }
}

unsafe fn menu(window: HWND, context: &TrayContext) {
    unsafe {
        let menu = CreatePopupMenu();
        if menu.is_null() {
            return;
        }
        let auto_start = context.status.lock().unwrap().auto_start;
        for (id, label) in [
            (1, "Mở VibePing"),
            (2, "Khởi động VibePing"),
            (3, "Dừng VibePing"),
        ] {
            AppendMenuW(menu, MF_STRING, id, wide(label).as_ptr());
        }
        AppendMenuW(menu, MF_SEPARATOR, 0, ptr::null());
        AppendMenuW(
            menu,
            MF_STRING | if auto_start { MF_CHECKED } else { MF_UNCHECKED },
            4,
            wide("Khởi động khi đăng nhập Windows").as_ptr(),
        );
        AppendMenuW(
            menu,
            MF_STRING,
            5,
            wide("Tắt Sẵn sàng trên Windows").as_ptr(),
        );
        let mut point: POINT = std::mem::zeroed();
        GetCursorPos(&mut point);
        SetForegroundWindow(window);
        let selected = TrackPopupMenu(
            menu,
            TPM_RETURNCMD | TPM_NONOTIFY,
            point.x,
            point.y,
            0,
            window,
            ptr::null(),
        );
        PostMessageW(window, WM_NULL, 0, 0);
        DestroyMenu(menu);
        let action = match selected {
            1 => TrayAction::Open,
            2 => TrayAction::Start,
            3 => TrayAction::Stop,
            4 => TrayAction::ToggleAutoStart,
            5 => TrayAction::Disable,
            _ => return,
        };
        let _ = context.sender.send(action);
    }
}
