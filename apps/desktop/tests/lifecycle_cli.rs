#![cfg(windows)]

use std::{
    fs,
    net::TcpListener,
    path::Path,
    process::{Command, Output},
    thread,
    time::Duration,
};

use serde_json::Value;
use tempfile::tempdir;

#[test]
fn lifecycle_recovers_stale_state_and_survives_restart_and_crash() {
    let binary = env!("CARGO_BIN_EXE_vibeping");
    let temp = tempdir().unwrap();
    let data_dir = temp.path().join("OneDrive style path with spaces");
    let port = available_port();

    assert_success(
        run(binary, &data_dir, port, "start"),
        "VibePing đã sẵn sàng",
    );
    assert_success(
        run(binary, &data_dir, port, "start"),
        "VibePing đã sẵn sàng",
    );
    assert_success(run(binary, &data_dir, port, "status"), "VibePing đang chạy");
    assert_success(run(binary, &data_dir, port, "doctor"), "Funnel: đang tắt");
    assert_success(run(binary, &data_dir, port, "stop"), "VibePing đã dừng");
    assert_success(run(binary, &data_dir, port, "stop"), "VibePing đã dừng");

    assert_success(
        run(binary, &data_dir, port, "restart"),
        "VibePing đã sẵn sàng",
    );
    let metadata: Value =
        serde_json::from_slice(&fs::read(data_dir.join("runtime.json")).expect("runtime metadata"))
            .unwrap();
    let process_id = metadata["processId"].as_u64().unwrap().to_string();
    let killed = Command::new("taskkill")
        .args(["/PID", &process_id, "/F"])
        .output()
        .unwrap();
    assert!(killed.status.success());
    thread::sleep(Duration::from_millis(500));
    let intent: Value =
        serde_json::from_slice(&fs::read(data_dir.join("intent.json")).unwrap()).unwrap();
    assert_eq!(intent["enabled"], true);
    assert_success(run(binary, &data_dir, port, "status"), "trạng thái cũ");

    assert_success(
        run(binary, &data_dir, port, "start"),
        "VibePing đã sẵn sàng",
    );
    assert_success(
        run(binary, &data_dir, port, "stop"),
        "VibePing đã dừng an toàn",
    );
}

fn run(binary: &str, data_dir: &Path, port: u16, command: &str) -> Output {
    let mut process = Command::new(binary);
    process
        .arg(command)
        .arg("--data-dir")
        .arg(data_dir)
        .env("VIBEPING_TEST_TAILSCALE_READY", "1");
    if matches!(command, "start" | "run" | "restart") {
        process.arg("--port").arg(port.to_string());
    }
    process.output().unwrap()
}

fn assert_success(output: Output, expected: &str) {
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(output.status.success(), "stdout={stdout}\nstderr={stderr}");
    assert!(
        stdout.contains(expected),
        "stdout={stdout}\nstderr={stderr}"
    );
}

fn available_port() -> u16 {
    TcpListener::bind(("127.0.0.1", 0))
        .unwrap()
        .local_addr()
        .unwrap()
        .port()
}
