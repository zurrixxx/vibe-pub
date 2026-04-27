import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, getPageById } from '$lib/server/db';

export const GET: RequestHandler = async ({ params, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await getPageById(db, params.id);
  if (!page) throw error(404, 'Page not found');

  const result = await db
    .prepare(
      'SELECT version, title, created FROM page_versions WHERE page_id = ? ORDER BY version DESC'
    )
    .bind(params.id)
    .all<{ version: number; title: string | null; created: string }>();

  return json(result.results);
};
