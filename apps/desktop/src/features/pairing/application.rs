use anyhow::Result;
use base64ct::{Base64UrlUnpadded, Encoding as _};
use chrono::{DateTime, Duration, Utc};
use sha2::{Digest, Sha256};
use uuid::Uuid;

use super::{
    dto::PairingClaimRequest,
    identity::RequestIdentity,
    store::{PairingSession, PairingStore},
};

const SESSION_MINUTES: i64 = 10;
const MAX_ATTEMPTS: i64 = 5;

pub struct PairingUseCase {
    store: PairingStore,
}

#[derive(Clone, Debug)]
pub struct PreparedPairingCode {
    pub code: String,
    pub expires_at: DateTime<Utc>,
}

#[derive(Clone, Debug)]
pub struct PairingSnapshot {
    pub owner_exists: bool,
    pub owner_match: bool,
    pub code_expires_at: Option<DateTime<Utc>>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PairingError {
    IdentityRequired,
    InvalidCode,
    ExpiredCode,
    ReusedCode,
    TooManyAttempts,
    InvalidDevice,
    StorageUnavailable,
}

impl PairingUseCase {
    pub fn new(store: PairingStore) -> Self {
        Self { store }
    }

    pub async fn prepare_code(&self) -> Result<Option<PreparedPairingCode>> {
        if self.store.owner_login().await?.is_some() {
            return Ok(None);
        }
        let raw = Uuid::new_v4().simple().to_string()[..8].to_uppercase();
        let code = format!("{}-{}", &raw[..4], &raw[4..]);
        let expires_at = Utc::now() + Duration::minutes(SESSION_MINUTES);
        self.store
            .replace_session(&code_hash(&raw), expires_at)
            .await?;
        Ok(Some(PreparedPairingCode { code, expires_at }))
    }

    pub async fn status(&self, identity: Option<&RequestIdentity>) -> Result<PairingSnapshot> {
        let owner = self.store.owner_login().await?;
        let session = self.store.latest_session().await?;
        Ok(PairingSnapshot {
            owner_exists: owner.is_some(),
            owner_match: owner
                .as_deref()
                .zip(identity.map(RequestIdentity::login))
                .is_some_and(|(owner, request)| owner == request),
            code_expires_at: active_expiry(session.as_ref()),
        })
    }

    pub async fn claim(
        &self,
        identity: Option<&RequestIdentity>,
        request: &PairingClaimRequest,
    ) -> Result<String, PairingError> {
        let identity = identity.ok_or(PairingError::IdentityRequired)?;
        validate_device(request)?;
        if self.store.owner_login().await.map_err(storage)?.is_some() {
            return Err(PairingError::ReusedCode);
        }
        let session = self
            .store
            .latest_session()
            .await
            .map_err(storage)?
            .ok_or(PairingError::InvalidCode)?;
        validate_session(&self.store, &session, &request.code).await?;
        self.store
            .claim(&session.id, identity.login(), request)
            .await
            .map_err(storage)
    }

    pub async fn owner_matches(&self, identity: &RequestIdentity) -> Result<bool> {
        Ok(self.store.owner_login().await?.as_deref() == Some(identity.login()))
    }
}

async fn validate_session(
    store: &PairingStore,
    session: &PairingSession,
    supplied_code: &str,
) -> Result<(), PairingError> {
    if session.used_at.is_some() {
        return Err(PairingError::ReusedCode);
    }
    if session.expires_at <= Utc::now() {
        return Err(PairingError::ExpiredCode);
    }
    if session.attempt_count >= MAX_ATTEMPTS {
        return Err(PairingError::TooManyAttempts);
    }
    let normalized = normalize_code(supplied_code).ok_or(PairingError::InvalidCode)?;
    if !constant_time_equal(&session.code_hash, &code_hash(&normalized)) {
        store
            .record_failed_attempt(&session.id)
            .await
            .map_err(storage)?;
        return Err(PairingError::InvalidCode);
    }
    Ok(())
}

fn validate_device(request: &PairingClaimRequest) -> Result<(), PairingError> {
    if Uuid::parse_str(&request.installation_id).is_err()
        || !matches!(request.display_mode.as_str(), "browser" | "standalone")
        || !matches!(
            request.notification_permission.as_str(),
            "default" | "granted" | "denied"
        )
    {
        Err(PairingError::InvalidDevice)
    } else {
        Ok(())
    }
}

fn active_expiry(session: Option<&PairingSession>) -> Option<DateTime<Utc>> {
    session
        .filter(|value| value.used_at.is_none() && value.expires_at > Utc::now())
        .map(|value| value.expires_at)
}

fn normalize_code(code: &str) -> Option<String> {
    let value = code.replace('-', "").trim().to_uppercase();
    (value.len() == 8 && value.bytes().all(|byte| byte.is_ascii_hexdigit())).then_some(value)
}

fn code_hash(code: &str) -> String {
    Base64UrlUnpadded::encode_string(&Sha256::digest(code.as_bytes()))
}

fn constant_time_equal(left: &str, right: &str) -> bool {
    left.len() == right.len()
        && left
            .bytes()
            .zip(right.bytes())
            .fold(0_u8, |difference, (a, b)| difference | (a ^ b))
            == 0
}

fn storage(_error: anyhow::Error) -> PairingError {
    PairingError::StorageUnavailable
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::*;
    use crate::infrastructure::database;

    async fn fixture() -> (tempfile::TempDir, PairingUseCase, PairingStore) {
        let temp = tempdir().unwrap();
        let pool = database::connect(&temp.path().join("pairing.sqlite3"))
            .await
            .unwrap();
        let store = PairingStore::new(pool);
        let use_case = PairingUseCase::new(store.clone());
        (temp, use_case, store)
    }

    fn request(code: String) -> PairingClaimRequest {
        PairingClaimRequest {
            code,
            installation_id: Uuid::new_v4().to_string(),
            display_mode: "standalone".into(),
            notification_permission: "default".into(),
        }
    }

    #[tokio::test]
    async fn code_is_single_use_and_owner_is_bound_to_private_identity() {
        let (_temp, use_case, _store) = fixture().await;
        let prepared = use_case.prepare_code().await.unwrap().unwrap();
        let identity = RequestIdentity::for_test("owner@example.test");
        use_case
            .claim(Some(&identity), &request(prepared.code.clone()))
            .await
            .unwrap();
        assert_eq!(
            use_case
                .claim(Some(&identity), &request(prepared.code))
                .await,
            Err(PairingError::ReusedCode)
        );
        assert!(use_case.owner_matches(&identity).await.unwrap());
    }

    #[tokio::test]
    async fn invalid_expired_and_attempt_limited_codes_are_distinct() {
        let (_temp, use_case, store) = fixture().await;
        use_case.prepare_code().await.unwrap().unwrap();
        let identity = RequestIdentity::for_test("owner@example.test");
        for _ in 0..5 {
            assert_eq!(
                use_case
                    .claim(Some(&identity), &request("AAAA-AAAA".into()))
                    .await,
                Err(PairingError::InvalidCode)
            );
        }
        assert_eq!(
            use_case
                .claim(Some(&identity), &request("AAAA-AAAA".into()))
                .await,
            Err(PairingError::TooManyAttempts)
        );
        store
            .replace_session("not-a-match", Utc::now() - Duration::seconds(1))
            .await
            .unwrap();
        assert_eq!(
            use_case
                .claim(Some(&identity), &request("AAAA-AAAA".into()))
                .await,
            Err(PairingError::ExpiredCode)
        );
    }
}
