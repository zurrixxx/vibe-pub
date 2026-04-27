import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import type { Page } from '$lib/types';

export const GET: RequestHandler = async ({ params, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await db
    .prepare('SELECT * FROM pages WHERE slug = ? LIMIT 1')
    .bind(params.slug)
    .first<Page>();

  if (!page) throw error(404, 'Page not found');

  return json(page);
};
