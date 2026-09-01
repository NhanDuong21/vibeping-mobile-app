mod command;
mod instance_lock;
mod ipc;
mod model;
mod paths;
mod process_support;
mod tailscale;

pub use command::{LifecycleCommand, execute};
pub use model::{DoctorReport, LifecycleStatus};
pub use paths::RuntimePaths;
