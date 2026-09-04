use anyhow::Result;
use sqlx::{Sqlite, Transaction};

use super::{ActivityStore, ThreadIdentity};

impl ActivityStore {
    pub(super) async fn retained_thread_keys(&self) -> Result<Vec<String>> {
        Ok(sqlx::query_scalar(
            "SELECT DISTINCT session_key FROM codex_turns WHERE session_key <> ''",
        )
        .fetch_all(&self.pool)
        .await?)
    }

    pub(super) async fn has_unresolved_threads(&self) -> Result<bool> {
        Ok(sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM codex_turns t WHERE t.session_key <> '' AND NOT EXISTS \
             (SELECT 1 FROM codex_thread_identity i WHERE i.thread_key = t.session_key))",
        )
        .fetch_one(&self.pool)
        .await?)
    }

    pub(super) async fn remember_identities(
        &self,
        identities: &[(String, ThreadIdentity)],
    ) -> Result<bool> {
        let mut transaction = self.pool.begin().await?;
        let mut changed = false;
        for (key, identity) in identities {
            changed |= remember(&mut transaction, key, identity).await?;
        }
        transaction.commit().await?;
        Ok(changed)
    }

    pub(super) async fn conversation_key(&self, key: &str) -> Result<String> {
        Ok(
            sqlx::query_scalar("SELECT root_key FROM codex_thread_identity WHERE thread_key = ?")
                .bind(key)
                .fetch_optional(&self.pool)
                .await?
                .unwrap_or_else(|| key.to_owned()),
        )
    }
}

pub(super) async fn remember(
    transaction: &mut Transaction<'_, Sqlite>,
    key: &str,
    identity: &ThreadIdentity,
) -> Result<bool> {
    // Missing metadata is never allowed to erase a previously verified link.
    let result = sqlx::query(
        "INSERT INTO codex_thread_identity (thread_key, root_key, title) VALUES (?, ?, ?) \
         ON CONFLICT(thread_key) DO UPDATE SET root_key = excluded.root_key, \
         title = COALESCE(excluded.title, codex_thread_identity.title) \
         WHERE (root_key = thread_key OR excluded.root_key <> excluded.thread_key) AND \
         (root_key <> excluded.root_key OR (excluded.title IS NOT NULL AND title IS NOT excluded.title))",
    ).bind(key).bind(&identity.root_key).bind(&identity.title)
        .execute(&mut **transaction).await?;
    Ok(result.rows_affected() > 0)
}
