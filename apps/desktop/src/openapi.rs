use utoipa::OpenApi;

use crate::features::{
    codex_attention::{
        ActivityEvent, ActivityEventDetail, ActivitySnapshot, ActivityTimelineStage, CurrentWork,
        EventFeed, ReadStateResponse, http as activity_http,
    },
    computer::{ComputerStatus, DiagnosticCheck, DiagnosticsReport, http as computer_http},
    notifications::{
        dto::{
            ActionResponse, BrowserSubscription, NotificationCopy, NotificationPreview,
            PublicKeyResponse, SubscriptionKeys, SubscriptionRegistrationRequest,
            SubscriptionResponse, TestPushRequest, TestPushResponse,
        },
        http as notifications_http, preview_http,
    },
    pairing::{
        dto::{PairingClaimRequest, PairingClaimResponse, PairingStatusResponse},
        http as pairing_http,
    },
    personal::http as personal_http,
    preferences::{NotificationPreferences, Preferences, QuietHours, http as preferences_http},
    system::{
        dto::{BootstrapResponse, ConnectionSnapshot, ErrorEnvelope, HealthResponse},
        http,
    },
    usage_limits::{UsageLimitWindow, UsageLimitsSnapshot, http as usage_limits_http},
};

#[derive(OpenApi)]
#[openapi(
    info(title = "VibePing API", version = "1.2.0"),
    paths(
        http::health,
        crate::features::always_ready::http::status,
        personal_http::rules,
        personal_http::today,
        personal_http::save_rules,
        personal_http::projects,
        personal_http::save_project,
        http::bootstrap,
        http::stream,
        computer_http::computer_status,
        computer_http::diagnostics,
        computer_http::run_diagnostics,
        preferences_http::get,
        preferences_http::put,
        activity_http::activity,
        activity_http::events,
        activity_http::event,
        activity_http::read_event,
        activity_http::read_all,
        usage_limits_http::get_limits,
        usage_limits_http::refresh_limits,
        pairing_http::status,
        pairing_http::claim,
        notifications_http::public_key,
        notifications_http::subscribe,
        notifications_http::unsubscribe,
        notifications_http::test_push,
        preview_http::preview
    ),
    components(schemas(
        HealthResponse,
        BootstrapResponse,
        ConnectionSnapshot,
        ErrorEnvelope,
        PairingStatusResponse,
        PairingClaimRequest,
        PairingClaimResponse,
        PublicKeyResponse,
        SubscriptionRegistrationRequest,
        BrowserSubscription,
        SubscriptionKeys,
        SubscriptionResponse,
        TestPushRequest,
        TestPushResponse,
        ActionResponse,
        NotificationCopy,
        NotificationPreview,
        ActivityEvent,
        ActivityEventDetail,
        ActivityTimelineStage,
        ActivitySnapshot,
        EventFeed,
        ReadStateResponse,
        CurrentWork,
        ComputerStatus,
        DiagnosticCheck,
        DiagnosticsReport,
        Preferences,
        NotificationPreferences,
        QuietHours,
        UsageLimitWindow,
        UsageLimitsSnapshot
    ))
)]
pub struct ApiDoc;
