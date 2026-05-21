import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import {
  assertCollectionAccessForOwner,
  assertCollectionOwner,
  PAGES_ORDER_SQL,
  getCollectionBySlug,
  readerGuideFromBody,
  readerGuideFromRow,
} from '$lib/templates/collection/server';

// Get collection details with parts and pages
export const GET: RequestHandler = async ({ params, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const collection = await db
    .prepare(
      `SELECT id, slug, title, description, readers_guide, what_its_about, who_its_for,
              how_to_read_it, user_id, access, theme, created, updated FROM collections WHERE slug = ?`
    )
    .bind(params.slug)
    .first<{
      id: string;
      slug: string;
      title: string;
      description: string | null;
      readers_guide: string | null;
      what_its_about: string | null;
      who_its_for: string | null;
      how_to_read_it: string | null;
      user_id: string | null;
      access: string;
      theme: string;
      created: string;
      updated: string;
    }>();

  if (!collection) throw error(404, 'Collection not found');

  const parts = await db
    .prepare(
      'SELECT id, title, sort_order FROM collection_parts WHERE collection_id = ? ORDER BY sort_order ASC'
    )
    .bind(collection.id)
    .all<{ id: string; title: string; sort_order: number }>();

  const pages = await db
    .prepare(
      `SELECT p.slug, p.title, p.view, cp.sort_order, cp.label, cp.part_id
       FROM collection_pages cp
       JOIN pages p ON p.id = cp.page_id
       LEFT JOIN collection_parts pt ON pt.id = cp.part_id
       WHERE cp.collection_id = ?
       ${PAGES_ORDER_SQL}`
    )
    .bind(collection.id)
    .all<{
      slug: string;
      title: string | null;
      view: string;
      sort_order: number;
      label: string | null;
      part_id: string | null;
    }>();

  return json({
    id: collection.id,
    slug: collection.slug,
    title: collection.title,
    description: collection.description,
    ...readerGuideFromRow(collection),
    access: collection.access,
    theme: collection.theme,
    created: collection.created,
    updated: collection.updated,
    parts: parts.results,
    pages: pages.results,
  });
};

// Update a collection (title, description, access)
export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const collection = await getCollectionBySlug(db, params.slug);
  if (!collection) throw error(404, 'Collection not found');
  assertCollectionOwner(collection, locals.user?.id);

  const body = await request.json();
  const { title, description, readers_guide, what_its_about, who_its_for, how_to_read_it, access } =
    body as {
      title?: string;
      description?: string;
      readers_guide?: string;
      what_its_about?: string;
      who_its_for?: string;
      how_to_read_it?: string;
      access?: string;
    };

  const readerGuide = readerGuideFromBody({
    readers_guide,
    what_its_about,
    who_its_for,
    how_to_read_it,
  });

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
  if (readerGuide.readers_guide !== undefined) {
    sets.push('readers_guide = ?');
    values.push(readerGuide.readers_guide);
  }
  if (readerGuide.what_its_about !== undefined) {
    sets.push('what_its_about = ?');
    values.push(readerGuide.what_its_about);
  }
  if (readerGuide.who_its_for !== undefined) {
    sets.push('who_its_for = ?');
    values.push(readerGuide.who_its_for);
  }
  if (readerGuide.how_to_read_it !== undefined) {
    sets.push('how_to_read_it = ?');
    values.push(readerGuide.how_to_read_it);
  }
  if (access !== undefined) {
    if (!['public', 'unlisted', 'private'].includes(access)) {
      throw error(400, 'access must be public, unlisted, or private');
    }
    assertCollectionAccessForOwner(access, collection.user_id);
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

  const updated = await db
    .prepare(
      `SELECT id, slug, title, description, readers_guide, what_its_about, who_its_for,
              how_to_read_it, access, theme, created, updated FROM collections WHERE id = ?`
    )
    .bind(collection.id)
    .first();

  return json(updated);
};
