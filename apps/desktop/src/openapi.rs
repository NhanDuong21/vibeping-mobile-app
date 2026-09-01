use utoipa::OpenApi;

use crate::features::{
    codex_attention::{
        ActivityEvent, ActivitySnapshot, CurrentWork, EventFeed, ReadStateResponse,
        http as activity_http,
    },
    notifications::{
        dto::{
            ActionResponse, BrowserSubscription, PublicKeyResponse, SubscriptionKeys,
            SubscriptionRegistrationRequest, SubscriptionResponse, TestPushRequest,
            TestPushResponse,
        },
        http as notifications_http,
    },
    pairing::{
        dto::{PairingClaimRequest, PairingClaimResponse, PairingStatusResponse},
        http as pairing_http,
    },
    system::{
        dto::{BootstrapResponse, ConnectionSnapshot, ErrorEnvelope, HealthResponse},
        http,
    },
    usage_limits::{UsageLimitWindow, UsageLimitsSnapshot, http as usage_limits_http},
};

#[derive(OpenApi)]
#[openapi(
    info(title = "VibePing API", version = "1.0.0-rc.1"),
    paths(
        http::health,
        http::bootstrap,
        http::stream,
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
        notifications_http::test_push
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
        ActivityEvent,
        ActivitySnapshot,
        EventFeed,
        ReadStateResponse,
        CurrentWork,
        UsageLimitWindow,
        UsageLimitsSnapshot
    ))
)]
pub struct ApiDoc;
