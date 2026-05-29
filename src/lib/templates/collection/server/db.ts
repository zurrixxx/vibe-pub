import { error } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import {
  DEFAULT_RESOURCE_ACCESS,
  isResourceAccess,
  type ResourceAccess,
} from '$lib/constants/page';

export function newCollectionEntityId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

/** Minimal collection row for API auth checks. */
export interface DbCollectionRow {
  id: string;
  user_id: string | null;
}

export async function getCollectionBySlug(
  db: D1Database,
  slug: string
): Promise<(DbCollectionRow & { slug: string }) | null> {
  return db
    .prepare('SELECT id, slug, user_id FROM collections WHERE slug = ?')
    .bind(slug)
    .first<DbCollectionRow & { slug: string }>();
}

export function assertCollectionOwner(
  collection: DbCollectionRow,
  userId: string | undefined
): void {
  if (collection.user_id && userId !== collection.user_id) {
    throw error(403, 'Not authorized');
  }
}

/** Collections without an owner cannot be private or unlisted — always public. */
export function resolveCollectionAccess(
  access: string | undefined,
  ownerUserId: string | null | undefined,
  defaultAccess: ResourceAccess = DEFAULT_RESOURCE_ACCESS
): ResourceAccess {
  if (!ownerUserId) return 'public';
  if (access === undefined) return defaultAccess;
  if (isResourceAccess(access)) return access;
  return defaultAccess;
}

/** Reject non-public access when the collection has no owner. */
export function assertCollectionAccessForOwner(
  access: string,
  ownerUserId: string | null | undefined
): void {
  if (!ownerUserId && access !== 'public') {
    throw error(400, 'Collections without an owner must be public');
  }
}

export async function touchCollectionUpdated(db: D1Database, collectionId: string): Promise<void> {
  await db
    .prepare("UPDATE collections SET updated = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?")
    .bind(collectionId)
    .run();
}

/** Deletes a collection; junction rows and shares cascade via FK/triggers. Pages are not deleted. */
export async function deleteCollectionById(db: D1Database, collectionId: string): Promise<void> {
  await db.prepare('DELETE FROM collections WHERE id = ?').bind(collectionId).run();
}

export async function getPartInCollection(
  db: D1Database,
  partId: string,
  collectionId: string
): Promise<{ id: string; title: string; sort_order: number } | null> {
  return db
    .prepare(
      'SELECT id, title, sort_order FROM collection_parts WHERE id = ? AND collection_id = ?'
    )
    .bind(partId, collectionId)
    .first<{ id: string; title: string; sort_order: number }>();
}

export async function nextPartSortOrder(db: D1Database, collectionId: string): Promise<number> {
  const row = await db
    .prepare('SELECT MAX(sort_order) as max_order FROM collection_parts WHERE collection_id = ?')
    .bind(collectionId)
    .first<{ max_order: number | null }>();
  return (row?.max_order ?? -1) + 1;
}

export async function nextPageSortOrderInPart(
  db: D1Database,
  collectionId: string,
  partId: string | null
): Promise<number> {
  const row = partId
    ? await db
        .prepare(
          `SELECT MAX(sort_order) as max_order FROM collection_pages
           WHERE collection_id = ? AND part_id = ?`
        )
        .bind(collectionId, partId)
        .first<{ max_order: number | null }>()
    : await db
        .prepare(
          `SELECT MAX(sort_order) as max_order FROM collection_pages
           WHERE collection_id = ? AND part_id IS NULL`
        )
        .bind(collectionId)
        .first<{ max_order: number | null }>();
  return (row?.max_order ?? -1) + 1;
}

/** Cover page reader's guide — lede + three prose cards on /c/[slug]. */
export interface ReaderGuide {
  readers_guide: string | null;
  what_its_about: string | null;
  who_its_for: string | null;
  how_to_read_it: string | null;
}

export function readerGuideFromRow(row: {
  readers_guide?: string | null;
  what_its_about?: string | null;
  who_its_for?: string | null;
  how_to_read_it?: string | null;
}): ReaderGuide {
  return {
    readers_guide: row.readers_guide?.trim() || null,
    what_its_about: row.what_its_about?.trim() || null,
    who_its_for: row.who_its_for?.trim() || null,
    how_to_read_it: row.how_to_read_it?.trim() || null,
  };
}

export function readerGuideFromBody(body: {
  readers_guide?: string;
  what_its_about?: string;
  who_its_for?: string;
  how_to_read_it?: string;
}): Partial<ReaderGuide> {
  const out: Partial<ReaderGuide> = {};
  if (body.readers_guide !== undefined) {
    out.readers_guide = body.readers_guide.trim() || null;
  }
  if (body.what_its_about !== undefined) {
    out.what_its_about = body.what_its_about.trim() || null;
  }
  if (body.who_its_for !== undefined) {
    out.who_its_for = body.who_its_for.trim() || null;
  }
  if (body.how_to_read_it !== undefined) {
    out.how_to_read_it = body.how_to_read_it.trim() || null;
  }
  return out;
}

/**
 * Shared SELECT for collection membership rows in reader order.
 *
 * Sort order:
 * 1. Pages in a part before ungrouped pages (`part_id IS NULL` last)
 * 2. Parts by `collection_parts.sort_order`
 * 3. Pages within a part by `collection_pages.sort_order`
 */
/**
 * @param selectColumns SQL column list (no `SELECT` keyword), e.g. `p.id, p.slug`
 */
export function buildCollectionPagesSelectQuery(selectColumns: string): string {
  const columns = selectColumns.trim().replace(/\s+/g, ' ');
  return [
    `SELECT ${columns}`,
    'FROM collection_pages AS cp',
    'INNER JOIN pages AS p ON p.id = cp.page_id',
    'LEFT JOIN collection_parts AS pt ON pt.id = cp.part_id',
    'WHERE cp.collection_id = ?',
    `ORDER BY
  CASE WHEN cp.part_id IS NULL THEN 1 ELSE 0 END,
  COALESCE(pt.sort_order, 999999),
  cp.sort_order ASC`,
  ].join('\n');
}
