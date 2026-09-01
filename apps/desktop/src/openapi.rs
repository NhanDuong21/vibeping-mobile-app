use utoipa::OpenApi;

use crate::features::system::{
    dto::{BootstrapResponse, ConnectionSnapshot, ErrorEnvelope, HealthResponse},
    http,
};

#[derive(OpenApi)]
#[openapi(
    info(title = "VibePing API", version = "1.0.0-rc.1"),
    paths(http::health, http::bootstrap, http::stream),
    components(schemas(HealthResponse, BootstrapResponse, ConnectionSnapshot, ErrorEnvelope))
)]
pub struct ApiDoc;
