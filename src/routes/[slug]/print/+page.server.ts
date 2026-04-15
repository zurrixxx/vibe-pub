import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { renderMarkdown, parseFrontmatter } from '$lib/server/markdown';

export const load: PageServerLoad = async ({ params, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await db
    .prepare('SELECT * FROM pages WHERE slug = ?')
    .bind(params.slug)
    .first<import('$lib/types').Page>();

  if (!page) throw error(404, 'Page not found');
  if (page.access === 'private') throw error(403, 'Private');

  const { content, data: fm } = parseFrontmatter(page.markdown);
  const html = await renderMarkdown(content);

  return {
    title: page.title ?? fm.title ?? page.slug,
    html,
    slug: page.slug,
    created: page.created,
    updated: page.updated,
  };
};
