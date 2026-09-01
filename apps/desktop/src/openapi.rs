use utoipa::OpenApi;

use crate::features::{
    codex_attention::{ActivityEvent, ActivitySnapshot, CurrentWork, http as activity_http},
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
};

#[derive(OpenApi)]
#[openapi(
    info(title = "VibePing API", version = "1.0.0-rc.1"),
    paths(
        http::health,
        http::bootstrap,
        http::stream,
        activity_http::activity,
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
        CurrentWork
    ))
)]
pub struct ApiDoc;
