use std::{env, path::PathBuf};

use anyhow::{Context, Result, bail};

#[derive(Clone, Debug)]
pub struct Gate0Paths {
    data_dir: PathBuf,
    web_dir: PathBuf,
}

impl Gate0Paths {
    pub fn discover() -> Result<Self> {
        let data_dir = match env::var_os("VIBEPING_GATE0_DATA_DIR") {
            Some(value) => PathBuf::from(value),
            None => {
                let local = env::var_os("LOCALAPPDATA").context("LOCALAPPDATA is unavailable")?;
                PathBuf::from(local).join("VibePing").join("Gate0")
            }
        };
        let web_dir = discover_web_dir()?;
        Ok(Self { data_dir, web_dir })
    }

    #[cfg(test)]
    pub fn for_test(data_dir: PathBuf, web_dir: PathBuf) -> Self {
        Self { data_dir, web_dir }
    }

    pub fn ensure_data_dir(&self) -> Result<()> {
        std::fs::create_dir_all(&self.data_dir)
            .with_context(|| format!("could not create {}", self.data_dir.display()))
    }

    pub fn vapid_file(&self) -> PathBuf {
        self.data_dir.join("vapid.json")
    }

    pub fn subscription_file(&self) -> PathBuf {
        self.data_dir.join("subscription.json")
    }

    pub fn web_dir(&self) -> &std::path::Path {
        &self.web_dir
    }
}

fn discover_web_dir() -> Result<PathBuf> {
    if let Some(value) = env::var_os("VIBEPING_GATE0_WEB_DIR") {
        return checked_web_dir(PathBuf::from(value));
    }
    let cwd = env::current_dir().context("could not determine current directory")?;
    let candidates = [
        cwd.join("spikes/tailscale-web-push/web"),
        cwd.join("web"),
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("web"),
    ];
    for candidate in candidates {
        if candidate.join("index.html").is_file() {
            return Ok(candidate);
        }
    }
    bail!("Gate 0 web directory was not found")
}

fn checked_web_dir(path: PathBuf) -> Result<PathBuf> {
    if path.join("index.html").is_file() {
        Ok(path)
    } else {
        bail!("Gate 0 web directory does not contain index.html")
    }
}
