// src/routes/[slug]/+page.server.ts
import { error, isHttpError } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb, getCommentsByPage } from '$lib/server/db';
import { renderMarkdown, parseFrontmatter } from '$lib/server/markdown';
import { parseBlocks } from '$lib/templates';
import { parseKanbanBlocks } from '$lib/templates/kanban/parser';
import { parseChangelogBlocks } from '$lib/templates/changelog/parser';
import { parseTimelineBlocks } from '$lib/templates/timeline/parser';
import { parseSlidesBlocks } from '$lib/templates/slides/parser';
import { parseDashboardBlocks } from '$lib/templates/dashboard/parser';

async function getPageBySlugPublic(db: D1Database, slug: string) {
  return db
    .prepare('SELECT * FROM pages WHERE slug = ?')
    .bind(slug)
    .first<import('$lib/types').Page>();
}

export const load: PageServerLoad = async ({ params, platform }) => {
  if (!platform) throw error(500, 'No platform');

  try {
    const db = getDb(platform);

    const page = await getPageBySlugPublic(db, params.slug);
    if (!page) throw error(404, 'Page not found');

    if (page.access === 'private') {
      throw error(403, 'This page is private');
    }

    // Strip frontmatter before rendering
    const { content, data: fm } = parseFrontmatter(page.markdown);
    // Kanban, changelog, timeline, and slides views don't need HTML rendering — skip expensive markdown pipeline
    const html =
      page.view === 'kanban' ||
      page.view === 'changelog' ||
      page.view === 'timeline' ||
      page.view === 'slides' ||
      page.view === 'dashboard'
        ? ''
        : await renderMarkdown(content);

    // Parse blocks and view-specific data
    const templateName = page.view || 'doc';
    let blocks: import('$lib/templates/types').Block[] = [];
    let kanbanData = null;
    let changelogData = null;
    let timelineData = null;
    let slidesData = null;
    let dashboardData = null;

    if (templateName === 'kanban') {
      try {
        const parsed = parseKanbanBlocks(page.markdown);
        blocks = parsed.blocks;
        kanbanData = {
          columns: parsed.columns,
          labels: parsed.labels,
        };
      } catch (e) {
        console.error('Kanban parse error:', e);
        kanbanData = { columns: [], labels: {} };
      }
    } else if (templateName === 'changelog') {
      try {
        const parsed = parseChangelogBlocks(page.markdown);
        blocks = parsed.blocks;
        changelogData = {
          releases: parsed.releases,
        };
      } catch (e) {
        console.error('Changelog parse error:', e);
        changelogData = { releases: [] };
      }
    } else if (templateName === 'timeline') {
      try {
        const parsed = parseTimelineBlocks(page.markdown);
        blocks = parsed.blocks;
        timelineData = {
          sections: parsed.sections,
        };
      } catch (e) {
        console.error('Timeline parse error:', e);
        timelineData = { sections: [] };
      }
    } else if (templateName === 'slides') {
      try {
        const parsed = parseSlidesBlocks(page.markdown);
        blocks = parsed.blocks;
        slidesData = {
          slides: parsed.slides,
        };
      } catch (e) {
        console.error('Slides parse error:', e);
        slidesData = { slides: [] };
      }
    } else if (templateName === 'dashboard') {
      try {
        const parsed = parseDashboardBlocks(page.markdown);
        blocks = parsed.blocks;
        dashboardData = {
          sections: parsed.sections,
        };
      } catch (e) {
        console.error('Dashboard parse error:', e);
        dashboardData = { sections: [] };
      }
    } else {
      try {
        blocks = parseBlocks(templateName, page.markdown);
      } catch (e) {
        console.error('Block parse error:', e);
      }
    }

    const comments = await getCommentsByPage(db, page.id);

    // Fetch page author username for byline
    let pageUser: { username: string } | null = null;
    if (page.user_id) {
      const u = await db
        .prepare('SELECT username FROM users WHERE id = ?')
        .bind(page.user_id)
        .first<{ username: string }>();
      if (u) pageUser = { username: u.username };
    }

    return {
      page,
      html,
      blocks,
      comments,
      frontmatter: fm,
      pageUser,
      kanbanData,
      changelogData,
      timelineData,
      slidesData,
      dashboardData,
    };
  } catch (e: unknown) {
    if (isHttpError(e)) throw e;
    console.error('Page load error:', e);
    throw error(500, `Failed to load page: ${e instanceof Error ? e.message : String(e)}`);
  }
};
