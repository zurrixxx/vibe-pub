-- Collections: a shareable container of ordered pages
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  user_id TEXT REFERENCES users(id),
  access TEXT NOT NULL DEFAULT 'unlisted' CHECK (access IN ('public', 'unlisted', 'private')),
  theme TEXT DEFAULT 'default',
  created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Junction table: which pages belong to which collection, in what order
CREATE TABLE IF NOT EXISTS collection_pages (
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  label TEXT, -- optional display label (overrides page title in nav)
  PRIMARY KEY (collection_id, page_id)
);

CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_pages_collection ON collection_pages(collection_id);
