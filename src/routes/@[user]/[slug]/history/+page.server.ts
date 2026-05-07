import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb, getPageUserIdBySlug, getUserByUsername } from '$lib/server/db';

export const load: PageServerLoad = async ({ params, platform, url }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const user = await getUserByUsername(db, params.user);
  if (!user) throw error(404, 'User not found');

  const row = await getPageUserIdBySlug(db, params.slug);
  if (!row || row.user_id !== user.id) throw error(404, 'Page not found');

  throw redirect(308, `/${params.slug}/history${url.search}`);
};
