import { error, isHttpError } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import {
  addGroupMember,
  assertGranteeOwnedByUser,
  assertValidDomain,
  createGroup,
  createResourceDomainGrantee,
  getDomainGranteeIdForResource,
  getGroupOwnedByUser,
  isAccessRole,
  listGroupMembers,
  maxAccessRole,
  normalizeDomainInput,
  type AccessRole,
  type GroupMemberRow,
  type ShareResourceType,
} from '$lib/server/access';

export type ShareGranteeType = 'domain' | 'group';

export const DEFAULT_RESOURCE_GROUP_NAME = 'default';

export interface ResourceShareRow {
  resource_type: ShareResourceType;
  resource_id: string;
  grantee_type: ShareGranteeType;
  grantee_id: string;
  created: string;
  created_by: string | null;
  label: string;
  access_role: AccessRole | null;
  member_count: number | null;
}

function isShareGranteeType(value: string): value is ShareGranteeType {
  return value === 'domain' || value === 'group';
}

export async function listSharesForResource(
  db: D1Database,
  resourceType: ShareResourceType,
  resourceId: string
): Promise<ResourceShareRow[]> {
  const result = await db
    .prepare(
      `SELECT
         s.resource_type,
         s.resource_id,
         s.grantee_type,
         s.grantee_id,
         s.created,
         s.created_by,
         CASE
           WHEN s.grantee_type = 'domain' THEN '@' || d.domain
           WHEN s.grantee_type = 'group' THEN g.name
         END AS label,
         s.access_role AS access_role,
         CASE
           WHEN s.grantee_type = 'group' THEN (
             SELECT COUNT(*) FROM access_group_members m WHERE m.group_id = g.id
           )
           ELSE NULL
         END AS member_count
       FROM shares s
       LEFT JOIN access_email_domains d
         ON s.grantee_type = 'domain' AND s.grantee_id = d.id
       LEFT JOIN access_groups g
         ON s.grantee_type = 'group' AND s.grantee_id = g.id
       WHERE s.resource_type = ? AND s.resource_id = ?
       ORDER BY s.created ASC`
    )
    .bind(resourceType, resourceId)
    .all<ResourceShareRow>();

  return result.results.filter((row) => row.label);
}

export interface ResourceSharePayload {
  shares: ResourceShareRow[];
  shared_users: GroupMemberRow[];
  default_group_id: string | null;
}

export async function getResourceSharePayload(
  db: D1Database,
  resourceType: ShareResourceType,
  resourceId: string,
  ownerUserId: string
): Promise<ResourceSharePayload> {
  const [shares, shared_users, default_group_id] = await Promise.all([
    listSharesForResource(db, resourceType, resourceId),
    listSharedUsersForResource(db, resourceType, resourceId, ownerUserId),
    getDefaultGroupIdForResource(db, resourceType, resourceId, ownerUserId),
  ]);
  return { shares, shared_users, default_group_id };
}

export async function addShare(
  db: D1Database,
  resourceType: ShareResourceType,
  resourceId: string,
  granteeType: ShareGranteeType,
  granteeId: string,
  createdBy: string,
  accessRole: AccessRole = 'viewer'
): Promise<void> {
  if (!isShareGranteeType(granteeType)) throw error(400, 'Invalid grantee type');
  if (!isAccessRole(accessRole)) throw error(400, 'Invalid access role');
  await assertGranteeOwnedByUser(db, granteeType, granteeId, createdBy);

  try {
    await db
      .prepare(
        `INSERT INTO shares (resource_type, resource_id, grantee_type, grantee_id, access_role, created_by)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(resource_type, resource_id, grantee_type, grantee_id)
         DO UPDATE SET access_role = excluded.access_role`
      )
      .bind(resourceType, resourceId, granteeType, granteeId, accessRole, createdBy)
      .run();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/UNIQUE constraint failed/i.test(msg)) {
      throw error(409, 'Share already exists');
    }
    throw err;
  }
}

