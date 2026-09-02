UPDATE preferences
SET theme = 'light', updated_at = CURRENT_TIMESTAMP
WHERE theme = 'system';
