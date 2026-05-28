import { error } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import { isResourceAccess, type ResourceAccess } from '$lib/constants/page';
import { getUserByEmail } from '$lib/server/db';

/** Roles stored on shares and group members. */
export type AccessRole = 'viewer' | 'editor';

/** Effective role after owner check and share resolution. */
export type EffectiveRole = 'none' | AccessRole | 'owner';

export type ShareResourceType = 'page' | 'collection';

export interface AccessResource {
  id: string;
  access: string;
  user_id: string | null;
}

export type AccessViewer = {
  id: string;
  email: string;
};

const ROLE_RANK: Record<EffectiveRole, number> = {
  none: 0,
  viewer: 1,
  editor: 2,
  owner: 3,
};

export function toAccessViewer(
  user: { id: string; email: string } | null | undefined
): AccessViewer | null {
  if (!user?.id || !user.email) return null;
  return { id: user.id, email: user.email };
}

export function parseEmailDomain(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 0 || at === email.length - 1) return null;
  return (
    email
      .slice(at + 1)
      .trim()
      .toLowerCase() || null
  );
}

export function isAccessRole(value: string): value is AccessRole {
  return value === 'viewer' || value === 'editor';
}

export function maxEffectiveRole(...roles: EffectiveRole[]): EffectiveRole {
  return roles.reduce((best, role) => (ROLE_RANK[role] > ROLE_RANK[best] ? role : best), 'none');
}

export function maxAccessRole(...roles: AccessRole[]): AccessRole {
  return roles.reduce((best, role) => (ROLE_RANK[role] > ROLE_RANK[best] ? role : best), 'viewer');
}

export function canRead(role: EffectiveRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK.viewer;
}

export function canWrite(role: EffectiveRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK.editor;
}

function isOpenAccess(access: string): access is Exclude<ResourceAccess, 'private'> {
  return isResourceAccess(access) && access !== 'private';
}

async function queryShareGrantRoles(
  db: D1Database,
  resourceType: ShareResourceType,
  resourceId: string,
  viewer: AccessViewer
): Promise<AccessRole[]> {
  const emailDomain = parseEmailDomain(viewer.email);
  const roles: AccessRole[] = [];

  if (emailDomain) {
    const domainRows = await db
      .prepare(
        `SELECT s.access_role AS access_role
         FROM shares s
         INNER JOIN access_email_domains d
           ON s.grantee_type = 'domain' AND s.grantee_id = d.id
         WHERE s.resource_type = ? AND s.resource_id = ? AND d.domain = ?`
      )
      .bind(resourceType, resourceId, emailDomain)
      .all<{ access_role: string }>();

    for (const row of domainRows.results) {
      if (isAccessRole(row.access_role)) roles.push(row.access_role);
    }
  }

  const groupRows = await db
    .prepare(
      `SELECT s.access_role AS share_role, m.access_role AS member_role
       FROM shares s
       INNER JOIN access_group_members m
         ON s.grantee_type = 'group' AND s.grantee_id = m.group_id
       WHERE s.resource_type = ? AND s.resource_id = ? AND m.user_id = ?`
    )
    .bind(resourceType, resourceId, viewer.id)
    .all<{ share_role: string; member_role: string }>();

  for (const row of groupRows.results) {
    const shareRole = isAccessRole(row.share_role) ? row.share_role : 'viewer';
    const memberRole = isAccessRole(row.member_role) ? row.member_role : 'viewer';
    roles.push(maxAccessRole(shareRole, memberRole));
  }

  return roles;
}

export async function getCollectionIdsForPage(db: D1Database, pageId: string): Promise<string[]> {
  const result = await db
    .prepare('SELECT collection_id FROM collection_pages WHERE page_id = ?')
    .bind(pageId)
    .all<{ collection_id: string }>();
  return result.results.map((row) => row.collection_id);
}

export interface EffectiveRoleOptions {
  /** Collection shares inherited when reading a page inside a collection. */
  inheritCollectionIds?: string[];
}

export async function getEffectiveRole(
  db: D1Database,
  resourceType: ShareResourceType,
  resource: AccessResource,
  viewer: AccessViewer | null,
  options: EffectiveRoleOptions = {}
): Promise<EffectiveRole> {
  if (viewer?.id && resource.user_id && viewer.id === resource.user_id) {
    return 'owner';
  }

  const grantRoles: AccessRole[] = [];

  if (viewer) {
    grantRoles.push(...(await queryShareGrantRoles(db, resourceType, resource.id, viewer)));

    const inheritCollectionIds = options.inheritCollectionIds ?? [];
    for (const collectionId of inheritCollectionIds) {
      grantRoles.push(...(await queryShareGrantRoles(db, 'collection', collectionId, viewer)));
    }
  }

  if (grantRoles.length > 0) {
    return maxAccessRole(...grantRoles);
  }

  if (isOpenAccess(resource.access)) {
    return 'viewer';
  }

  return 'none';
}

