import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb, getPageBySlugGlobal } from '$lib/server/db';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await getPageBySlugGlobal(db, params.slug);
  if (!page) throw error(404, 'Page not found');

  // Version history is only visible to the page owner (claimed pages only).
  if (!page.user_id || locals.user?.id !== page.user_id) {
    throw error(403, 'Not authorized');
  }

  const versions = await db
    .prepare(
      'SELECT version, title, created FROM page_versions WHERE page_id = ? ORDER BY version DESC'
    )
    .bind(page.id)
    .all<{ version: number; title: string | null; created: string }>();

  const versionDetails = await db
    .prepare(
      'SELECT version, title, markdown, created FROM page_versions WHERE page_id = ? ORDER BY version DESC'
    )
    .bind(page.id)
    .all<{ version: number; title: string | null; markdown: string; created: string }>();

  return {
    page: {
      id: page.id,
      slug: page.slug,
      title: page.title,
      markdown: page.markdown,
      updated: page.updated,
    },
    versions: versions.results,
    versionDetails: versionDetails.results,
  };
};
