use axum::{
    body::Body,
    http::{StatusCode, Uri, header},
    response::{IntoResponse, Response},
};
use rust_embed::RustEmbed;

#[derive(RustEmbed)]
#[folder = "$CARGO_MANIFEST_DIR/../mobile/dist/vibeping-mobile/browser"]
struct WebAssets;

pub async fn serve(uri: Uri) -> Response {
    let _asset_revision = env!("VIBEPING_WEB_ASSET_REVISION");
    if uri.path().starts_with("/api/") {
        return StatusCode::NOT_FOUND.into_response();
    }
    let requested = uri.path().trim_start_matches('/');
    let path = if requested.is_empty() {
        "index.html"
    } else {
        requested
    };
    if let Some(asset) = WebAssets::get(path) {
        return response(path, asset.data.into_owned());
    }
    match WebAssets::get("index.html") {
        Some(asset) => response("index.html", asset.data.into_owned()),
        None => StatusCode::SERVICE_UNAVAILABLE.into_response(),
    }
}

fn response(path: &str, bytes: Vec<u8>) -> Response {
    let content_type = mime_guess::from_path(path).first_or_octet_stream();
    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, content_type.as_ref())
        .header(header::CACHE_CONTROL, cache_control(path))
        .body(Body::from(bytes))
        .expect("valid embedded asset response")
}

fn cache_control(path: &str) -> &'static str {
    match path {
        "index.html" | "sw.js" | "ngsw.json" | "ngsw-worker.js" | "manifest.webmanifest" => {
            "no-cache"
        }
        _ => "public, max-age=31536000, immutable",
    }
}
