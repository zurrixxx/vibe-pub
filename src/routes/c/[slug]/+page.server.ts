import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb, getCommentsByPage } from '$lib/server/db';
import { renderMarkdown, parseFrontmatter } from '$lib/server/markdown';
import { buildCanonicalPath } from '$lib/server/slug';
import { parseKanbanBlocks } from '$lib/templates/kanban/parser';

interface CollectionRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  user_id: string | null;
  access: string;
  theme: string;
}

interface CollectionPageRow {
  page_id: string;
  sort_order: number;
  label: string | null;
  id: string;
  slug: string;
  title: string | null;
  markdown: string;
  view: string;
  updated: string;
}

export const load: PageServerLoad = async ({ params, url, platform, depends }) => {
  // Re-run when ?page= query param changes
  depends(`collection:${params.slug}:${url.searchParams.get('page') ?? ''}`);

  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  // Get collection
  const collection = await db
    .prepare('SELECT * FROM collections WHERE slug = ?')
    .bind(params.slug)
    .first<CollectionRow>();

  if (!collection) throw error(404, 'Collection not found');

  if (collection.access === 'private') {
    throw error(403, 'This collection is private');
  }

  // Get pages in order
  const pagesResult = await db
    .prepare(
      `
      SELECT cp.page_id, cp.sort_order, cp.label, p.id, p.slug, p.title, p.markdown, p.view, p.updated
      FROM collection_pages cp
      JOIN pages p ON cp.page_id = p.id
      WHERE cp.collection_id = ?
      ORDER BY cp.sort_order ASC
    `
    )
    .bind(collection.id)
    .all<CollectionPageRow>();

  const pages = pagesResult.results;

  // Empty collection — return minimal data so the page can render an empty state
  if (pages.length === 0) {
    return {
      collection: {
        title: collection.title,
        slug: collection.slug,
        description: collection.description,
        theme: collection.theme,
      },
      pages: [],
      activePage: null,
      allHeadings: [],
    };
  }

  // Determine active page (from ?page= query param, or first page).
  // The query param accepts the page id (matches what serialize/links emit).
  const activeKey = url.searchParams.get('page') ?? pages[0].id;
  const activePage = pages.find((p) => p.id === activeKey) ?? pages[0];

  // Render active page content
  const { content, data: fm } = parseFrontmatter(activePage.markdown);
  const isKanban = activePage.view === 'kanban';
  const html = isKanban ? '' : await renderMarkdown(content);
  const comments = await getCommentsByPage(db, activePage.page_id);

  // Parse kanban data server-side if needed
  let kanbanData = null;
  if (isKanban) {
    try {
      const parsed = parseKanbanBlocks(activePage.markdown);
      kanbanData = { columns: parsed.columns, labels: parsed.labels };
    } catch {
      kanbanData = { columns: [], labels: {} };
    }
  }

  // Extract headings from all pages for collection outline
  const allHeadings = pages.map((p) => {
    const headings: { text: string; level: number; id: string }[] = [];
    const hRegex = /^(#{1,3})\s+(.+)/gm;
    const { content: c } = parseFrontmatter(p.markdown);
    let m;
    while ((m = hRegex.exec(c)) !== null) {
      const text = m[2].trim();
      headings.push({
        level: m[1].length,
        text,
        id: text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
      });
    }
    return { id: p.id, title: p.label ?? p.title ?? p.id, headings };
  });

  return {
    collection: {
      title: collection.title,
      slug: collection.slug,
      description: collection.description,
      theme: collection.theme,
    },
    pages: pages.map((p) => ({
      id: p.id,
      title: p.label ?? p.title ?? p.id,
      view: p.view,
      active: p.id === activePage.id,
    })),
    activePage: {
      id: activePage.page_id,
      slug: activePage.slug,
      title: activePage.title,
      markdown: activePage.markdown,
      view: activePage.view,
      updated: activePage.updated,
      html,
      comments,
      frontmatter: fm,
      kanbanData,
      sourceMarkdownHref:
        buildCanonicalPath({
          id: activePage.page_id,
          slug: activePage.slug,
          title: activePage.title,
        }) + '.md',
    },
    allHeadings,
  };
};
