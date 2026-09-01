use axum::{body::Body, http::Request, middleware::Next, response::Response};

pub async fn apply(request: Request<Body>, next: Next) -> Response {
    let path = request.uri().path().to_owned();
    let mut response = next.run(request).await;
    let headers = response.headers_mut();
    headers.insert("X-Content-Type-Options", "nosniff".parse().unwrap());
    headers.insert("Referrer-Policy", "no-referrer".parse().unwrap());
    headers.insert("X-Frame-Options", "DENY".parse().unwrap());
    headers.insert(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; worker-src 'self'; manifest-src 'self'"
            .parse()
            .unwrap(),
    );
    if path.starts_with("/api/") || path == "/sw.js" {
        headers.insert("Cache-Control", "no-store".parse().unwrap());
    }
    response
}
