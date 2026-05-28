import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { toAccessViewer } from '$lib/server/access';
import { loadSearchIndex } from '$lib/templates/collection/server/search-index';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);
  const entries = await loadSearchIndex(db, params.slug, toAccessViewer(locals.user));
  return json({ entries });
};
