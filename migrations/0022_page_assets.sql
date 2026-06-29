CREATE TABLE IF NOT EXISTS page_assets (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  data BLOB NOT NULL,
  created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_page_assets_page ON page_assets(page_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_page_assets_page_hash ON page_assets(page_id, sha256);
