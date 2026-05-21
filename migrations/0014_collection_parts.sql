-- Ordered sections within a collection
CREATE TABLE IF NOT EXISTS collection_parts (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_collection_parts_collection ON collection_parts(collection_id);

ALTER TABLE collection_pages ADD COLUMN part_id TEXT
  REFERENCES collection_parts(id) ON DELETE SET NULL;
