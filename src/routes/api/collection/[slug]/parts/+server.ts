import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import {
  assertCollectionOwner,
  getCollectionBySlug,
  newCollectionEntityId,
  nextPartSortOrder,
  touchCollectionUpdated,
} from '$lib/templates/collection/server';

export const GET: RequestHandler = async ({ params, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const collection = await getCollectionBySlug(db, params.slug);
  if (!collection) throw error(404, 'Collection not found');

  const parts = await db
    .prepare(
      'SELECT id, title, sort_order FROM collection_parts WHERE collection_id = ? ORDER BY sort_order ASC'
    )
    .bind(collection.id)
    .all<{ id: string; title: string; sort_order: number }>();

  return json(parts.results);
};

export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const collection = await getCollectionBySlug(db, params.slug);
  if (!collection) throw error(404, 'Collection not found');
  assertCollectionOwner(collection, locals.user?.id);

  const body = await request.json();
  const { title, sort_order } = body as { title: string; sort_order?: number };

  if (!title?.trim()) throw error(400, 'title is required');

  const id = newCollectionEntityId();
  const order =
    sort_order !== undefined && Number.isInteger(sort_order)
      ? sort_order
      : await nextPartSortOrder(db, collection.id);

  await db
    .prepare(
      'INSERT INTO collection_parts (id, collection_id, title, sort_order) VALUES (?, ?, ?, ?)'
    )
    .bind(id, collection.id, title.trim(), order)
    .run();

  await touchCollectionUpdated(db, collection.id);

  return json({ id, title: title.trim(), sort_order: order }, { status: 201 });
};
