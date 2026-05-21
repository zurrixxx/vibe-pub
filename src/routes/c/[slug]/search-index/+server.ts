import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { loadCollectionSearchIndex } from '$lib/templates/collection/server/search-index';

export const GET: RequestHandler = async ({ params, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);
  const entries = await loadCollectionSearchIndex(db, params.slug);
  return json({ entries });
};
