import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { toAccessViewer } from '$lib/server/access';
import { buildCollectionMarkdownZip } from '$lib/templates/collection/server/export';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);
  const { filename, bytes } = await buildCollectionMarkdownZip(
    db,
    params.slug,
    toAccessViewer(locals.user)
  );

  return new Response(new Uint8Array(bytes), {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'private, max-age=60',
    },
  });
};
