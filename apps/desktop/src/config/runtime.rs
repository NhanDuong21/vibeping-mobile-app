use std::{env, net::SocketAddr, path::PathBuf};

use anyhow::{Context, Result};

#[derive(Clone, Debug)]
pub struct RuntimeConfig {
    bind_address: SocketAddr,
    data_dir: PathBuf,
}

impl RuntimeConfig {
    pub fn discover(port: u16, data_dir: Option<PathBuf>) -> Result<Self> {
        let data_dir = match data_dir {
            Some(path) => path,
            None => default_data_dir()?,
        };
        Ok(Self {
            bind_address: SocketAddr::from(([127, 0, 0, 1], port)),
            data_dir,
        })
    }

    pub fn bind_address(&self) -> SocketAddr {
        self.bind_address
    }

    pub fn database_path(&self) -> PathBuf {
        self.data_dir.join("vibeping.sqlite3")
    }

    pub fn data_dir(&self) -> &std::path::Path {
        &self.data_dir
    }
}

fn default_data_dir() -> Result<PathBuf> {
    let local = env::var_os("LOCALAPPDATA").context("Không tìm thấy thư mục dữ liệu Windows")?;
    Ok(PathBuf::from(local).join("VibePing"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn listener_is_always_loopback() {
        let config = RuntimeConfig::discover(8790, Some(PathBuf::from("test"))).unwrap();
        assert!(config.bind_address().ip().is_loopback());
    }
}