export async function getEffectiveRoleForPage(
  db: D1Database,
  resource: AccessResource,
  viewer: AccessViewer | null,
  options: EffectiveRoleOptions = {}
): Promise<EffectiveRole> {
  return getEffectiveRole(db, 'page', resource, viewer, options);
}

export async function getEffectiveRoleForCollection(
  db: D1Database,
  resource: AccessResource,
  viewer: AccessViewer | null
): Promise<EffectiveRole> {
  return getEffectiveRole(db, 'collection', resource, viewer);
}

export async function assertCanReadPage(
  db: D1Database,
  resource: AccessResource,
  viewer: AccessViewer | null,
  options: EffectiveRoleOptions = {},
  message = 'This page is private'
): Promise<EffectiveRole> {
  const role = await getEffectiveRoleForPage(db, resource, viewer, options);
  if (!canRead(role)) throw error(403, message);
  return role;
}

export async function assertCanReadCollection(
  db: D1Database,
  resource: AccessResource,
  viewer: AccessViewer | null,
  message = 'This collection is private'
): Promise<EffectiveRole> {
  const role = await getEffectiveRoleForCollection(db, resource, viewer);
  if (!canRead(role)) throw error(403, message);
  return role;
}

export async function assertCanWritePage(
  db: D1Database,
  resource: AccessResource,
  viewer: AccessViewer | null,
  options: EffectiveRoleOptions = {},
  message = 'Not authorized'
): Promise<EffectiveRole> {
  const role = await getEffectiveRoleForPage(db, resource, viewer, options);
  if (!canWrite(role)) throw error(403, message);
  return role;
}

export async function assertCanWriteCollection(
  db: D1Database,
  resource: AccessResource,
  viewer: AccessViewer | null,
  message = 'Not authorized'
): Promise<EffectiveRole> {
  const role = await getEffectiveRoleForCollection(db, resource, viewer);
  if (!canWrite(role)) throw error(403, message);
  return role;
}

export async function getPageAccessResource(
  db: D1Database,
  pageId: string
): Promise<AccessResource | null> {
  return db
    .prepare('SELECT id, access, user_id FROM pages WHERE id = ?')
    .bind(pageId)
    .first<AccessResource>();
}

export async function getCollectionAccessResource(
  db: D1Database,
  collectionId: string
): Promise<AccessResource | null> {
  return db
    .prepare('SELECT id, access, user_id FROM collections WHERE id = ?')
    .bind(collectionId)
    .first<AccessResource>();
}

/**
 * Page read inside a collection route.
 * If the viewer can read the collection, every page in it is readable here —
 * individual page visibility still applies on standalone /[slug] routes.
 */
export async function assertCanReadPageInCollection(
  db: D1Database,
  page: AccessResource,
  collectionId: string,
  viewer: AccessViewer | null,
  message = 'This page is private'
): Promise<EffectiveRole> {
  const collection = await getCollectionAccessResource(db, collectionId);
  if (!collection) throw error(404, 'Collection not found');

  const collectionRole = await getEffectiveRoleForCollection(db, collection, viewer);
  if (!canRead(collectionRole)) throw error(403, message);

  const pageRole = await getEffectiveRoleForPage(db, page, viewer, {
    inheritCollectionIds: [collectionId],
  });
  const inheritedRole: EffectiveRole = collectionRole === 'owner' ? 'owner' : 'viewer';
  return maxEffectiveRole(pageRole, inheritedRole);
}

// ── API auth ────────────────────────────────────────────────────────────────

export function requireUser(locals: {
  user?: { id: string; email: string; username: string } | null;
}) {
  if (!locals.user) throw error(401, 'Unauthorized');
  return locals.user;
}

// ── Domain / group catalog ──────────────────────────────────────────────────

export interface EmailDomainRow {
  id: string;
  domain: string;
  display_name: string | null;
  created: string;
}

export interface AccessGroupRow {
  id: string;
  name: string;
  domain_id: string | null;
  domain: string | null;
  created: string;
}

export interface GroupMemberRow {
  user_id: string;
  email: string;
  username: string;
  access_role: AccessRole;
}

