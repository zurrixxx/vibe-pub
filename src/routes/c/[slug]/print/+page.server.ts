import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { loadCollectionPrintChapters } from '$lib/templates/collection/server/export';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);
  return loadCollectionPrintChapters(db, params.slug, locals.user?.id);
};
