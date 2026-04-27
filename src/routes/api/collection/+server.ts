import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';

// Create a collection
export const POST: RequestHandler = async ({ request, locals, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const body = await request.json();
  const { title, slug, description, page_slugs, access, theme } = body as {
    title: string;
    slug?: string;
    description?: string;
    page_slugs: string[]; // ordered list of page slugs to include
    access?: string;
    theme?: string;
  };

  if (!title || !page_slugs?.length) {
    throw error(400, 'title and page_slugs are required');
  }

  const collectionSlug = slug || 'c-' + Math.random().toString(36).slice(2, 8);
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  // Resolve page slugs to IDs
  const placeholders = page_slugs.map(() => '?').join(',');
  const pages = await db
    .prepare(`SELECT id, slug FROM pages WHERE slug IN (${placeholders})`)
    .bind(...page_slugs)
    .all<{ id: string; slug: string }>();

  const pageMap = new Map(pages.results.map((p) => [p.slug, p.id]));

  await db
    .prepare(
      `INSERT INTO collections (id, slug, title, description, user_id, access, theme)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      collectionSlug,
      title,
      description ?? null,
      locals.user?.id ?? null,
      access ?? 'unlisted',
      theme ?? 'default'
    )
    .run();

  // Add pages in order
  for (let i = 0; i < page_slugs.length; i++) {
    const pageId = pageMap.get(page_slugs[i]);
    if (pageId) {
      await db
        .prepare(
          'INSERT INTO collection_pages (collection_id, page_id, sort_order) VALUES (?, ?, ?)'
        )
        .bind(id, pageId, i)
        .run();
    }
  }

  const baseUrl = platform.env.BASE_URL ?? 'https://vibe.pub';
  return json({ id, slug: collectionSlug, url: `${baseUrl}/c/${collectionSlug}` }, { status: 201 });
};