const DOMAIN_RE =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export function normalizeDomainInput(input: string): string {
  return input.replace(/^@+/, '').trim().toLowerCase();
}

export function assertValidDomain(domain: string): void {
  if (!DOMAIN_RE.test(domain)) {
    throw error(400, 'Invalid email domain');
  }
}

export async function getDomainOwnedByUser(
  db: D1Database,
  domainId: string,
  ownerUserId: string
): Promise<EmailDomainRow | null> {
  return db
    .prepare(
      `SELECT id, domain, display_name, created
       FROM access_email_domains
       WHERE id = ? AND owner_user_id = ?`
    )
    .bind(domainId, ownerUserId)
    .first<EmailDomainRow>();
}

/** Create a domain grantee row for a resource share. */
export async function createResourceDomainGrantee(
  db: D1Database,
  ownerUserId: string,
  domainInput: string
): Promise<EmailDomainRow> {
  const domain = normalizeDomainInput(domainInput);
  assertValidDomain(domain);

  const row = await db
    .prepare(
      `INSERT INTO access_email_domains (domain, display_name, owner_user_id)
       VALUES (?, NULL, ?)
       RETURNING id, domain, display_name, created`
    )
    .bind(domain, ownerUserId)
    .first<EmailDomainRow>();
  if (!row) throw error(500, 'Failed to create domain grantee');
  return row;
}

