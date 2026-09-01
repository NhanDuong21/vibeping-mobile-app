mod command;
mod ingress;
mod instance_lock;
mod ipc;
mod model;
mod paths;
mod process_support;
mod tailscale;

pub use command::{DataOptions, HostOptions, LifecycleCommand, execute};
pub use ingress::{IngressDelivery, deliver_ingress};
pub use model::{DoctorReport, LifecycleStatus};
pub use paths::RuntimePaths;
