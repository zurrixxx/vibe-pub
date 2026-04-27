import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';

// Get collection details with its pages
export const GET: RequestHandler = async ({ params, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const collection = await db
    .prepare(
      'SELECT id, slug, title, description, user_id, access, theme, created, updated FROM collections WHERE slug = ?'
    )
    .bind(params.slug)
    .first<{
      id: string;
      slug: string;
      title: string;
      description: string | null;
      user_id: string | null;
      access: string;
      theme: string;
      created: string;
      updated: string;
    }>();

  if (!collection) throw error(404, 'Collection not found');

  const pages = await db
    .prepare(
      `SELECT p.slug, p.title, p.view, cp.sort_order, cp.label
       FROM collection_pages cp
       JOIN pages p ON p.id = cp.page_id
       WHERE cp.collection_id = ?
       ORDER BY cp.sort_order ASC`
    )
    .bind(collection.id)
    .all<{
      slug: string;
      title: string | null;
      view: string;
      sort_order: number;
      label: string | null;
    }>();

  return json({
    id: collection.id,
    slug: collection.slug,
    title: collection.title,
    description: collection.description,
    access: collection.access,
    theme: collection.theme,
    created: collection.created,
    updated: collection.updated,
    pages: pages.results,
  });
};

// Update a collection (title, description, access)
export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const collection = await db
    .prepare('SELECT id, user_id FROM collections WHERE slug = ?')
    .bind(params.slug)
    .first<{ id: string; user_id: string | null }>();

  if (!collection) throw error(404, 'Collection not found');

  // Owner check: if collection has a user_id, verify it matches
  if (collection.user_id && locals.user?.id !== collection.user_id) {
    throw error(403, 'Not authorized');
  }

  const body = await request.json();
  const { title, description, access } = body as {
    title?: string;
    description?: string;
    access?: string;
  };

  const sets: string[] = [];
  const values: (string | null)[] = [];

  if (title !== undefined) {
    sets.push('title = ?');
    values.push(title);
  }
  if (description !== undefined) {
    sets.push('description = ?');
    values.push(description);
  }
  if (access !== undefined) {
    if (!['public', 'unlisted', 'private'].includes(access)) {
      throw error(400, 'access must be public, unlisted, or private');
    }
    sets.push('access = ?');
    values.push(access);
  }

  if (sets.length === 0) throw error(400, 'No fields to update');

  sets.push("updated = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')");
  values.push(collection.id);

  await db
    .prepare(`UPDATE collections SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  // Return updated collection
  const updated = await db
    .prepare(
      'SELECT id, slug, title, description, access, theme, created, updated FROM collections WHERE id = ?'
    )
    .bind(collection.id)
    .first();

  return json(updated);
};
