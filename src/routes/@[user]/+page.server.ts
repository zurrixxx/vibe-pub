import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserByUsername, getPagesByUser } from '$lib/server/db';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
  if (!platform) throw error(500, 'Platform not available');
  const db = platform.env.DB;

  const user = await getUserByUsername(db, params.user);
  if (!user) throw error(404, 'User not found');

  const pages = await getPagesByUser(db, user.id);
  const isOwner = locals.user?.id === user.id;
  const visiblePages = isOwner ? pages : pages.filter((p) => p.access !== 'private');

  return {
    profileUser: { username: user.username },
    pages: visiblePages,
    isOwner,
  };
};
