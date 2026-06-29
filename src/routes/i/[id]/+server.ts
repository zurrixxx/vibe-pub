import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, getPageById } from '$lib/server/db';
import { getAssetById } from '$lib/server/assets';
import { assertCanReadPage, toAccessViewer } from '$lib/server/access';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const asset = await getAssetById(db, params.id);
  if (!asset) throw error(404, 'Image not found');

  const page = await getPageById(db, asset.page_id);
  if (!page) throw error(404, 'Image not found');

  await assertCanReadPage(db, page, toAccessViewer(locals.user));

  return new Response(asset.data, {
    headers: {
      'Content-Type': asset.mime_type,
      'Content-Length': String(asset.size_bytes),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
