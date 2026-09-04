mod command;
mod ingress;
mod instance_lock;
mod ipc;
mod model;
mod paths;
mod permissions;
mod process_support;
mod tailscale;

pub(crate) use command::ensure_stopped;
pub(crate) use command::recover;
pub use command::{DataOptions, HostOptions, LifecycleCommand, execute};
pub use ingress::{IngressDelivery, deliver_ingress};
pub(crate) use instance_lock::InstanceLock;
pub(crate) use ipc::health_ready;
pub use model::{DoctorReport, LifecycleStatus};
pub use paths::RuntimePaths;
pub(crate) use process_support::spawn_detached;
#[cfg(windows)]
pub(crate) use process_support::windows_command_line;
