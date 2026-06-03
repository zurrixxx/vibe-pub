import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, getPageByUrlSegment } from '$lib/server/db';
import {
  newCollectionEntityId,
  readerGuideFromBody,
  resolveCollectionAccess,
} from '$lib/templates/collection/server';

// List collections for the authenticated user
export const GET: RequestHandler = async ({ locals, platform }) => {
  if (!locals.user) throw error(401, 'Authentication required');
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const collections = await db
    .prepare(
      `SELECT id, slug, title, description, readers_guide, what_its_about, who_its_for,
              how_to_read_it, access, theme, created, updated, agent_published
       FROM collections WHERE user_id = ? ORDER BY updated DESC`
    )
    .bind(locals.user.id)
    .all<{
      id: string;
      slug: string;
      title: string;
      description: string | null;
      readers_guide: string | null;
      what_its_about: string | null;
      who_its_for: string | null;
      how_to_read_it: string | null;
      access: string;
      theme: string;
      created: string;
      updated: string;
      agent_published: number;
    }>();

  const baseUrl = platform.env.BASE_URL ?? 'https://vibe.pub';
  return json(
    collections.results.map((c) => ({
      ...c,
      agent_published: c.agent_published === 1,
      url: `${baseUrl}/c/${c.slug}`,
    }))
  );
};

export interface CreatePartInput {
  title: string;
  page_slugs?: string[];
}

interface CreatedPartPage {
  slug: string;
  added: boolean;
}

interface CreatedPart {
  id: string;
  title: string;
  sort_order: number;
  pages: CreatedPartPage[];
}

async function resolvePageSlugs(
  db: ReturnType<typeof getDb>,
  segments: string[]
): Promise<Map<string, string>> {
  const pageMap = new Map<string, string>();
  for (const segment of segments) {
    const page = await getPageByUrlSegment(db, segment);
    if (page) pageMap.set(segment, page.id);
  }
  return pageMap;
}

async function insertUngroupedPages(
  db: ReturnType<typeof getDb>,
  collectionId: string,
  slugs: string[],
  pageMap: Map<string, string>
): Promise<CreatedPartPage[]> {
  const result: CreatedPartPage[] = [];
  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    const pageId = pageMap.get(slug);
    const added = Boolean(pageId);
    if (pageId) {
      await db
        .prepare(
          'INSERT INTO collection_pages (collection_id, page_id, sort_order) VALUES (?, ?, ?)'
        )
        .bind(collectionId, pageId, i)
        .run();
    }
    result.push({ slug, added });
  }
  return result;
}

// Create a collection (optionally with parts and/or ungrouped pages)
export const POST: RequestHandler = async ({ request, locals, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const body = await request.json();
  const {
    title,
    slug,
    description,
    readers_guide,
    what_its_about,
    who_its_for,
    how_to_read_it,
    page_slugs,
    parts,
    access,
    theme,
    agent_published,
  } = body as {
    title: string;
    slug?: string;
    description?: string;
    readers_guide?: string;
    what_its_about?: string;
    who_its_for?: string;
    how_to_read_it?: string;
    page_slugs?: string[];
    parts?: CreatePartInput[];
    access?: string;
    theme?: string;
    agent_published?: boolean;
  };

  const readerGuide = readerGuideFromBody({
    readers_guide,
    what_its_about,
    who_its_for,
    how_to_read_it,
  });

  if (!title?.trim()) {
    throw error(400, 'title is required');
  }

  if (parts !== undefined && !Array.isArray(parts)) {
    throw error(400, 'parts must be an array');
  }

  const normalizedParts =
    parts
      ?.map((p) => ({
        title: p.title?.trim() ?? '',
        page_slugs: p.page_slugs ?? [],
      }))
      .filter((p) => p.title) ?? [];

  if (parts?.length && normalizedParts.length === 0) {
    throw error(400, 'each part must have a non-empty title');
  }

  const collectionSlug = slug || 'c-' + Math.random().toString(36).slice(2, 8);
  const id = newCollectionEntityId();

  const allSlugs: string[] = [];
  for (const part of normalizedParts) {
    if (part.page_slugs.length) allSlugs.push(...part.page_slugs);
  }
  if (page_slugs?.length) allSlugs.push(...page_slugs);

  const pageMap = await resolvePageSlugs(db, allSlugs);
  const ownerId = locals.user?.id ?? null;
  const effectiveAccess = resolveCollectionAccess(access, ownerId);
  /** Omitted or true → agent (CLI/API default); only explicit false → manual (web form). */
  const agentPublished = agent_published === false ? 0 : 1;

  await db
    .prepare(
      `INSERT INTO collections (
         id, slug, title, description, readers_guide, what_its_about, who_its_for,
         how_to_read_it, user_id, access, theme, agent_published
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      collectionSlug,
      title.trim(),
      description ?? null,
      readerGuide.readers_guide ?? null,
      readerGuide.what_its_about ?? null,
      readerGuide.who_its_for ?? null,
      readerGuide.how_to_read_it ?? null,
      ownerId,
      effectiveAccess,
      theme ?? 'default',
      agentPublished
    )
    .run();

  const createdParts: CreatedPart[] = [];

  for (let pi = 0; pi < normalizedParts.length; pi++) {
    const partInput = normalizedParts[pi];
    const partId = newCollectionEntityId();
    await db
      .prepare(
        'INSERT INTO collection_parts (id, collection_id, title, sort_order) VALUES (?, ?, ?, ?)'
      )
      .bind(partId, id, partInput.title, pi)
      .run();

    const partPages: CreatedPartPage[] = [];
    for (let i = 0; i < partInput.page_slugs.length; i++) {
      const pageSlug = partInput.page_slugs[i];
      const pageId = pageMap.get(pageSlug);
      const added = Boolean(pageId);
      if (pageId) {
        await db
          .prepare(
            'INSERT INTO collection_pages (collection_id, page_id, sort_order, part_id) VALUES (?, ?, ?, ?)'
          )
          .bind(id, pageId, i, partId)
          .run();
      }
      partPages.push({ slug: pageSlug, added });
    }

    createdParts.push({
      id: partId,
      title: partInput.title,
      sort_order: pi,
      pages: partPages,
    });
  }

  const ungroupedPages = page_slugs?.length
    ? await insertUngroupedPages(db, id, page_slugs, pageMap)
    : [];

  const baseUrl = platform.env.BASE_URL ?? 'https://vibe.pub';
  return json(
    {
      id,
      slug: collectionSlug,
      url: `${baseUrl}/c/${collectionSlug}`,
      agent_published: agentPublished === 1,
      parts: createdParts,
      ungrouped_pages: ungroupedPages,
    },
    { status: 201 }
  );
};
