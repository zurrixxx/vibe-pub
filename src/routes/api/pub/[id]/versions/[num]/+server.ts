import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, getPageById, getPageVersionByPageIdAndVersion } from '$lib/server/db';
import { assertCanReadPage, toAccessViewer } from '$lib/server/access';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await getPageById(db, params.id);
  if (!page) throw error(404, 'Page not found');

  await assertCanReadPage(db, page, toAccessViewer(locals.user));

  const row = await getPageVersionByPageIdAndVersion(db, params.id, Number(params.num));
  if (!row) throw error(404, 'Version not found');

  return json(row);
};
