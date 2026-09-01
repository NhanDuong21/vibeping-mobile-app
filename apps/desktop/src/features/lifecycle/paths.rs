use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};
use chrono::Utc;
use serde::{Serialize, de::DeserializeOwned};
use uuid::Uuid;

use super::model::{RuntimeMetadata, UserIntent};

const MAX_SPOOL_FILES: usize = 256;
const MAX_SPOOL_BYTES: u64 = 16 * 1024 * 1024;

#[derive(Clone, Debug)]
pub struct RuntimePaths {
    data_dir: PathBuf,
}

impl RuntimePaths {
    pub fn new(data_dir: PathBuf) -> Self {
        Self { data_dir }
    }

    pub fn ensure(&self) -> Result<()> {
        fs::create_dir_all(self.data_dir()).context("Không tạo được thư mục vận hành")?;
        fs::create_dir_all(self.logs_dir()).context("Không tạo được thư mục nhật ký")?;
        fs::create_dir_all(self.spool_dir()).context("Không tạo được hàng đợi sự cố")?;
        Ok(())
    }

    pub fn data_dir(&self) -> &Path {
        &self.data_dir
    }

    pub fn lock_file(&self) -> PathBuf {
        self.data_dir.join("instance.lock")
    }

    pub fn database_file(&self) -> PathBuf {
        self.data_dir.join("vibeping.sqlite3")
    }

    pub fn runtime_file(&self) -> PathBuf {
        self.data_dir.join("runtime.json")
    }

    pub fn intent_file(&self) -> PathBuf {
        self.data_dir.join("intent.json")
    }

    pub fn logs_dir(&self) -> PathBuf {
        self.data_dir.join("logs")
    }

    pub fn spool_dir(&self) -> PathBuf {
        self.data_dir.join("spool")
    }

    pub fn read_metadata(&self) -> Result<Option<RuntimeMetadata>> {
        read_json(&self.runtime_file())
    }

    pub fn write_metadata(&self, metadata: &RuntimeMetadata) -> Result<()> {
        write_json(&self.runtime_file(), metadata)
    }

    pub fn clear_metadata(&self) -> Result<()> {
        let path = self.runtime_file();
        if path.is_file() {
            fs::remove_file(path).context("Không dọn được trạng thái chạy cũ")?;
        }
        Ok(())
    }

    pub fn write_intent(&self, enabled: bool) -> Result<()> {
        write_json(
            &self.intent_file(),
            &UserIntent {
                enabled,
                updated_at: Utc::now(),
            },
        )
    }

    pub fn is_enabled(&self) -> bool {
        read_json::<UserIntent>(&self.intent_file())
            .ok()
            .flatten()
            .is_some_and(|intent| intent.enabled)
    }

    pub fn spool(&self, bytes: &[u8]) -> Result<()> {
        self.ensure()?;
        let incoming = self.spool_dir().join("incoming");
        fs::create_dir_all(&incoming).context("Không mở được hàng đợi sự cố")?;
        let (count, total) = spool_usage(&incoming)?;
        if count >= MAX_SPOOL_FILES || total + bytes.len() as u64 > MAX_SPOOL_BYTES {
            anyhow::bail!("Hàng đợi sự cố đã đầy")
        }
        let id = Uuid::new_v4().to_string();
        let temporary = incoming.join(format!(".{id}.tmp"));
        let target = incoming.join(format!("{id}.json"));
        let mut file = File::create(&temporary).context("Không tạo được mục chờ")?;
        file.write_all(bytes).context("Không lưu được mục chờ")?;
        file.sync_all().context("Không hoàn tất được mục chờ")?;
        fs::rename(temporary, target).context("Không chốt được mục chờ")
    }

    pub fn pending_files(&self) -> Result<Vec<PathBuf>> {
        let pending = self.spool_dir().join("pending");
        fs::create_dir_all(&pending).context("Không mở được hàng đợi khôi phục")?;
        let mut files = fs::read_dir(pending)
            .context("Không đọc được hàng đợi khôi phục")?
            .filter_map(|entry| entry.ok().map(|value| value.path()))
            .filter(|path| path.is_file())
            .collect::<Vec<_>>();
        files.sort();
        Ok(files)
    }

