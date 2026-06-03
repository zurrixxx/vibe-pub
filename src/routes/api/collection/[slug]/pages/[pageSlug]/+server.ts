import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, getPageByUrlSegment } from '$lib/server/db';
import {
  assertCollectionOwner,
  getCollectionBySlug,
  getPartInCollection,
  touchCollectionUpdated,
} from '$lib/templates/collection/server';

// Update a page's membership in a collection (part_id, label)
export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const collection = await getCollectionBySlug(db, params.slug);
  if (!collection) throw error(404, 'Collection not found');
  assertCollectionOwner(collection, locals.user?.id);

  const pageRow = await getPageByUrlSegment(db, params.pageSlug);
  if (!pageRow) throw error(404, `Page not found: ${params.pageSlug}`);
  const page = { id: pageRow.id };

  const membership = await db
    .prepare(
      'SELECT part_id, label, sort_order FROM collection_pages WHERE collection_id = ? AND page_id = ?'
    )
    .bind(collection.id, page.id)
    .first<{ part_id: string | null; label: string | null; sort_order: number }>();

  if (!membership) throw error(404, 'Page is not in this collection');

  const body = await request.json();
  const { part_id, label, sort_order } = body as {
    part_id?: string | null;
    label?: string | null;
    sort_order?: number;
  };

  const sets: string[] = [];
  const values: (string | number | null)[] = [];

  if (part_id !== undefined) {
    if (part_id === null) {
      sets.push('part_id = NULL');
    } else {
      const part = await getPartInCollection(db, part_id, collection.id);
      if (!part) throw error(404, 'Part not found in this collection');
      sets.push('part_id = ?');
      values.push(part.id);
    }
  }
  if (label !== undefined) {
    sets.push('label = ?');
    values.push(label);
  }
  if (sort_order !== undefined) {
    if (!Number.isInteger(sort_order)) throw error(400, 'sort_order must be an integer');
    sets.push('sort_order = ?');
    values.push(sort_order);
  }

  if (sets.length === 0) throw error(400, 'No fields to update');

  values.push(collection.id, page.id);

  await db
    .prepare(
      `UPDATE collection_pages SET ${sets.join(', ')} WHERE collection_id = ? AND page_id = ?`
    )
    .bind(...values)
    .run();

  await touchCollectionUpdated(db, collection.id);

  const updated = await db
    .prepare(
      'SELECT part_id, label, sort_order FROM collection_pages WHERE collection_id = ? AND page_id = ?'
    )
    .bind(collection.id, page.id)
    .first();

  return json({ page_slug: params.pageSlug, ...updated });
};

// Remove a page from a collection
export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const collection = await getCollectionBySlug(db, params.slug);
  if (!collection) throw error(404, 'Collection not found');
  assertCollectionOwner(collection, locals.user?.id);

  const pageRow = await getPageByUrlSegment(db, params.pageSlug);
  if (!pageRow) throw error(404, `Page not found: ${params.pageSlug}`);
  const page = { id: pageRow.id };

  const result = await db
    .prepare('DELETE FROM collection_pages WHERE collection_id = ? AND page_id = ?')
    .bind(collection.id, page.id)
    .run();

  if (!result.meta.changes) {
    throw error(404, 'Page is not in this collection');
  }

  await touchCollectionUpdated(db, collection.id);

  return json({ removed: true, page_slug: params.pageSlug });
};
