import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';

// Remove a page from a collection
export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const collection = await db
    .prepare('SELECT id, user_id FROM collections WHERE slug = ?')
    .bind(params.slug)
    .first<{ id: string; user_id: string | null }>();

  if (!collection) throw error(404, 'Collection not found');

  // Owner check
  if (collection.user_id && locals.user?.id !== collection.user_id) {
    throw error(403, 'Not authorized');
  }

  // Resolve page slug to ID
  const page = await db
    .prepare('SELECT id FROM pages WHERE slug = ?')
    .bind(params.pageSlug)
    .first<{ id: string }>();

  if (!page) throw error(404, `Page not found: ${params.pageSlug}`);

  const result = await db
    .prepare('DELETE FROM collection_pages WHERE collection_id = ? AND page_id = ?')
    .bind(collection.id, page.id)
    .run();

  if (!result.meta.changes) {
    throw error(404, 'Page is not in this collection');
  }

  // Update collection's updated timestamp
  await db
    .prepare("UPDATE collections SET updated = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?")
    .bind(collection.id)
    .run();

  return json({ removed: true, page_slug: params.pageSlug });
};
