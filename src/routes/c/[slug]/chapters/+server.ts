import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { loadAllCollectionReaderChapters } from '$lib/templates/collection/server/reader-chapter';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);
  const chapters = await loadAllCollectionReaderChapters(db, params.slug, locals.user?.id);
  return json({ chapters });
};
