use axum::{
    body::{Body, to_bytes},
    http::{Request, StatusCode},
};
use chrono::Utc;
use tower::ServiceExt;
use vibeping::{app::build_state, config::RuntimeConfig, infrastructure::web};

#[tokio::test]
async fn personal_reads_require_the_owner_and_windows_controls_are_not_remote_routes() {
    let temp = tempfile::tempdir().unwrap();
    let state = build_state(&RuntimeConfig::discover(8790, Some(temp.path().into())).unwrap())
        .await
        .unwrap();
    sqlx::query("INSERT INTO owner_identity VALUES (1,'owner@example.test',?)")
        .bind(Utc::now())
        .execute(&state.database)
        .await
        .unwrap();
    let app = web::router(state);
    for path in [
        "/api/v1/personal/rules",
        "/api/v1/personal/projects",
        "/api/v1/always-ready",
        "/api/v1/personal/today?from=2026-09-04T00%3A00%3A00Z&to=2026-09-05T00%3A00%3A00Z",
    ] {
        let request = Request::get(path).body(Body::empty()).unwrap();
        assert_eq!(
            app.clone().oneshot(request).await.unwrap().status(),
            StatusCode::UNAUTHORIZED
        );
        let request = Request::get(path)
            .header("host", "phone.tailnet.ts.net")
            .header("tailscale-user-login", "owner@example.test")
            .body(Body::empty())
            .unwrap();
        let response = app.clone().oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let body = String::from_utf8(
            to_bytes(response.into_body(), 16384)
                .await
                .unwrap()
                .to_vec(),
        )
        .unwrap();
        assert!(!body.contains("owner@example.test"));
        assert!(!body.contains("data_dir"));
    }
    let request = Request::post("/api/v1/always-ready")
        .body(Body::empty())
        .unwrap();
    assert_eq!(
        app.oneshot(request).await.unwrap().status(),
        StatusCode::METHOD_NOT_ALLOWED
    );
}

#[tokio::test]
async fn personal_mutations_require_csrf_and_today_rejects_unbounded_ranges() {
    let temp = tempfile::tempdir().unwrap();
    let state = build_state(&RuntimeConfig::discover(8790, Some(temp.path().into())).unwrap())
        .await
        .unwrap();
    let app = web::router(state);
    let request = Request::put("/api/v1/personal/rules")
        .header("content-type", "application/json")
        .body(Body::from(
            r#"{"completionMinMinutes":0,"waitingReminderMinutes":0}"#,
        ))
        .unwrap();
    assert!(
        !app.clone()
            .oneshot(request)
            .await
            .unwrap()
            .status()
            .is_success()
    );
    let request = Request::get(
        "/api/v1/personal/today?from=2026-09-01T00%3A00%3A00Z&to=2026-09-05T00%3A00%3A00Z",
    )
    .body(Body::empty())
    .unwrap();
    assert_eq!(
        app.oneshot(request).await.unwrap().status(),
        StatusCode::BAD_REQUEST
    );
}
