mod classifier;
pub mod command;
mod configuration;
mod feed;
pub mod http;
mod installer;
mod model;
mod store;

pub use classifier::normalize;
pub(crate) use installer::runtime_executable;
pub use model::{
    ActivityEvent, ActivitySnapshot, CodexIngress, CodexSignal, CurrentWork, EventFeed,
    ReadStateResponse,
};
pub use store::ActivityStore;

#[cfg(test)]
mod tests;
