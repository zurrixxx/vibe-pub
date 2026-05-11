-- Mark pages published via CLI/MCP/API (for profile "Agent-published" filter).
ALTER TABLE pages ADD COLUMN agent_published INTEGER NOT NULL DEFAULT 0;
