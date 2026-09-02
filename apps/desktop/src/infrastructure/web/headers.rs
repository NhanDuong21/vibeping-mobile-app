use axum::{
    body::Body,
    http::{Request, StatusCode, header},
    middleware::Next,
    response::{IntoResponse, Response},
};

pub async fn apply(request: Request<Body>, next: Next) -> Response {
    let path = request.uri().path().to_owned();
    let host = request
        .headers()
        .get(header::HOST)
        .and_then(|value| value.to_str().ok());
    let private_https = host.is_some_and(|value| host_name(value).ends_with(".ts.net"));
    let mut response = if host.is_some_and(|value| !allowed_host(value)) {
        StatusCode::MISDIRECTED_REQUEST.into_response()
    } else {
        next.run(request).await
    };
    let headers = response.headers_mut();
    headers.insert("X-Content-Type-Options", "nosniff".parse().unwrap());
    headers.insert("Referrer-Policy", "no-referrer".parse().unwrap());
    headers.insert("X-Frame-Options", "DENY".parse().unwrap());
    headers.insert(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
            .parse()
            .unwrap(),
    );
    headers.insert("Cross-Origin-Opener-Policy", "same-origin".parse().unwrap());
    headers.insert(
        "Cross-Origin-Resource-Policy",
        "same-origin".parse().unwrap(),
    );
    headers.insert("X-Permitted-Cross-Domain-Policies", "none".parse().unwrap());
    headers.insert(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; worker-src 'self'; manifest-src 'self'"
            .parse()
            .unwrap(),
    );
    if path.starts_with("/api/") || path == "/sw.js" {
        headers.insert("Cache-Control", "no-store".parse().unwrap());
    }
    if private_https {
        headers.insert(
            "Strict-Transport-Security",
            "max-age=31536000".parse().unwrap(),
        );
    }
    response
}

fn allowed_host(value: &str) -> bool {
    let host = host_name(value);
    host == "localhost"
        || host
            .parse::<std::net::IpAddr>()
            .is_ok_and(|address| address.is_loopback())
        || host.ends_with(".ts.net")
}

fn host_name(value: &str) -> &str {
    value
        .strip_prefix('[')
        .and_then(|rest| rest.split_once(']').map(|(host, _)| host))
        .unwrap_or_else(|| value.split(':').next().unwrap_or(value))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn host_allowlist_covers_loopback_and_private_tailscale_only() {
        assert!(allowed_host("127.0.0.1:8790"));
        assert!(allowed_host("[::1]:8790"));
        assert!(allowed_host("device.tailnet.ts.net"));
        assert!(!allowed_host("attacker.example"));
        assert!(!allowed_host("device.tailnet.ts.net.attacker.example"));
    }
}
