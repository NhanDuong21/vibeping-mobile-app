mod classifier;
pub mod command;
mod configuration;
mod current_work;
mod daily_summary;
pub use daily_summary::DailySummary;
mod detail;
mod event_store;
mod feed;
pub mod http;
mod installer;
mod model;
mod result_content;
mod result_store;
mod session_feed;
mod session_stages;
mod store;
mod task_metadata;
mod turn_state;

pub use classifier::normalize;
pub(crate) use installer::runtime_executable;
pub use model::{
    ActivityEvent, ActivityEventDetail, ActivitySnapshot, ActivityTimelineStage, CodexIngress,
    CodexSignal, CurrentWork, EventFeed, ReadStateResponse, WorkSession,
};
pub use result_content::CodexResult;
pub use store::ActivityStore;

#[cfg(test)]
mod tests;

#[cfg(test)]
mod turn_state_tests;

#[cfg(test)]
mod result_tests;

#[cfg(test)]
mod session_tests;
