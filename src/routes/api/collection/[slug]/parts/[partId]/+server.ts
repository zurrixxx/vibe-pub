import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import {
  assertCollectionOwner,
  getCollectionBySlug,
  getPartInCollection,
  touchCollectionUpdated,
} from '$lib/templates/collection/server';

export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const collection = await getCollectionBySlug(db, params.slug);
  if (!collection) throw error(404, 'Collection not found');
  assertCollectionOwner(collection, locals.user?.id);

  const part = await getPartInCollection(db, params.partId, collection.id);
  if (!part) throw error(404, 'Part not found');

  const body = await request.json();
  const { title, sort_order } = body as { title?: string; sort_order?: number };

  const sets: string[] = [];
  const values: (string | number)[] = [];

  if (title !== undefined) {
    if (!title.trim()) throw error(400, 'title cannot be empty');
    sets.push('title = ?');
    values.push(title.trim());
  }
  if (sort_order !== undefined) {
    if (!Number.isInteger(sort_order)) throw error(400, 'sort_order must be an integer');
    sets.push('sort_order = ?');
    values.push(sort_order);
  }

  if (sets.length === 0) throw error(400, 'No fields to update');

  values.push(part.id);

  await db
    .prepare(`UPDATE collection_parts SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  await touchCollectionUpdated(db, collection.id);

  const updated = await getPartInCollection(db, part.id, collection.id);
  return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const collection = await getCollectionBySlug(db, params.slug);
  if (!collection) throw error(404, 'Collection not found');
  assertCollectionOwner(collection, locals.user?.id);

  const part = await getPartInCollection(db, params.partId, collection.id);
  if (!part) throw error(404, 'Part not found');

  await db.prepare('DELETE FROM collection_parts WHERE id = ?').bind(part.id).run();

  await touchCollectionUpdated(db, collection.id);

  return json({ deleted: true, id: part.id });
};