export async function getDefaultGroupIdForResource(
  db: D1Database,
  resourceType: ShareResourceType,
  resourceId: string,
  ownerUserId: string
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT g.id
       FROM shares s
       INNER JOIN access_groups g
         ON s.grantee_type = 'group' AND s.grantee_id = g.id
       WHERE s.resource_type = ? AND s.resource_id = ?
         AND g.name = ? AND g.owner_user_id = ?
       LIMIT 1`
    )
    .bind(resourceType, resourceId, DEFAULT_RESOURCE_GROUP_NAME, ownerUserId)
    .first<{ id: string }>();
  return row?.id ?? null;
}

export async function getOrCreateDefaultGroupForResource(
  db: D1Database,
  resourceType: ShareResourceType,
  resourceId: string,
  ownerUserId: string
): Promise<string> {
  const existingId = await getDefaultGroupIdForResource(db, resourceType, resourceId, ownerUserId);
  if (existingId) {
    const group = await getGroupOwnedByUser(db, existingId, ownerUserId);
    if (group) return group.id;
  }

  const group = await createGroup(db, ownerUserId, { name: DEFAULT_RESOURCE_GROUP_NAME });
  try {
    await addShare(db, resourceType, resourceId, 'group', group.id, ownerUserId);
  } catch (err) {
    if (isHttpError(err) && err.status === 409) {
      const racedId = await getDefaultGroupIdForResource(db, resourceType, resourceId, ownerUserId);
      if (racedId) return racedId;
    }
    throw err;
  }
  return group.id;
}

export async function listSharedUsersForResource(
  db: D1Database,
  resourceType: ShareResourceType,
  resourceId: string,
  ownerUserId: string
): Promise<GroupMemberRow[]> {
  const groupId = await getDefaultGroupIdForResource(db, resourceType, resourceId, ownerUserId);
  if (!groupId) return [];

  const shareRow = await db
    .prepare(
      `SELECT access_role FROM shares
       WHERE resource_type = ? AND resource_id = ? AND grantee_type = 'group' AND grantee_id = ?`
    )
    .bind(resourceType, resourceId, groupId)
    .first<{ access_role: string }>();

  const shareRole =
    shareRow?.access_role && isAccessRole(shareRow.access_role) ? shareRow.access_role : 'viewer';

  const members = await listGroupMembers(db, groupId, ownerUserId);
  return members.map((member) => ({
    ...member,
    access_role: maxAccessRole(shareRole, member.access_role),
  }));
}

export async function shareUserToResource(
  db: D1Database,
  resourceType: ShareResourceType,
  resourceId: string,
  ownerUserId: string,
  data: { email: string; access_role?: AccessRole }
): Promise<GroupMemberRow> {
  const accessRole = data.access_role ?? 'viewer';
  if (!isAccessRole(accessRole)) throw error(400, 'Invalid access role');

  const groupId = await getOrCreateDefaultGroupForResource(
    db,
    resourceType,
    resourceId,
    ownerUserId
  );
  return addGroupMember(db, groupId, ownerUserId, {
    email: data.email,
    access_role: accessRole,
  });
}

export async function shareDomainToResource(
  db: D1Database,
  resourceType: ShareResourceType,
  resourceId: string,
  ownerUserId: string,
  data: { domain: string; access_role?: AccessRole }
): Promise<void> {
  const domain = normalizeDomainInput(data.domain);
  assertValidDomain(domain);

  const accessRole = data.access_role ?? 'viewer';
  if (!isAccessRole(accessRole)) throw error(400, 'Invalid access role');

  let granteeId = await getDomainGranteeIdForResource(db, resourceType, resourceId, domain);
  if (!granteeId) {
    const row = await createResourceDomainGrantee(db, ownerUserId, domain);
    granteeId = row.id;
  }

  await addShare(db, resourceType, resourceId, 'domain', granteeId, ownerUserId, accessRole);
}

export async function removeShare(
  db: D1Database,
  resourceType: ShareResourceType,
  resourceId: string,
  granteeType: ShareGranteeType,
  granteeId: string
): Promise<void> {
  if (!isShareGranteeType(granteeType)) throw error(400, 'Invalid grantee type');

  const result = await db
    .prepare(
      `DELETE FROM shares
       WHERE resource_type = ? AND resource_id = ? AND grantee_type = ? AND grantee_id = ?`
    )
    .bind(resourceType, resourceId, granteeType, granteeId)
    .run();

  if (!result.meta.changes) throw error(404, 'Share not found');
}
