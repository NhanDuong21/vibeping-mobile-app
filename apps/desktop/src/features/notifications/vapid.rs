use std::{
    fs,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};
use base64ct::{Base64UrlUnpadded, Encoding as _};
use serde::{Deserialize, Serialize};
use web_push_native::jwt_simple::algorithms::{ECDSAP256KeyPairLike, ES256KeyPair};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredVapid {
    private_key: String,
}

pub struct VapidIdentity {
    key_pair: ES256KeyPair,
    public_key: String,
}

impl VapidIdentity {
    pub fn load_or_create(data_dir: &Path) -> Result<Self> {
        let path = vapid_path(data_dir);
        let key_pair = if path.is_file() {
            read_key(&path)?
        } else {
            let key_pair = ES256KeyPair::generate();
            persist_key(&path, &key_pair)?;
            key_pair
        };
        let public_key = Base64UrlUnpadded::encode_string(
            &key_pair.key_pair().public_key().to_bytes_uncompressed(),
        );
        Ok(Self {
            key_pair,
            public_key,
        })
    }

    pub fn public_key(&self) -> &str {
        &self.public_key
    }

    pub fn key_pair(&self) -> &ES256KeyPair {
        &self.key_pair
    }
}

pub fn vapid_path(data_dir: &Path) -> PathBuf {
    data_dir.join("secrets").join("vapid.json")
}

fn read_key(path: &Path) -> Result<ES256KeyPair> {
    let stored: StoredVapid =
        serde_json::from_slice(&fs::read(path).context("Không đọc được danh tính gửi thông báo")?)
            .context("Danh tính gửi thông báo không hợp lệ")?;
    let bytes = Base64UrlUnpadded::decode_vec(&stored.private_key)
        .context("Danh tính gửi thông báo không hợp lệ")?;
    ES256KeyPair::from_bytes(&bytes).context("Danh tính gửi thông báo không hợp lệ")
}

fn persist_key(path: &Path, key_pair: &ES256KeyPair) -> Result<()> {
    let parent = path
        .parent()
        .context("Không xác định được thư mục bí mật")?;
    fs::create_dir_all(parent).context("Không tạo được thư mục bí mật")?;
    let stored = StoredVapid {
        private_key: Base64UrlUnpadded::encode_string(&key_pair.to_bytes()),
    };
    fs::write(path, serde_json::to_vec_pretty(&stored)?)
        .context("Không lưu được danh tính gửi thông báo")
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::*;

    #[test]
    fn identity_is_persistent_and_browser_key_is_uncompressed() {
        let temp = tempdir().unwrap();
        let first = VapidIdentity::load_or_create(temp.path()).unwrap();
        let public = first.public_key().to_owned();
        drop(first);
        let second = VapidIdentity::load_or_create(temp.path()).unwrap();
        assert_eq!(second.public_key(), public);
        let bytes = Base64UrlUnpadded::decode_vec(second.public_key()).unwrap();
        assert_eq!((bytes.len(), bytes[0]), (65, 4));
    }
}
