use axum::http::HeaderMap;

use crate::{app::ApplicationState, infrastructure::web::error::ApiError};

use super::{PairingStore, identity::RequestIdentity};

pub async fn authorize_if_claimed(
    state: &ApplicationState,
    headers: &HeaderMap,
) -> Result<(), ApiError> {
    authorize_owner(state, headers, false).await
}

pub async fn require_owner(state: &ApplicationState, headers: &HeaderMap) -> Result<(), ApiError> {
    authorize_owner(state, headers, true).await
}

async fn authorize_owner(
    state: &ApplicationState,
    headers: &HeaderMap,
    pairing_required: bool,
) -> Result<(), ApiError> {
    let owner = PairingStore::new(state.database.clone())
        .owner_login()
        .await
        .map_err(|_| ApiError::unavailable("PAIRING_UNAVAILABLE"))?;
    let identity = RequestIdentity::from_headers(headers);
    validate_owner(owner.as_deref(), identity.as_ref(), pairing_required)
}

fn validate_owner(
    owner: Option<&str>,
    identity: Option<&RequestIdentity>,
    pairing_required: bool,
) -> Result<(), ApiError> {
    let Some(owner) = owner else {
        return if pairing_required {
            Err(ApiError::forbidden("PAIRING_REQUIRED"))
        } else {
            Ok(())
        };
    };
    let identity = identity.ok_or_else(|| ApiError::unauthorized("PRIVATE_IDENTITY_REQUIRED"))?;
    if identity.login() == owner {
        Ok(())
    } else {
        Err(ApiError::forbidden("OWNER_REQUIRED"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unclaimed_read_is_available_but_mutation_requires_pairing() {
        assert!(validate_owner(None, None, false).is_ok());
        assert!(validate_owner(None, None, true).is_err());
    }

    #[test]
    fn claimed_data_requires_the_matching_tailnet_owner() {
        let owner = RequestIdentity::for_test("owner@example.test");
        let visitor = RequestIdentity::for_test("visitor@example.test");

        assert!(validate_owner(Some(owner.login()), None, false).is_err());
        assert!(validate_owner(Some(owner.login()), Some(&visitor), false).is_err());
        assert!(validate_owner(Some(owner.login()), Some(&owner), true).is_ok());
    }
}
