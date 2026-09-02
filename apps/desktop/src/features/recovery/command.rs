use std::{fs, io::Write, path::PathBuf};

use anyhow::{Context, Result, bail};
use chrono::Utc;
use clap::Args;

use crate::{
    RuntimeConfig,
    features::{
        lifecycle::{RuntimePaths, ensure_stopped},
        notifications::vapid_path,
    },
    infrastructure::database,
};

use super::bundle;

#[derive(Clone, Debug, Args)]
pub struct BackupArgs {
    #[arg(long, help = "Thư mục dữ liệu cục bộ")]
    data_dir: Option<PathBuf>,
}

#[derive(Clone, Debug, Args)]
pub struct RestoreArgs {
    #[arg(long, help = "Tệp sao lưu VibePing")]
    file: PathBuf,
    #[arg(long, help = "Xác nhận thay dữ liệu hiện tại")]
    confirm: bool,
    #[arg(long, help = "Thư mục dữ liệu cục bộ")]
    data_dir: Option<PathBuf>,
}

#[derive(Clone, Debug, Args)]
pub struct ResetNotificationsArgs {
    #[arg(long, help = "Xác nhận xóa đăng ký thông báo hiện tại")]
    confirm: bool,
    #[arg(long, help = "Thư mục dữ liệu cục bộ")]
    data_dir: Option<PathBuf>,
}

pub async fn backup(args: BackupArgs) -> Result<String> {
    let paths = paths_for(args.data_dir)?;
    paths.ensure()?;
    ensure_stopped(&paths).await?;
    let pool = database::connect(&paths.database_file()).await?;
    sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
        .execute(&pool)
        .await
        .context("Không chuẩn bị được dữ liệu sao lưu")?;
    pool.close().await;
    let database = fs::read(paths.database_file()).context("Không đọc được dữ liệu sao lưu")?;
    let vapid = fs::read(vapid_path(paths.data_dir())).ok();
    let bytes = bundle::encode(&database, vapid.as_deref())?;
    let directory = paths.data_dir().join("backups").join("manual");
    fs::create_dir_all(&directory).context("Không tạo được thư mục sao lưu")?;
    let target = directory.join(format!(
        "vibeping-{}.vibeping-backup",
        Utc::now().format("%Y%m%dT%H%M%SZ")
    ));
    write_atomic(&target, &bytes)?;
    Ok(format!("Đã tạo bản sao lưu: {}", target.display()))
}

pub async fn restore(args: RestoreArgs) -> Result<String> {
    if !args.confirm {
        bail!("Thêm --confirm để xác nhận thay dữ liệu hiện tại")
    }
    let paths = paths_for(args.data_dir)?;
    paths.ensure()?;
    ensure_stopped(&paths).await?;
    let decoded = bundle::decode(&args.file)?;
    let previous_database = paths
        .database_file()
        .is_file()
        .then(|| database::backup_file(&paths.database_file()))
        .transpose()?;
    let previous_vapid = fs::read(vapid_path(paths.data_dir())).ok();
    apply_restore(&paths, &decoded)?;
    match database::connect(&paths.database_file()).await {
        Ok(pool) => pool.close().await,
        Err(error) => {
            rollback_restore(
                &paths,
                previous_database.as_deref(),
                previous_vapid.as_deref(),
            )?;
            return Err(error).context("Bản sao lưu chưa thể khôi phục an toàn");
        }
    }
    Ok("Đã khôi phục dữ liệu. Hãy khởi động VibePing.".into())
}

pub async fn reset_notifications(args: ResetNotificationsArgs) -> Result<String> {
    if !args.confirm {
        bail!("Thêm --confirm để xác nhận xóa đăng ký thông báo hiện tại")
    }
    let paths = paths_for(args.data_dir)?;
    paths.ensure()?;
    ensure_stopped(&paths).await?;
    let pool = database::connect(&paths.database_file()).await?;
    let mut transaction = pool
        .begin()
        .await
        .context("Không mở được dữ liệu thông báo")?;
    sqlx::query("DELETE FROM notification_jobs")
        .execute(&mut *transaction)
        .await
        .context("Không dọn được hàng đợi thông báo")?;
    sqlx::query("DELETE FROM push_subscriptions")
        .execute(&mut *transaction)
        .await
        .context("Không dọn được đăng ký thông báo")?;
    sqlx::query("UPDATE mobile_devices SET notification_permission = 'default'")
        .execute(&mut *transaction)
        .await
        .context("Không đặt lại trạng thái thông báo")?;
    transaction
        .commit()
        .await
        .context("Không hoàn tất được đặt lại")?;
    pool.close().await;
    Ok("Đã đặt lại thông báo. Mở Cài đặt trên iPhone để đăng ký lại.".into())
}

fn apply_restore(paths: &RuntimePaths, decoded: &bundle::DecodedBackup) -> Result<()> {
    let incoming = paths.data_dir().join("restore-incoming.sqlite3");
    write_atomic(&incoming, &decoded.database)?;
    database::restore_file(&paths.database_file(), &incoming)?;
    let _ = fs::remove_file(incoming);
    let vapid = vapid_path(paths.data_dir());
    if let Some(bytes) = decoded.vapid.as_deref() {
        if let Some(parent) = vapid.parent() {
            fs::create_dir_all(parent).context("Không tạo được thư mục bí mật")?;
        }
        write_atomic(&vapid, bytes)?;
    }
    Ok(())
}

fn rollback_restore(
    paths: &RuntimePaths,
    database_backup: Option<&std::path::Path>,
    vapid_backup: Option<&[u8]>,
) -> Result<()> {
    if let Some(backup) = database_backup {
        database::restore_file(&paths.database_file(), backup)?;
    } else if paths.database_file().is_file() {
        fs::remove_file(paths.database_file()).context("Không dọn được lần khôi phục lỗi")?;
    }
    if let Some(bytes) = vapid_backup {
        write_atomic(&vapid_path(paths.data_dir()), bytes)?;
    }
    Ok(())
}

fn write_atomic(path: &std::path::Path, bytes: &[u8]) -> Result<()> {
    let temporary = path.with_extension("tmp");
    let mut file = fs::File::create(&temporary).context("Không tạo được tệp tạm")?;
    file.write_all(bytes).context("Không ghi được tệp tạm")?;
    file.sync_all().context("Không hoàn tất được tệp tạm")?;
    if path.is_file() {
        fs::remove_file(path).context("Không thay được tệp cũ")?;
    }
    fs::rename(temporary, path).context("Không chốt được tệp mới")
}

fn paths_for(data_dir: Option<PathBuf>) -> Result<RuntimePaths> {
    let config = RuntimeConfig::discover(8790, data_dir)?;
    Ok(RuntimePaths::new(config.data_dir().to_path_buf()))
}
