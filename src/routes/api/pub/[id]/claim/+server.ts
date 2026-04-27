import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, getPageById } from '$lib/server/db';

export const POST: RequestHandler = async ({ params, locals, platform }) => {
  if (!platform) throw error(500, 'No platform');
  if (!locals.user) throw error(401, 'Login required to claim a page');

  const db = getDb(platform);
  const page = await getPageById(db, params.id);
  if (!page) throw error(404, 'Page not found');

  if (page.user_id) {
    throw error(400, 'Page already has an owner');
  }

  await db
    .prepare('UPDATE pages SET user_id = ? WHERE id = ? AND user_id IS NULL')
    .bind(locals.user.id, params.id)
    .run();

  return json({ claimed: true, slug: page.slug });
};
