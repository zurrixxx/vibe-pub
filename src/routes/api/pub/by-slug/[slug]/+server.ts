import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, getPageByUrlSegment } from '$lib/server/db';
import { assertCanReadPage, toAccessViewer } from '$lib/server/access';

// Legacy route: kept as a thin alias so older CLI/MCP clients still work.
// The `[slug]` param is treated as a URL fragment — bare id or `<slug>-<id>`.
export const GET: RequestHandler = async ({ params, platform, locals }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await getPageByUrlSegment(db, params.slug);

  if (!page) throw error(404, 'Page not found');

  await assertCanReadPage(db, page, toAccessViewer(locals.user));

  return json(page);
};
