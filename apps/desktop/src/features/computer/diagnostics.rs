use anyhow::Result;
use chrono::Utc;

use super::{ComputerStatus, ComputerStore, DiagnosticCheck, DiagnosticsReport};

impl ComputerStore {
    pub async fn diagnostics(&self, status: &ComputerStatus) -> Result<DiagnosticsReport> {
        let database_ready = self.database_ready().await;
        let pending_jobs = self.pending_jobs().await?;
        let checks = vec![
            check(
                "desktop",
                "Ứng dụng trên laptop",
                status.desktop == "running",
                "VibePing đang chạy trên laptop.",
                "Mở VibePing lại từ laptop.",
            ),
            check(
                "privateConnection",
                "Kết nối riêng tư",
                status.private_connection == "ready",
                "Điện thoại đang đi qua kết nối Tailscale riêng tư.",
                "Mở Tailscale trên điện thoại rồi tải lại VibePing.",
            ),
            check(
                "codex",
                "Kết nối Codex",
                status.codex == "connected",
                "Tích hợp Codex và bộ đọc hạn mức đang sẵn sàng.",
                codex_recovery(&status.codex),
            ),
            check(
                "notifications",
                "Thông báo iPhone",
                status.notifications == "ready",
                "Có đăng ký thông báo đang hoạt động.",
                "Mở Cài đặt và chọn Đăng ký lại thông báo.",
            ),
            check(
                "database",
                "Dữ liệu cục bộ",
                database_ready,
                "SQLite đang phản hồi bình thường.",
                "Khởi động lại VibePing trên laptop rồi chạy chẩn đoán lại.",
            ),
        ];
        let report = format!(
            "VibePing {}\ndesktop={}\ncodex={}\nallowance={}\nnotifications={}\nprivate={}\ndatabase={}\npending_jobs={}\nlast_signal={}",
            env!("CARGO_PKG_VERSION"),
            status.desktop,
            status.codex,
            status.allowance_reader,
            status.notifications,
            status.private_connection,
            if database_ready {
                "ready"
            } else {
                "unavailable"
            },
            pending_jobs,
            status
                .last_signal_at
                .map(|value| value.to_rfc3339())
                .unwrap_or_else(|| "none".into()),
        );
        Ok(DiagnosticsReport {
            generated_at: Utc::now(),
            checks,
            technical_report: report,
        })
    }
}

fn check(
    key: &str,
    label: &str,
    ready: bool,
    ready_detail: &str,
    recovery: &str,
) -> DiagnosticCheck {
    DiagnosticCheck {
        key: key.into(),
        label: label.into(),
        state: if ready { "ready" } else { "needsAttention" }.into(),
        detail: if ready {
            ready_detail
        } else {
            "Mục này cần được xử lý để VibePing hoạt động đầy đủ."
        }
        .into(),
        action: (!ready).then(|| recovery.into()),
    }
}

fn codex_recovery(state: &str) -> &'static str {
    if state == "needsReview" {
        "Gửi một yêu cầu mới trong Codex. Nếu VibePing vẫn chưa cập nhật, mở /hooks và kiểm tra các mục VibePing đang bật."
    } else {
        "Trên laptop, chạy sửa tích hợp rồi kiểm tra /hooks trong Codex."
    }
}
