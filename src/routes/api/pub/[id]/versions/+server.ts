import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, getPageById, getPageVersionsByPageId, getUserById } from '$lib/server/db';
import { deltaStat } from '$lib/version-delta';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await getPageById(db, params.id);
  if (!page) throw error(404, 'Page not found');

  if (page.access === 'private') {
    if (!page.user_id || locals.user?.id !== page.user_id) {
      throw error(403, 'Not authorized');
    }
  }

  const rows = await getPageVersionsByPageId(db, params.id);
  let authorUsername: string | null = null;
  if (page.user_id) {
    const u = await getUserById(db, page.user_id);
    authorUsername = u?.username ?? null;
  }

  const payload = rows.map((row, i: number) => {
    const prevMarkdown = i + 1 < rows.length ? rows[i + 1].markdown : null;
    const { add, rem } = deltaStat(prevMarkdown, row.markdown);
    const lines = row.markdown.split('\n').length;
    return {
      version: row.version,
      title: row.title,
      created: row.created,
      lines,
      lines_added: add,
      lines_removed: rem,
      author_username: authorUsername,
    };
  });

  return json(payload);
};
