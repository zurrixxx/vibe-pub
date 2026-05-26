-- Mark collections created via CLI/MCP/API (for profile filters).
ALTER TABLE collections ADD COLUMN agent_published INTEGER NOT NULL DEFAULT 0;
