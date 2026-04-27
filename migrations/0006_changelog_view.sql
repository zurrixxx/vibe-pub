-- Add 'changelog' to the view CHECK constraint on pages table
-- SQLite doesn't support ALTER CHECK, so we rename -> create -> copy -> drop

PRAGMA foreign_keys = OFF;

ALTER TABLE pages RENAME TO pages_old;

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  slug TEXT NOT NULL,
  user_id TEXT REFERENCES users(id),
  workspace_id TEXT REFERENCES workspaces(id),
  title TEXT,
  markdown TEXT NOT NULL,
  view TEXT NOT NULL DEFAULT 'doc' CHECK (view IN ('doc', 'kanban', 'changelog')),
  access TEXT NOT NULL DEFAULT 'unlisted' CHECK (access IN ('public', 'unlisted', 'private')),
  theme TEXT NOT NULL DEFAULT 'default' CHECK (theme IN (
    'default', 'paper', 'terminal', 'midnight', 'rose', 'ocean',
    'stripe', 'claude', 'raycast', 'nord', 'monokai', 'dracula',
    'solarized', 'github'
  )),
  expires_at TEXT,
  created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

INSERT INTO pages SELECT
  id, slug, user_id, workspace_id, title, markdown, view, access, theme,
  expires_at, created, updated
FROM pages_old;

DROP TABLE pages_old;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_user ON pages(user_id);
CREATE INDEX IF NOT EXISTS idx_pages_workspace ON pages(workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_user_slug ON pages(user_id, slug) WHERE user_id IS NOT NULL;

PRAGMA foreign_keys = ON;
