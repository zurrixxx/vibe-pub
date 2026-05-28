import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { toAccessViewer } from '$lib/server/access';
import { loadReaderChapter } from '$lib/templates/collection/server/reader-chapter';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);
  const chapter = await loadReaderChapter(
    db,
    params.slug,
    params.pageId,
    toAccessViewer(locals.user)
  );
  return json(chapter);
};
