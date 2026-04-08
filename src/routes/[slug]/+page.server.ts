// src/routes/[slug]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb, getCommentsByPage } from '$lib/server/db';
import { renderMarkdown, parseFrontmatter } from '$lib/server/markdown';
import { parseBlocks } from '$lib/templates';

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
  const { content, data: fm } = parseFrontmatter(page.markdown);
  const html = await renderMarkdown(content);

  // Parse blocks using the template system
  const templateName = page.view || 'doc';
  const blocks = parseBlocks(templateName, page.markdown);

  const comments = await getCommentsByPage(db, page.id);

  return {
    page,
    html,
    blocks,
    comments,
    frontmatter: fm,
  };
};
