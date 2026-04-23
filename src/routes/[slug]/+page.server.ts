// src/routes/[slug]/+page.server.ts
import { error, isHttpError } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getDb, getCommentsByPage } from "$lib/server/db";
import { renderMarkdown, parseFrontmatter } from "$lib/server/markdown";
import { parseBlocks } from "$lib/templates";
import { parseKanbanBlocks } from "$lib/templates/kanban/parser";

async function getPageBySlugPublic(db: D1Database, slug: string) {
  return db
    .prepare("SELECT * FROM pages WHERE slug = ?")
    .bind(slug)
    .first<import("$lib/types").Page>();
}

export const load: PageServerLoad = async ({ params, platform }) => {
  if (!platform) throw error(500, "No platform");

  try {
    const db = getDb(platform);

    const page = await getPageBySlugPublic(db, params.slug);
    if (!page) throw error(404, "Page not found");

    if (page.access === "private") {
      throw error(403, "This page is private");
    }

    // Strip frontmatter before rendering
    const { content, data: fm } = parseFrontmatter(page.markdown);
    // Kanban view doesn't need HTML rendering — skip expensive markdown pipeline
    const html = page.view === "kanban" ? "" : await renderMarkdown(content);

    // Parse blocks and kanban data
    const templateName = page.view || "doc";
    let blocks: import("$lib/templates/types").Block[] = [];
    let kanbanData = null;

    if (templateName === "kanban") {
      try {
        const parsed = parseKanbanBlocks(page.markdown);
        blocks = parsed.blocks;
        kanbanData = {
          columns: parsed.columns,
          labels: parsed.labels,
        };
      } catch (e) {
        console.error("Kanban parse error:", e);
        kanbanData = { columns: [], labels: {} };
      }
    } else {
      try {
        blocks = parseBlocks(templateName, page.markdown);
      } catch (e) {
        console.error("Block parse error:", e);
      }
    }

    const comments = await getCommentsByPage(db, page.id);

    return {
      page,
      html,
      blocks,
      comments,
      frontmatter: fm,
      kanbanData,
    };
  } catch (e: unknown) {
    if (isHttpError(e)) throw e;
    console.error("Page load error:", e);
    throw error(
      500,
      `Failed to load page: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
};
