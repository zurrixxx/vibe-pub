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

  // Load user's collections
  const collectionsResult = await db
    .prepare(
      'SELECT id, slug, title, description, access, updated FROM collections WHERE user_id = ? ORDER BY updated DESC'
    )
    .bind(user.id)
    .all<{
      id: string;
      slug: string;
      title: string;
      description: string | null;
      access: string;
      updated: string;
    }>();
  const collections = isOwner
    ? collectionsResult.results
    : collectionsResult.results.filter((c) => c.access !== 'private');

  // Load comment counts per page (for dashboard stats)
  const pageIds = visiblePages.map((p) => p.id);
  const commentCounts: Record<string, { total: number; unresolved: number }> = {};
  if (pageIds.length > 0) {
    const placeholders = pageIds.map(() => '?').join(',');
    const countResult = await db
      .prepare(
        `SELECT page_id, COUNT(*) as total, SUM(CASE WHEN resolved = 0 THEN 1 ELSE 0 END) as unresolved
         FROM comments WHERE page_id IN (${placeholders}) GROUP BY page_id`
      )
      .bind(...pageIds)
      .all<{ page_id: string; total: number; unresolved: number }>();
    for (const row of countResult.results) {
      commentCounts[row.page_id] = { total: row.total, unresolved: row.unresolved };
    }
  }

  return {
    profileUser: { username: user.username },
    pages: visiblePages,
    collections,
    isOwner,
    commentCounts,
  };
};
