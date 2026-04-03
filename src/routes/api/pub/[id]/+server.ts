import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, getPageById, updatePage, deletePage } from '$lib/server/db';
import { parseFrontmatter } from '$lib/server/markdown';

export const GET: RequestHandler = async ({ params, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await getPageById(db, params.id);
  if (!page) throw error(404, 'Page not found');

  return json(page);
};

export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await getPageById(db, params.id);
  if (!page) throw error(404, 'Page not found');

  // Owner check — only the owner (or anon pages if no user) can update
  if (page.user_id !== null) {
    if (!locals.user || locals.user.id !== page.user_id) {
      throw error(403, 'Forbidden');
    }
  }

  const contentType = request.headers.get('content-type') ?? '';
  let markdown: string | undefined;
  let viewOverride: string | undefined;
  let accessOverride: string | undefined;
  let titleOverride: string | undefined;

  if (contentType.includes('application/json')) {
    const body = await request.json();
    markdown = body.markdown;
    viewOverride = body.view;
    accessOverride = body.access;
    titleOverride = body.title;
  } else {
    markdown = await request.text() || undefined;
  }

  // Re-parse frontmatter if markdown is being updated
  if (markdown) {
    const { data: fm } = parseFrontmatter(markdown);
    viewOverride = viewOverride ?? fm.view;
    accessOverride = accessOverride ?? fm.access;
    titleOverride = titleOverride ?? fm.title;
  }

  await updatePage(db, params.id, {
    markdown,
    view: viewOverride,
    access: accessOverride,
    title: titleOverride
  });

  const updated = await getPageById(db, params.id);
  return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await getPageById(db, params.id);
  if (!page) throw error(404, 'Page not found');

  // Owner check
  if (page.user_id !== null) {
    if (!locals.user || locals.user.id !== page.user_id) {
      throw error(403, 'Forbidden');
    }
  }

  await deletePage(db, params.id);
  return new Response(null, { status: 204 });
};
