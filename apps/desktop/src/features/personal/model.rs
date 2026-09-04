use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Deserialize, Serialize, ToSchema, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct PersonalRules {
    pub completion_min_minutes: i32,
    pub waiting_reminder_minutes: i32,
}

impl PersonalRules {
    pub fn validate(&self) -> bool {
        matches!(self.completion_min_minutes, 0 | 2 | 5)
            && matches!(self.waiting_reminder_minutes, 0 | 5 | 10)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, ToSchema, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ProjectProfile {
    pub project_name: String,
    pub display_name: String,
    pub icon: String,
    pub accent: String,
    pub notify_completion: bool,
    pub notify_permission: bool,
    pub notify_preview: bool,
    pub notify_final_failure: bool,
    pub completion_min_minutes: Option<i32>,
    pub waiting_reminder_minutes: Option<i32>,
}

impl ProjectProfile {
    pub fn validate(&self) -> bool {
        let name = self.display_name.trim();
        !name.is_empty()
            && name.chars().count() <= 60
            && crate::features::notifications::safe_label(name).as_deref() == Some(name)
            && matches!(
                self.icon.as_str(),
                "cat" | "heart" | "book" | "code" | "spark"
            )
            && matches!(
                self.accent.as_str(),
                "mint" | "blue" | "green" | "amber" | "coral"
            )
            && self
                .completion_min_minutes
                .is_none_or(|v| matches!(v, 0 | 2 | 5))
            && self
                .waiting_reminder_minutes
                .is_none_or(|v| matches!(v, 0 | 5 | 10))
    }
}
