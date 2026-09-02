pub mod http;
mod model;
pub(crate) mod policy;
mod store;

pub use model::{NotificationPreferences, Preferences, QuietHours};
pub use store::PreferenceStore;

#[cfg(test)]
mod tests;
