import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, getPageByUrlSegment } from '$lib/server/db';
import {
  assertCollectionOwner,
  getCollectionBySlug,
  getPartInCollection,
  nextPageSortOrderInPart,
  touchCollectionUpdated,
} from '$lib/templates/collection/server';

// Add a page to a collection
export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const collection = await getCollectionBySlug(db, params.slug);
  if (!collection) throw error(404, 'Collection not found');
  assertCollectionOwner(collection, locals.user?.id);

  const body = await request.json();
  const { page_slug, label, part_id } = body as {
    page_slug: string;
    label?: string;
    part_id?: string | null;
  };

  if (!page_slug) throw error(400, 'page_slug is required');

  let resolvedPartId: string | null = null;
  if (part_id) {
    const part = await getPartInCollection(db, part_id, collection.id);
    if (!part) throw error(404, 'Part not found in this collection');
    resolvedPartId = part.id;
  }

  const pageRow = await getPageByUrlSegment(db, page_slug);
  if (!pageRow) throw error(404, `Page not found: ${page_slug}`);

  const existing = await db
    .prepare('SELECT 1 FROM collection_pages WHERE collection_id = ? AND page_id = ? LIMIT 1')
    .bind(collection.id, pageRow.id)
    .first();

  if (existing) {
    throw error(409, 'Page already in collection');
  }

  const nextOrder = await nextPageSortOrderInPart(db, collection.id, resolvedPartId);

  try {
    await db
      .prepare(
        'INSERT INTO collection_pages (collection_id, page_id, sort_order, label, part_id) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(collection.id, pageRow.id, nextOrder, label ?? null, resolvedPartId)
      .run();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/UNIQUE constraint failed/i.test(msg)) {
      throw error(409, 'Page already in collection');
    }
    throw err;
  }

  await touchCollectionUpdated(db, collection.id);

  return json(
    { added: true, page_slug, sort_order: nextOrder, part_id: resolvedPartId },
    { status: 201 }
  );
};
