use std::{fs, path::Path};

use anyhow::{Context, Result, bail};
use base64ct::{Base64, Base64UrlUnpadded, Encoding as _};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

const FORMAT: &str = "vibeping-backup-v1";
const MAX_BUNDLE_BYTES: u64 = 768 * 1024 * 1024;

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct BackupBundle {
    format: String,
    created_at: DateTime<Utc>,
    app_version: String,
    database_sha256: String,
    database: String,
    vapid_sha256: Option<String>,
    vapid: Option<String>,
}

pub struct DecodedBackup {
    pub database: Vec<u8>,
    pub vapid: Option<Vec<u8>>,
}

pub fn encode(database: &[u8], vapid: Option<&[u8]>) -> Result<Vec<u8>> {
    anyhow::ensure!(database.starts_with(b"SQLite format 3\0"));
    let bundle = BackupBundle {
        format: FORMAT.into(),
        created_at: Utc::now(),
        app_version: env!("CARGO_PKG_VERSION").into(),
        database_sha256: digest(database),
        database: Base64::encode_string(database),
        vapid_sha256: vapid.map(digest),
        vapid: vapid.map(Base64::encode_string),
    };
    serde_json::to_vec(&bundle).context("Không chuẩn bị được bản sao lưu")
}

pub fn decode(path: &Path) -> Result<DecodedBackup> {
    let metadata = fs::metadata(path).context("Không đọc được tệp sao lưu")?;
    if metadata.len() == 0 || metadata.len() > MAX_BUNDLE_BYTES {
        bail!("Tệp sao lưu không hợp lệ")
    }
    let bundle: BackupBundle =
        serde_json::from_slice(&fs::read(path).context("Không đọc được tệp sao lưu")?)
            .context("Tệp sao lưu không hợp lệ")?;
    anyhow::ensure!(bundle.format == FORMAT, "Tệp sao lưu không được hỗ trợ");
    let database = Base64::decode_vec(&bundle.database).context("Tệp sao lưu không hợp lệ")?;
    anyhow::ensure!(database.starts_with(b"SQLite format 3\0"));
    anyhow::ensure!(digest(&database) == bundle.database_sha256);
    let vapid = bundle
        .vapid
        .map(|value| Base64::decode_vec(&value))
        .transpose()
        .context("Tệp sao lưu không hợp lệ")?;
    anyhow::ensure!(vapid.as_deref().map(digest) == bundle.vapid_sha256);
    Ok(DecodedBackup { database, vapid })
}

fn digest(bytes: &[u8]) -> String {
    Base64UrlUnpadded::encode_string(&Sha256::digest(bytes))
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::*;

    #[test]
    fn bundle_detects_tampering_without_exposing_content() {
        let temp = tempdir().unwrap();
        let database = b"SQLite format 3\0private database";
        let path = temp.path().join("backup.vibeping-backup");
        fs::write(&path, encode(database, Some(b"private key")).unwrap()).unwrap();
        let decoded = decode(&path).unwrap();
        assert_eq!(decoded.database, database);
        assert_eq!(decoded.vapid.as_deref(), Some(b"private key".as_slice()));
        let mut changed = fs::read(&path).unwrap();
        let index = changed.len() / 2;
        changed[index] ^= 1;
        fs::write(&path, changed).unwrap();
        assert!(decode(&path).is_err());
    }
}
