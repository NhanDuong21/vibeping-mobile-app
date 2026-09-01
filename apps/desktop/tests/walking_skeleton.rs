use axum::{
    body::{Body, to_bytes},
    http::{Request, StatusCode, header},
};
use tempfile::tempdir;
use tower::ServiceExt;
use vibeping::{app::build_state, config::RuntimeConfig, infrastructure::web};

#[tokio::test]
async fn health_bootstrap_and_spa_fallback_are_served() {
    let temp = tempdir().unwrap();
    let config = RuntimeConfig::discover(8790, Some(temp.path().to_path_buf())).unwrap();
    let app = web::router(build_state(&config).await.unwrap());

    let health = app
        .clone()
        .oneshot(Request::get("/api/v1/health").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(health.status(), StatusCode::OK);
    let body = to_bytes(health.into_body(), 16_384).await.unwrap();
    assert!(String::from_utf8_lossy(&body).contains("vibeping"));

    let bootstrap = app
        .clone()
        .oneshot(
            Request::get("/api/v1/bootstrap")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(bootstrap.status(), StatusCode::OK);

    let route = app
        .clone()
        .oneshot(
            Request::get("/activity/example")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(route.status(), StatusCode::OK);
    assert!(
        route.headers()[header::CONTENT_TYPE]
            .to_str()
            .unwrap()
            .starts_with("text/html")
    );
    assert_eq!(route.headers()[header::CACHE_CONTROL], "no-cache");
    assert!(
        route.headers()["Content-Security-Policy"]
            .to_str()
            .unwrap()
            .contains("base-uri 'self'")
    );

    let script = app
        .oneshot(Request::get("/ngsw-worker.js").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(script.status(), StatusCode::OK);
    assert_eq!(script.headers()[header::CACHE_CONTROL], "no-cache");
}

#[tokio::test]
async fn stream_returns_sse_content_type() {
    let temp = tempdir().unwrap();
    let config = RuntimeConfig::discover(8791, Some(temp.path().to_path_buf())).unwrap();
    let app = web::router(build_state(&config).await.unwrap());
    let response = app
        .oneshot(Request::get("/api/v1/stream").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.headers()[header::CONTENT_TYPE],
        "text/event-stream"
    );
}