    pub fn quarantine(&self, path: &Path) -> Result<()> {
        let directory = self.spool_dir().join("quarantine");
        fs::create_dir_all(&directory).context("Không mở được vùng cách ly")?;
        let name = path
            .file_name()
            .unwrap_or_else(|| std::ffi::OsStr::new("event.json"));
        fs::rename(path, directory.join(name)).context("Không cách ly được mục lỗi")
    }

    pub fn open_log(&self) -> Result<File> {
        self.ensure()?;
        let current = self.logs_dir().join("vibeping.log");
        rotate_if_needed(&current)?;
        OpenOptions::new()
            .create(true)
            .append(true)
            .open(current)
            .context("Không mở được nhật ký cục bộ")
    }

    pub fn drain_spool(&self) -> Result<usize> {
        let incoming = self.spool_dir().join("incoming");
        let pending = self.spool_dir().join("pending");
        fs::create_dir_all(&incoming).context("Không mở được hàng đợi sự cố")?;
        fs::create_dir_all(&pending).context("Không mở được hàng đợi khôi phục")?;
        let mut drained = 0;
        for entry in fs::read_dir(incoming).context("Không đọc được hàng đợi sự cố")?
        {
            let path = entry.context("Không đọc được mục chờ")?.path();
            if !path.is_file() {
                continue;
            }
            let name = path
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or("event");
            fs::rename(&path, pending.join(format!("{}-{name}", Uuid::new_v4())))
                .context("Không khôi phục được mục đang chờ")?;
            drained += 1;
        }
        Ok(drained)
    }
}

fn spool_usage(directory: &Path) -> Result<(usize, u64)> {
    let mut count = 0;
    let mut total = 0;
    for entry in fs::read_dir(directory).context("Không kiểm tra được hàng đợi sự cố")?
    {
        let entry = entry.context("Không đọc được mục chờ")?;
        if entry.path().is_file() {
            count += 1;
            total += entry.metadata().map(|value| value.len()).unwrap_or(0);
        }
    }
    Ok((count, total))
}

fn write_json(path: &Path, value: &impl Serialize) -> Result<()> {
    let bytes =
        serde_json::to_vec_pretty(value).context("Không chuẩn bị được trạng thái cục bộ")?;
    let mut file = File::create(path).context("Không lưu được trạng thái cục bộ")?;
    file.write_all(&bytes)
        .context("Không ghi được trạng thái cục bộ")?;
    file.sync_all().context("Không hoàn tất trạng thái cục bộ")
}

fn read_json<T: DeserializeOwned>(path: &Path) -> Result<Option<T>> {
    if !path.is_file() {
        return Ok(None);
    }
    let bytes = fs::read(path).context("Không đọc được trạng thái cục bộ")?;
    serde_json::from_slice(&bytes)
        .map(Some)
        .context("Trạng thái cục bộ không còn hợp lệ")
}

fn rotate_if_needed(current: &Path) -> Result<()> {
    if current.metadata().map(|value| value.len()).unwrap_or(0) < 1_048_576 {
        return Ok(());
    }
    for index in (1..=3).rev() {
        let source = if index == 1 {
            current.to_path_buf()
        } else {
            current.with_file_name(format!("vibeping.{}.log", index - 1))
        };
        let target = current.with_file_name(format!("vibeping.{index}.log"));
        if target.is_file() {
            fs::remove_file(&target).context("Không xoay được nhật ký cũ")?;
        }
        if source.is_file() {
            fs::rename(source, target).context("Không xoay được nhật ký cục bộ")?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::*;

    #[test]
    fn intent_and_spool_survive_paths_with_spaces() {
        let temp = tempdir().unwrap();
        let paths = RuntimePaths::new(temp.path().join("thư mục có khoảng trắng"));
        paths.ensure().unwrap();
        paths.write_intent(true).unwrap();
        let incoming = paths.spool_dir().join("incoming");
        fs::create_dir_all(&incoming).unwrap();
        fs::write(incoming.join("event.json"), b"{}").unwrap();
        assert_eq!(paths.drain_spool().unwrap(), 1);
        assert_eq!(
            fs::read_dir(paths.spool_dir().join("pending"))
                .unwrap()
                .count(),
            1
        );
    }
}