export async function getDomainGranteeIdForResource(
  db: D1Database,
  resourceType: ShareResourceType,
  resourceId: string,
  domain: string
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT d.id
       FROM shares s
       INNER JOIN access_email_domains d
         ON s.grantee_type = 'domain' AND s.grantee_id = d.id
       WHERE s.resource_type = ? AND s.resource_id = ? AND d.domain = ?
       LIMIT 1`
    )
    .bind(resourceType, resourceId, domain)
    .first<{ id: string }>();
  return row?.id ?? null;
}

export async function listGroupsForOwner(
  db: D1Database,
  ownerUserId: string
): Promise<AccessGroupRow[]> {
  const result = await db
    .prepare(
      `SELECT g.id, g.name, g.domain_id, g.created, d.domain
       FROM access_groups g
       LEFT JOIN access_email_domains d ON d.id = g.domain_id
       WHERE g.owner_user_id = ?
       ORDER BY g.name ASC`
    )
    .bind(ownerUserId)
    .all<AccessGroupRow>();
  return result.results;
}

export async function getGroupOwnedByUser(
  db: D1Database,
  groupId: string,
  ownerUserId: string
): Promise<AccessGroupRow | null> {
  return db
    .prepare(
      `SELECT g.id, g.name, g.domain_id, g.created, d.domain
       FROM access_groups g
       LEFT JOIN access_email_domains d ON d.id = g.domain_id
       WHERE g.id = ? AND g.owner_user_id = ?`
    )
    .bind(groupId, ownerUserId)
    .first<AccessGroupRow>();
}

async function assertDomainOwned(
  db: D1Database,
  domainId: string | null | undefined,
  ownerUserId: string
): Promise<void> {
  if (!domainId) return;
  const domain = await getDomainOwnedByUser(db, domainId, ownerUserId);
  if (!domain) throw error(400, 'Domain not found');
}

export async function createGroup(
  db: D1Database,
  ownerUserId: string,
  data: { name: string; domain_id?: string | null }
): Promise<AccessGroupRow> {
  const name = data.name.trim();
  if (!name) throw error(400, 'Group name is required');
  await assertDomainOwned(db, data.domain_id ?? null, ownerUserId);

  const domainId = data.domain_id ?? null;
  const inserted = await db
    .prepare(
      `INSERT INTO access_groups (name, owner_user_id, domain_id)
       VALUES (?, ?, ?)
       RETURNING id`
    )
    .bind(name, ownerUserId, domainId)
    .first<{ id: string }>();
  if (!inserted) throw error(500, 'Failed to create group');

  const result = await getGroupOwnedByUser(db, inserted.id, ownerUserId);
  if (!result) throw error(500, 'Failed to create group');
  return result;
}

export async function updateGroup(
  db: D1Database,
  groupId: string,
  ownerUserId: string,
  data: { name?: string; domain_id?: string | null }
): Promise<AccessGroupRow> {
  const existing = await getGroupOwnedByUser(db, groupId, ownerUserId);
  if (!existing) throw error(404, 'Group not found');

  const name = data.name !== undefined ? data.name.trim() : existing.name;
  if (!name) throw error(400, 'Group name is required');

  const domainId = data.domain_id !== undefined ? data.domain_id : existing.domain_id;
  await assertDomainOwned(db, domainId, ownerUserId);

  await db
    .prepare(
      `UPDATE access_groups
       SET name = ?, domain_id = ?
       WHERE id = ? AND owner_user_id = ?`
    )
    .bind(name, domainId, groupId, ownerUserId)
    .run();

  return (await getGroupOwnedByUser(db, groupId, ownerUserId))!;
}

export async function deleteGroup(
  db: D1Database,
  groupId: string,
  ownerUserId: string
): Promise<void> {
  const result = await db
    .prepare('DELETE FROM access_groups WHERE id = ? AND owner_user_id = ?')
    .bind(groupId, ownerUserId)
    .run();
  if (!result.meta.changes) throw error(404, 'Group not found');
}

export async function listGroupMembers(
  db: D1Database,
  groupId: string,
  ownerUserId: string
): Promise<GroupMemberRow[]> {
  const group = await getGroupOwnedByUser(db, groupId, ownerUserId);
  if (!group) throw error(404, 'Group not found');

  const result = await db
    .prepare(
      `SELECT m.user_id, u.email, u.username, m.access_role
       FROM access_group_members m
       INNER JOIN users u ON u.id = m.user_id
       WHERE m.group_id = ?
       ORDER BY u.email ASC`
    )
    .bind(groupId)
    .all<GroupMemberRow>();
  return result.results;
}

export async function addGroupMember(
  db: D1Database,
  groupId: string,
  ownerUserId: string,
  data: { email: string; access_role?: AccessRole }
): Promise<GroupMemberRow> {
  const group = await getGroupOwnedByUser(db, groupId, ownerUserId);
  if (!group) throw error(404, 'Group not found');

  const email = data.email.trim().toLowerCase();
  if (!email) throw error(400, 'Email is required');

  const user = await getUserByEmail(db, email);
  if (!user) throw error(404, 'User not found — they must sign in once before being added');

  if (group.domain) {
    const memberDomain = parseEmailDomain(email);
    if (!memberDomain || memberDomain !== group.domain) {
      throw error(400, `Member email must be @${group.domain}`);
    }
  }

  const accessRole = data.access_role ?? 'viewer';
  if (!isAccessRole(accessRole)) throw error(400, 'Invalid access role');

  await db
    .prepare(
      `INSERT INTO access_group_members (group_id, user_id, access_role)
       VALUES (?, ?, ?)
       ON CONFLICT(group_id, user_id) DO UPDATE SET access_role = excluded.access_role`
    )
    .bind(groupId, user.id, accessRole)
    .run();

  return {
    user_id: user.id,
    email: user.email,
    username: user.username,
    access_role: accessRole,
  };
}

export async function updateGroupMember(
  db: D1Database,
  groupId: string,
  memberUserId: string,
  ownerUserId: string,
  accessRole: AccessRole
): Promise<void> {
  const group = await getGroupOwnedByUser(db, groupId, ownerUserId);
  if (!group) throw error(404, 'Group not found');
  if (!isAccessRole(accessRole)) throw error(400, 'Invalid access role');

  const result = await db
    .prepare(
      `UPDATE access_group_members SET access_role = ?
       WHERE group_id = ? AND user_id = ?`
    )
    .bind(accessRole, groupId, memberUserId)
    .run();
  if (!result.meta.changes) throw error(404, 'Member not found');
}

export async function removeGroupMember(
  db: D1Database,
  groupId: string,
  memberUserId: string,
  ownerUserId: string
): Promise<void> {
  const group = await getGroupOwnedByUser(db, groupId, ownerUserId);
  if (!group) throw error(404, 'Group not found');

  const result = await db
    .prepare('DELETE FROM access_group_members WHERE group_id = ? AND user_id = ?')
    .bind(groupId, memberUserId)
    .run();
  if (!result.meta.changes) throw error(404, 'Member not found');
}

export async function assertGranteeOwnedByUser(
  db: D1Database,
  granteeType: 'domain' | 'group',
  granteeId: string,
  ownerUserId: string
): Promise<void> {
  if (granteeType === 'domain') {
    const row = await getDomainOwnedByUser(db, granteeId, ownerUserId);
    if (!row) throw error(400, 'Domain not found');
    return;
  }
  const row = await getGroupOwnedByUser(db, granteeId, ownerUserId);
  if (!row) throw error(400, 'Group not found');
}
