use std::{fs::OpenOptions, path::Path};

use anyhow::{Context, Result, bail};
use fs2::FileExt;

pub struct InstanceLock {
    _file: std::fs::File,
}

impl InstanceLock {
    pub fn acquire(path: &Path) -> Result<Self> {
        let file = OpenOptions::new()
            .create(true)
            .truncate(false)
            .read(true)
            .write(true)
            .open(path)
            .context("Không mở được khóa chạy duy nhất")?;
        if file.try_lock_exclusive().is_err() {
            bail!("VibePing đang chạy")
        }
        Ok(Self { _file: file })
    }
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::*;

    #[test]
    fn second_lock_is_rejected() {
        let temp = tempdir().unwrap();
        let path = temp.path().join("instance.lock");
        let _first = InstanceLock::acquire(&path).unwrap();
        assert!(InstanceLock::acquire(&path).is_err());
    }
}
