-- Mark comments created via CLI/MCP (agent_published: true in JSON body).
ALTER TABLE comments ADD COLUMN agent_published INTEGER NOT NULL DEFAULT 0;
