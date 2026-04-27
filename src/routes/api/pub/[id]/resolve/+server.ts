import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, getPageById } from '$lib/server/db';

export const POST: RequestHandler = async ({ params, request, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await getPageById(db, params.id);
  if (!page) throw error(404, 'Page not found');

  const body = await request.json();

  if (body.all) {
    await db.prepare('UPDATE comments SET resolved = 1 WHERE page_id = ?').bind(params.id).run();
    return json({ resolved: 'all' });
  }

  if (Array.isArray(body.comment_ids) && body.comment_ids.length > 0) {
    const placeholders = body.comment_ids.map(() => '?').join(', ');
    await db
      .prepare(`UPDATE comments SET resolved = 1 WHERE page_id = ? AND id IN (${placeholders})`)
      .bind(params.id, ...body.comment_ids)
      .run();
    return json({ resolved: body.comment_ids });
  }

  throw error(400, 'Provide comment_ids array or { all: true }');
};
