import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getDb, getCommentsByPage } from "$lib/server/db";
import { renderMarkdown, parseFrontmatter } from "$lib/server/markdown";
import { parseKanbanBlocks } from "$lib/templates/kanban/parser";

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
  slug: string;
  title: string | null;
  markdown: string;
  view: string;
}

export const load: PageServerLoad = async ({ params, url, platform }) => {
  if (!platform) throw error(500, "No platform");
  const db = getDb(platform);

  // Get collection
  const collection = await db
    .prepare("SELECT * FROM collections WHERE slug = ?")
    .bind(params.slug)
    .first<CollectionRow>();

  if (!collection) throw error(404, "Collection not found");

  if (collection.access === "private") {
    throw error(403, "This collection is private");
  }

  // Get pages in order
  const pagesResult = await db
    .prepare(
      `
      SELECT cp.page_id, cp.sort_order, cp.label, p.slug, p.title, p.markdown, p.view
      FROM collection_pages cp
      JOIN pages p ON cp.page_id = p.id
      WHERE cp.collection_id = ?
      ORDER BY cp.sort_order ASC
    `,
    )
    .bind(collection.id)
    .all<CollectionPageRow>();

  const pages = pagesResult.results;

  if (pages.length === 0) throw error(404, "Collection is empty");

  // Determine active page (from ?page= query param, or first page)
  const activeSlug = url.searchParams.get("page") ?? pages[0].slug;
  const activePage = pages.find((p) => p.slug === activeSlug) ?? pages[0];

  // Render active page content
  const { content, data: fm } = parseFrontmatter(activePage.markdown);
  const isKanban = activePage.view === "kanban";
  const html = isKanban ? "" : await renderMarkdown(content);
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
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
      });
    }
    return { slug: p.slug, title: p.label ?? p.title ?? p.slug, headings };
  });

  return {
    collection: {
      title: collection.title,
      slug: collection.slug,
      description: collection.description,
      theme: collection.theme,
    },
    pages: pages.map((p) => ({
      slug: p.slug,
      title: p.label ?? p.title ?? p.slug,
      view: p.view,
      active: p.slug === activePage.slug,
    })),
    activePage: {
      id: activePage.page_id,
      slug: activePage.slug,
      title: activePage.title,
      markdown: activePage.markdown,
      view: activePage.view,
      html,
      comments,
      frontmatter: fm,
      kanbanData,
    },
    allHeadings,
  };
};
