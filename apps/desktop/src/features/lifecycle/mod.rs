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
pub use command::{DataOptions, HostOptions, LifecycleCommand, execute};
pub use ingress::{IngressDelivery, deliver_ingress};
pub use model::{DoctorReport, LifecycleStatus};
pub use paths::RuntimePaths;
