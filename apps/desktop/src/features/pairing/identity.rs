use axum::http::{HeaderMap, header};

use crate::infrastructure::web::error::ApiError;

const TAILSCALE_LOGIN: &str = "tailscale-user-login";
#[cfg(debug_assertions)]
const TEST_IDENTITY: &str = "x-vibeping-test-identity";
const CSRF_HEADER: &str = "x-vibeping-csrf";

#[derive(Clone, Debug)]
pub struct RequestIdentity {
    login: String,
}

impl RequestIdentity {
    #[cfg(test)]
    pub fn for_test(login: &str) -> Self {
        Self {
            login: login.to_owned(),
        }
    }

    pub fn from_headers(headers: &HeaderMap) -> Option<Self> {
        #[cfg(debug_assertions)]
        if let Some(login) = header_text(headers, TEST_IDENTITY) {
            return valid_login(login).map(|login| Self { login });
        }

        let host = header_text(headers, header::HOST.as_str())?;
        if !host_without_port(host).ends_with(".ts.net") {
            return None;
        }
        valid_login(header_text(headers, TAILSCALE_LOGIN)?).map(|login| Self { login })
    }

    pub fn login(&self) -> &str {
        &self.login
    }
}

pub fn require_mutation(headers: &HeaderMap, expected_csrf: &str) -> Result<(), ApiError> {
    require_json(headers)?;
    require_same_origin(headers)?;
    if header_text(headers, CSRF_HEADER) != Some(expected_csrf) {
        return Err(ApiError::forbidden("CSRF_INVALID"));
    }
    Ok(())
}

fn require_json(headers: &HeaderMap) -> Result<(), ApiError> {
    let content_type = header_text(headers, header::CONTENT_TYPE.as_str()).unwrap_or_default();
    if content_type
        .split(';')
        .next()
        .is_some_and(|value| value.trim().eq_ignore_ascii_case("application/json"))
    {
        Ok(())
    } else {
        Err(ApiError::bad_request("JSON_REQUIRED"))
    }
}

fn require_same_origin(headers: &HeaderMap) -> Result<(), ApiError> {
    #[cfg(debug_assertions)]
    if headers.contains_key(TEST_IDENTITY) {
        return Ok(());
    }

    let host = header_text(headers, header::HOST.as_str())
        .ok_or_else(|| ApiError::forbidden("ORIGIN_NOT_ALLOWED"))?;
    let origin = header_text(headers, header::ORIGIN.as_str())
        .and_then(origin_authority)
        .ok_or_else(|| ApiError::forbidden("ORIGIN_NOT_ALLOWED"))?;
    if origin == host && host_without_port(host).ends_with(".ts.net") {
        Ok(())
    } else {
        Err(ApiError::forbidden("ORIGIN_NOT_ALLOWED"))
    }
}

fn origin_authority(origin: &str) -> Option<&str> {
    let (scheme, rest) = origin.split_once("://")?;
    if scheme != "https" {
        return None;
    }
    rest.split('/').next()
}

fn host_without_port(host: &str) -> &str {
    host.split(':').next().unwrap_or(host)
}

fn valid_login(login: &str) -> Option<String> {
    let value = login.trim();
    if value.is_empty() || value.len() > 254 || value.chars().any(char::is_control) {
        None
    } else {
        Some(value.to_owned())
    }
}

fn header_text<'a>(headers: &'a HeaderMap, name: &str) -> Option<&'a str> {
    headers.get(name)?.to_str().ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn direct_spoofed_tailscale_header_is_not_identity() {
        let mut headers = HeaderMap::new();
        headers.insert(header::HOST, "127.0.0.1:8790".parse().unwrap());
        headers.insert(TAILSCALE_LOGIN, "owner@example.test".parse().unwrap());
        assert!(RequestIdentity::from_headers(&headers).is_none());
    }

    #[test]
    fn serve_identity_requires_tailnet_host() {
        let mut headers = HeaderMap::new();
        headers.insert(header::HOST, "pc.tailnet.ts.net".parse().unwrap());
        headers.insert(TAILSCALE_LOGIN, "owner@example.test".parse().unwrap());
        assert_eq!(
            RequestIdentity::from_headers(&headers).unwrap().login(),
            "owner@example.test"
        );
    }

    #[test]
    fn mutations_require_json_private_origin_and_csrf() {
        let mut headers = HeaderMap::new();
        headers.insert(header::HOST, "pc.tailnet.ts.net".parse().unwrap());
        headers.insert(header::ORIGIN, "https://pc.tailnet.ts.net".parse().unwrap());
        headers.insert(header::CONTENT_TYPE, "application/json".parse().unwrap());
        headers.insert(CSRF_HEADER, "expected".parse().unwrap());
        assert!(require_mutation(&headers, "expected").is_ok());

        headers.insert(header::ORIGIN, "https://attacker.example".parse().unwrap());
        assert!(require_mutation(&headers, "expected").is_err());
        headers.insert(header::ORIGIN, "https://pc.tailnet.ts.net".parse().unwrap());
        headers.insert(CSRF_HEADER, "wrong".parse().unwrap());
        assert!(require_mutation(&headers, "expected").is_err());
        headers.insert(CSRF_HEADER, "expected".parse().unwrap());
        headers.insert(header::CONTENT_TYPE, "text/plain".parse().unwrap());
        assert!(require_mutation(&headers, "expected").is_err());
    }
}
