-- migrations/0004_comment_anchors.sql
-- Add anchor_hint column for comment reconciliation on content changes.
-- Existing anchor values (simple strings or null) remain valid.
-- New comments will use JSON format in anchor field: {"type":"page"} or {"type":"block","block_type":"card","block_id":"c1"}
ALTER TABLE comments ADD COLUMN anchor_hint TEXT;
