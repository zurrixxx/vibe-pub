import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  getDb,
  getPageById,
  resolveAllCommentsForPage,
  resolveCommentsForPageByIds,
} from '$lib/server/db';

export const POST: RequestHandler = async ({ params, request, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await getPageById(db, params.id);
  if (!page) throw error(404, 'Page not found');

  const body = await request.json();

  if (body.all) {
    await resolveAllCommentsForPage(db, params.id);
    return json({ resolved: 'all' });
  }

  if (Array.isArray(body.comment_ids) && body.comment_ids.length > 0) {
    await resolveCommentsForPageByIds(db, params.id, body.comment_ids);
    return json({ resolved: body.comment_ids });
  }

  throw error(400, 'Provide comment_ids array or { all: true }');
};
