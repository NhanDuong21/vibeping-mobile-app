use std::fs;

use anyhow::{Context, Result, anyhow};
use base64ct::{Base64UrlUnpadded, Encoding as _};
use serde::{Deserialize, Serialize};
use web_push_native::jwt_simple::algorithms::{ECDSAP256KeyPairLike, ES256KeyPair};

use crate::{models::PushSubscription, paths::Gate0Paths};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredVapid {
    private_key: String,
}

pub fn create_or_load_vapid(paths: &Gate0Paths) -> Result<ES256KeyPair> {
    paths.ensure_data_dir()?;
    let path = paths.vapid_file();
    if path.is_file() {
        let stored: StoredVapid = serde_json::from_slice(
            &fs::read(&path).context("could not read saved sender identity")?,
        )
        .context("saved sender identity is malformed")?;
        let bytes = Base64UrlUnpadded::decode_vec(&stored.private_key)
            .context("saved sender identity is malformed")?;
        return ES256KeyPair::from_bytes(&bytes).context("saved sender identity is invalid");
    }

    let key_pair = ES256KeyPair::generate();
    let stored = StoredVapid {
        private_key: Base64UrlUnpadded::encode_string(&key_pair.to_bytes()),
    };
    let encoded = serde_json::to_vec_pretty(&stored)?;
    fs::write(&path, encoded).context("could not persist sender identity")?;
    Ok(key_pair)
}

pub fn public_key_base64(key_pair: &ES256KeyPair) -> String {
    Base64UrlUnpadded::encode_string(&key_pair.key_pair().public_key().to_bytes_uncompressed())
}

pub fn save_subscription(paths: &Gate0Paths, subscription: &PushSubscription) -> Result<()> {
    validate_subscription(subscription).map_err(|message| anyhow!(message))?;
    paths.ensure_data_dir()?;
    let encoded = serde_json::to_vec_pretty(subscription)?;
    fs::write(paths.subscription_file(), encoded).context("could not save phone registration")
}

pub fn load_subscription(paths: &Gate0Paths) -> Result<PushSubscription> {
    let bytes = fs::read(paths.subscription_file()).context("phone registration is missing")?;
    let subscription: PushSubscription =
        serde_json::from_slice(&bytes).context("phone registration is malformed")?;
    validate_subscription(&subscription).map_err(|message| anyhow!(message))?;
    Ok(subscription)
}

pub fn remove_subscription(paths: &Gate0Paths) -> Result<()> {
    match fs::remove_file(paths.subscription_file()) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error).context("could not remove phone registration"),
    }
}

pub fn validate_subscription(subscription: &PushSubscription) -> Result<(), &'static str> {
    if !subscription.endpoint.starts_with("https://") || subscription.endpoint.len() > 4096 {
        return Err("phone registration endpoint is invalid");
    }
    if subscription.keys.p256dh.is_empty() || subscription.keys.p256dh.len() > 1024 {
        return Err("phone registration public key is invalid");
    }
    if subscription.keys.auth.is_empty() || subscription.keys.auth.len() > 256 {
        return Err("phone registration authentication key is invalid");
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use chrono::Utc;
    use tempfile::tempdir;

    use super::*;
    use crate::models::SubscriptionKeys;

    fn paths() -> (tempfile::TempDir, Gate0Paths) {
        let temp = tempdir().expect("temporary directory");
        let paths = Gate0Paths::for_test(temp.path().join("data"), temp.path().join("web"));
        (temp, paths)
    }

    #[test]
    fn sender_identity_is_reused() {
        let (_temp, paths) = paths();
        let first = create_or_load_vapid(&paths).expect("first identity");
        let second = create_or_load_vapid(&paths).expect("second identity");
        assert_eq!(public_key_base64(&first), public_key_base64(&second));
    }

    #[test]
    fn browser_public_key_uses_uncompressed_p256_form() {
        let (_temp, paths) = paths();
        let key_pair = create_or_load_vapid(&paths).expect("sender identity");
        let bytes = Base64UrlUnpadded::decode_vec(&public_key_base64(&key_pair))
            .expect("browser public key");
        assert_eq!(bytes.len(), 65);
        assert_eq!(bytes[0], 0x04);
    }

    #[test]
    fn registration_requires_https() {
        let subscription = PushSubscription {
            endpoint: "http://example.test/push".into(),
            expiration_time: None,
            keys: SubscriptionKeys {
                p256dh: "key".into(),
                auth: "auth".into(),
            },
            saved_at: Utc::now(),
        };
        assert!(validate_subscription(&subscription).is_err());
    }

    #[test]
    fn phone_registration_survives_a_reload() {
        let (_temp, paths) = paths();
        let subscription = PushSubscription {
            endpoint: "https://push.example.test/registration".into(),
            expiration_time: None,
            keys: SubscriptionKeys {
                p256dh: "public-client-key".into(),
                auth: "authentication-secret".into(),
            },
            saved_at: Utc::now(),
        };
        save_subscription(&paths, &subscription).expect("save phone registration");
        assert_eq!(
            load_subscription(&paths).expect("reload phone registration"),
            subscription
        );
    }
}
