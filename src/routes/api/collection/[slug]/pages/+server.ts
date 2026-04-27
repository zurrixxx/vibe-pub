import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';

// Add a page to a collection
export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
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

  const body = await request.json();
  const { page_slug, label } = body as { page_slug: string; label?: string };

  if (!page_slug) throw error(400, 'page_slug is required');

  // Resolve page slug to ID
  const page = await db
    .prepare('SELECT id FROM pages WHERE slug = ?')
    .bind(page_slug)
    .first<{ id: string }>();

  if (!page) throw error(404, `Page not found: ${page_slug}`);

  // Get next sort_order
  const maxOrder = await db
    .prepare('SELECT MAX(sort_order) as max_order FROM collection_pages WHERE collection_id = ?')
    .bind(collection.id)
    .first<{ max_order: number | null }>();

  const nextOrder = (maxOrder?.max_order ?? -1) + 1;

  await db
    .prepare(
      'INSERT INTO collection_pages (collection_id, page_id, sort_order, label) VALUES (?, ?, ?, ?)'
    )
    .bind(collection.id, page.id, nextOrder, label ?? null)
    .run();

  // Update collection's updated timestamp
  await db
    .prepare("UPDATE collections SET updated = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?")
    .bind(collection.id)
    .run();

  return json({ added: true, page_slug, sort_order: nextOrder }, { status: 201 });
};
