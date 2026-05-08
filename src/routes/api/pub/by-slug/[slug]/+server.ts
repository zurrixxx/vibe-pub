import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, getPageBySlugGlobal } from '$lib/server/db';

export const GET: RequestHandler = async ({ params, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await getPageBySlugGlobal(db, params.slug);

  if (!page) throw error(404, 'Page not found');

  return json(page);
};
