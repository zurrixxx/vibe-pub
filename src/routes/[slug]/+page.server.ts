import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb, getCommentsByPage } from '$lib/server/db';
import { renderMarkdown, parseFrontmatter } from '$lib/server/markdown';

// Anonymous slug lookup — no userId filter
async function getPageBySlugPublic(db: D1Database, slug: string) {
  return db.prepare('SELECT * FROM pages WHERE slug = ?').bind(slug).first<import('$lib/types').Page>();
}

export const load: PageServerLoad = async ({ params, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await getPageBySlugPublic(db, params.slug);
  if (!page) throw error(404, 'Page not found');

  if (page.access === 'private') {
    throw error(403, 'This page is private');
  }

  // Strip frontmatter before rendering
  const { content } = parseFrontmatter(page.markdown);
  const html = await renderMarkdown(content);

  const comments = await getCommentsByPage(db, page.id);

  return {
    page,
    html,
    comments
  };
};
