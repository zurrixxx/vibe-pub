import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, getPageByUrlSegment } from '$lib/server/db';
import { assertCanReadPage, toAccessViewer } from '$lib/server/access';
import { buildCanonicalPath } from '$lib/server/slug';

// Raw markdown endpoint: GET /<slug>-<id>.md returns the page's source markdown
// as text/markdown. For LLM agents and any tool that wants the source of
// truth without parsing HTML.
export const GET: RequestHandler = async ({ params, platform, url, locals }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await getPageByUrlSegment(db, params.slug);

  if (!page) throw error(404, 'Page not found');
  await assertCanReadPage(db, page, toAccessViewer(locals.user));

  const canonicalPath = buildCanonicalPath(page) + '.md';
  if (url.pathname !== canonicalPath) {
    throw redirect(301, canonicalPath + url.search);
  }

  return new Response(page.markdown, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      // Mirror the slug page's caching posture; tweak if pages page sets stricter.
      'cache-control': 'public, max-age=60, s-maxage=300',
      'x-content-type-options': 'nosniff',
    },
  });
};
