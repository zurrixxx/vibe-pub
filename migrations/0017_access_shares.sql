-- Access control: email domains, groups, members, and resource shares.
-- Domain and group grantees are linked to pages/collections via shares (not global catalogs).
-- DELETE triggers on pages/collections clean up resource shares and exclusive grantees.
-- DELETE triggers on domains/groups/shares clean up the paired rows.

CREATE TABLE IF NOT EXISTS access_email_domains (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  domain TEXT NOT NULL,
  display_name TEXT,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS access_groups (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  domain_id TEXT REFERENCES access_email_domains(id) ON DELETE SET NULL,
  created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS access_group_members (
  group_id TEXT NOT NULL REFERENCES access_groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (access_role IN ('viewer', 'editor')),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_access_email_domains_owner ON access_email_domains(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_access_groups_owner ON access_groups(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_access_groups_domain ON access_groups(domain_id);
CREATE INDEX IF NOT EXISTS idx_access_group_members_user ON access_group_members(user_id);

CREATE TABLE IF NOT EXISTS shares (
  resource_type TEXT NOT NULL CHECK (resource_type IN ('page', 'collection')),
  resource_id TEXT NOT NULL,
  grantee_type TEXT NOT NULL CHECK (grantee_type IN ('domain', 'group')),
  grantee_id TEXT NOT NULL,
  access_role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (access_role IN ('viewer', 'editor')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  PRIMARY KEY (resource_type, resource_id, grantee_type, grantee_id)
);

CREATE INDEX IF NOT EXISTS idx_shares_resource ON shares(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_shares_grantee ON shares(grantee_type, grantee_id);

CREATE TRIGGER IF NOT EXISTS trg_shares_after_page_delete
AFTER DELETE ON pages
BEGIN
  -- Drop domain grantees for this page (share rows cascade via trg_shares_after_domain_delete).
  DELETE FROM access_email_domains
  WHERE id IN (
    SELECT s.grantee_id
    FROM shares s
    WHERE s.resource_type = 'page'
      AND s.resource_id = OLD.id
      AND s.grantee_type = 'domain'
  );

  -- Drop groups used only by this page (members cascade via FK).
  DELETE FROM access_groups
  WHERE id IN (
    SELECT s.grantee_id
    FROM shares s
    WHERE s.resource_type = 'page'
      AND s.resource_id = OLD.id
      AND s.grantee_type = 'group'
      AND s.grantee_id NOT IN (
        SELECT s2.grantee_id
        FROM shares s2
        WHERE s2.grantee_type = 'group'
          AND (s2.resource_type != 'page' OR s2.resource_id != OLD.id)
      )
  );

  DELETE FROM shares
  WHERE resource_type = 'page' AND resource_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_shares_after_collection_delete
AFTER DELETE ON collections
BEGIN
  DELETE FROM access_email_domains
  WHERE id IN (
    SELECT s.grantee_id
    FROM shares s
    WHERE s.resource_type = 'collection'
      AND s.resource_id = OLD.id
      AND s.grantee_type = 'domain'
  );

  DELETE FROM access_groups
  WHERE id IN (
    SELECT s.grantee_id
    FROM shares s
    WHERE s.resource_type = 'collection'
      AND s.resource_id = OLD.id
      AND s.grantee_type = 'group'
      AND s.grantee_id NOT IN (
        SELECT s2.grantee_id
        FROM shares s2
        WHERE s2.grantee_type = 'group'
          AND (s2.resource_type != 'collection' OR s2.resource_id != OLD.id)
      )
  );

  DELETE FROM shares
  WHERE resource_type = 'collection' AND resource_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_shares_after_domain_delete
AFTER DELETE ON access_email_domains
BEGIN
  DELETE FROM shares
  WHERE grantee_type = 'domain' AND grantee_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_shares_after_group_delete
AFTER DELETE ON access_groups
BEGIN
  DELETE FROM shares
  WHERE grantee_type = 'group' AND grantee_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_shares_after_share_delete
AFTER DELETE ON shares
WHEN OLD.grantee_type = 'domain'
BEGIN
  DELETE FROM access_email_domains
  WHERE id = OLD.grantee_id
    AND id NOT IN (
      SELECT grantee_id FROM shares WHERE grantee_type = 'domain'
    );
END;
