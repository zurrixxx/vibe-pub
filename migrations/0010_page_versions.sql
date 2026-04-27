CREATE TABLE IF NOT EXISTS page_versions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  markdown TEXT NOT NULL,
  title TEXT,
  created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_page_versions_page ON page_versions(page_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_page_versions_unique ON page_versions(page_id, version);
