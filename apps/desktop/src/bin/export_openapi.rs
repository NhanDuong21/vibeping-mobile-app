use std::{env, fs, path::PathBuf};

use anyhow::{Context, Result};
use utoipa::OpenApi;
use vibeping::openapi::ApiDoc;

fn main() -> Result<()> {
    let output = env::args_os()
        .nth(1)
        .map(PathBuf::from)
        .context("Thiếu đường dẫn OpenAPI đầu ra")?;
    if let Some(parent) = output.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(output, ApiDoc::openapi().to_pretty_json()?)?;
    Ok(())
}
