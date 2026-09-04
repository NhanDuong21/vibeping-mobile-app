use axum::{
    body::{Body, to_bytes},
    http::{Request, StatusCode},
};
use chrono::Utc;
use tower::ServiceExt;
use vibeping::{app::build_state, config::RuntimeConfig, infrastructure::web};

#[tokio::test]
async fn preview_is_a_generated_api_response_and_requires_owner_after_pairing() {
    let temp = tempfile::tempdir().unwrap();
    let config = RuntimeConfig::discover(8790, Some(temp.path().into())).unwrap();
    let state = build_state(&config).await.unwrap();
    let app = web::router(state.clone());
    let request = || {
        Request::get("/api/v1/notifications/preview")
            .body(Body::empty())
            .unwrap()
    };
    let response = app.clone().oneshot(request()).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let json: serde_json::Value =
        serde_json::from_slice(&to_bytes(response.into_body(), 16384).await.unwrap()).unwrap();
    assert_eq!(json["source"], "sample");
    assert_eq!(
        json["standard"]["body"],
        "Hoàn thiện màn Hoạt động · vibeping-mobile-app"
    );
    sqlx::query("INSERT INTO owner_identity (id, tailscale_login, claimed_at) VALUES (1, 'owner@example.test', ?)")
        .bind(Utc::now()).execute(&state.database).await.unwrap();
    assert_eq!(
        app.clone().oneshot(request()).await.unwrap().status(),
        StatusCode::UNAUTHORIZED
    );
    for (login, expected) in [
        ("other@example.test", StatusCode::FORBIDDEN),
        ("owner@example.test", StatusCode::OK),
    ] {
        let request = Request::get("/api/v1/notifications/preview")
            .header("host", "phone.tailnet.ts.net")
            .header("tailscale-user-login", login)
            .body(Body::empty())
            .unwrap();
        assert_eq!(
            app.clone().oneshot(request).await.unwrap().status(),
            expected
        );
    }
}
