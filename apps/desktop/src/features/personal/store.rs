use super::{PersonalRules, ProjectProfile};
use anyhow::{Result, bail};
use sqlx::SqlitePool;

#[derive(Clone)]
pub struct PersonalStore {
    pool: SqlitePool,
}
impl PersonalStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
    pub async fn rules(&self) -> Result<PersonalRules> {
        Ok(sqlx::query_as("SELECT completion_min_minutes, waiting_reminder_minutes FROM personal_rules WHERE id = 1").fetch_one(&self.pool).await?)
    }
    pub async fn save_rules(&self, value: &PersonalRules) -> Result<PersonalRules> {
        if !value.validate() {
            bail!("PERSONAL_INVALID");
        }
        sqlx::query("UPDATE personal_rules SET completion_min_minutes = ?, waiting_reminder_minutes = ? WHERE id = 1")
            .bind(value.completion_min_minutes).bind(value.waiting_reminder_minutes).execute(&self.pool).await?;
        self.rules().await
    }
    pub async fn projects(&self) -> Result<Vec<ProjectProfile>> {
        Ok(sqlx::query_as(
            "WITH names AS (SELECT DISTINCT project_name FROM codex_turns UNION SELECT project_name FROM project_profiles) \
            SELECT n.project_name, COALESCE(p.display_name, n.project_name) AS display_name, COALESCE(p.icon, 'cat') AS icon, \
            COALESCE(p.accent, 'mint') AS accent, COALESCE(p.notify_completion, g.notify_completion) AS notify_completion, \
            COALESCE(p.notify_permission, g.notify_permission) AS notify_permission, COALESCE(p.notify_preview, g.notify_preview) AS notify_preview, \
            COALESCE(p.notify_final_failure, g.notify_final_failure) AS notify_final_failure, p.completion_min_minutes, p.waiting_reminder_minutes \
            FROM names n LEFT JOIN project_profiles p ON p.project_name = n.project_name JOIN preferences g ON g.id = 1 \
            WHERE n.project_name != '' ORDER BY display_name COLLATE NOCASE LIMIT 200"
        ).fetch_all(&self.pool).await?)
    }
    pub async fn save_project(&self, value: &ProjectProfile) -> Result<ProjectProfile> {
        if !value.validate() {
            bail!("PERSONAL_INVALID");
        }
        let known: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM codex_turns WHERE project_name = ? UNION SELECT 1 FROM project_profiles WHERE project_name = ?)")
            .bind(&value.project_name).bind(&value.project_name).fetch_one(&self.pool).await?;
        if !known {
            bail!("PERSONAL_INVALID");
        }
        sqlx::query("INSERT INTO project_profiles VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(project_name) DO UPDATE SET \
            display_name = excluded.display_name, icon = excluded.icon, accent = excluded.accent, notify_completion = excluded.notify_completion, \
            notify_permission = excluded.notify_permission, notify_preview = excluded.notify_preview, notify_final_failure = excluded.notify_final_failure, \
            completion_min_minutes = excluded.completion_min_minutes, waiting_reminder_minutes = excluded.waiting_reminder_minutes")
            .bind(&value.project_name).bind(value.display_name.trim()).bind(&value.icon).bind(&value.accent)
            .bind(value.notify_completion).bind(value.notify_permission).bind(value.notify_preview).bind(value.notify_final_failure)
            .bind(value.completion_min_minutes).bind(value.waiting_reminder_minutes).execute(&self.pool).await?;
        Ok(ProjectProfile {
            display_name: value.display_name.trim().to_owned(),
            ..value.clone()
        })
    }
}
