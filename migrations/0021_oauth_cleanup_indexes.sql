CREATE INDEX IF NOT EXISTS idx_oauth_refresh_user_client ON oauth_refresh_tokens(user_id, client_id);
