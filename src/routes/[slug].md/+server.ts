import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import type { Page } from '$lib/types';

// Raw markdown endpoint: GET /<slug>.md returns the page's source markdown
// as text/markdown. For LLM agents and any tool that wants the source of
// truth without parsing HTML.
export const GET: RequestHandler = async ({ params, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await db
    .prepare('SELECT * FROM pages WHERE slug = ?')
    .bind(params.slug)
    .first<Page>();

  if (!page) throw error(404, 'Page not found');
  if (page.access === 'private') throw error(403, 'This page is private');

  return new Response(page.markdown, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      // Mirror the slug page's caching posture; tweak if pages page sets stricter.
      'cache-control': 'public, max-age=60, s-maxage=300',
      'x-content-type-options': 'nosniff',
    },
  });
};
