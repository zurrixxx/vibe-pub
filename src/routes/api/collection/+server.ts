import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';

// List collections for the authenticated user
export const GET: RequestHandler = async ({ locals, platform }) => {
  if (!locals.user) throw error(401, 'Authentication required');
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const collections = await db
    .prepare(
      `SELECT id, slug, title, description, access, theme, created, updated
       FROM collections WHERE user_id = ? ORDER BY updated DESC`
    )
    .bind(locals.user.id)
    .all<{
      id: string;
      slug: string;
      title: string;
      description: string | null;
      access: string;
      theme: string;
      created: string;
      updated: string;
    }>();

  const baseUrl = platform.env.BASE_URL ?? 'https://vibe.pub';
  return json(
    collections.results.map((c) => ({
      ...c,
      url: `${baseUrl}/c/${c.slug}`,
    }))
  );
};

// Create a collection
export const POST: RequestHandler = async ({ request, locals, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const body = await request.json();
  const { title, slug, description, page_slugs, access, theme } = body as {
    title: string;
    slug?: string;
    description?: string;
    page_slugs?: string[]; // ordered list of page slugs to include
    access?: string;
    theme?: string;
  };

  if (!title) {
    throw error(400, 'title is required');
  }

  const collectionSlug = slug || 'c-' + Math.random().toString(36).slice(2, 8);
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  // Resolve page slugs to IDs (if any provided)
  const slugs = page_slugs ?? [];
  const pageMap = new Map<string, string>();
  if (slugs.length > 0) {
    const placeholders = slugs.map(() => '?').join(',');
    const pages = await db
      .prepare(`SELECT id, slug FROM pages WHERE slug IN (${placeholders})`)
      .bind(...slugs)
      .all<{ id: string; slug: string }>();
    for (const p of pages.results) {
      pageMap.set(p.slug, p.id);
    }
  }

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
  for (let i = 0; i < slugs.length; i++) {
    const pageId = pageMap.get(slugs[i]);
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
