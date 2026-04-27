import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, getPageById } from '$lib/server/db';

export const GET: RequestHandler = async ({ params, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await getPageById(db, params.id);
  if (!page) throw error(404, 'Page not found');

  const version = await db
    .prepare(
      'SELECT version, markdown, title, created FROM page_versions WHERE page_id = ? AND version = ?'
    )
    .bind(params.id, Number(params.num))
    .first<{ version: number; markdown: string; title: string | null; created: string }>();

  if (!version) throw error(404, 'Version not found');

  return json(version);
};
