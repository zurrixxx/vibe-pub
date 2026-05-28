// src/routes/[slug]/+page.server.ts
import { error, isHttpError, redirect, isRedirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb, getCommentsByPage, getPageByUrlSegment } from '$lib/server/db';
import {
  assertCanReadPage,
  canWrite,
  getEffectiveRoleForPage,
  toAccessViewer,
} from '$lib/server/access';
import { buildCanonicalPath } from '$lib/server/slug';
import { renderMarkdown, parseFrontmatter } from '$lib/server/markdown';
import { parseBlocks } from '$lib/templates';
import { parseKanbanBlocks } from '$lib/templates/kanban/parser';
import { parseChangelogBlocks } from '$lib/templates/changelog/parser';
import { parseTimelineBlocks } from '$lib/templates/timeline/parser';
import { parseSlidesBlocks } from '$lib/templates/slides/parser';
import { parseDashboardBlocks } from '$lib/templates/dashboard/parser';

export const load: PageServerLoad = async ({ params, platform, locals, url }) => {
  if (!platform) throw error(500, 'No platform');

  try {
    const db = getDb(platform);

    const page = await getPageByUrlSegment(db, params.slug);
    if (!page) throw error(404, 'Page not found');

    const canonicalPath = buildCanonicalPath(page);
    if (url.pathname !== canonicalPath) {
      throw redirect(301, canonicalPath + url.search);
    }

    await assertCanReadPage(db, page, toAccessViewer(locals.user));

    // Strip frontmatter before rendering
    const { content, data: fm } = parseFrontmatter(page.markdown);
    // Kanban, changelog, timeline, and slides views don't need HTML rendering — skip expensive markdown pipeline
    const skipHtml =
      page.view === 'kanban' ||
      page.view === 'changelog' ||
      page.view === 'timeline' ||
      page.view === 'slides' ||
      page.view === 'dashboard';
    const html = skipHtml ? '' : await renderMarkdown(content);
    // SEO/LLM body: always rendered. Used in <noscript> so non-JS clients (bots,
    // LLM fetchers) see the real content even on view types that render via JS.
    const seoHtml = skipHtml ? await renderMarkdown(content) : html;

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
    } else if (templateName === 'doc' && url.searchParams.get('kanban') === '1') {
      /* Reader: doc page “Open as kanban” — parse board data only; keep `blocks` as doc blocks. */
      try {
        const parsed = parseKanbanBlocks(page.markdown);
        kanbanData = {
          columns: parsed.columns,
          labels: parsed.labels,
        };
      } catch (e) {
        console.error('Kanban parse error (doc kanban peek):', e);
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

    const isOwner = !!page.user_id && locals.user?.id === page.user_id;
    const effectiveRole = await getEffectiveRoleForPage(db, page, toAccessViewer(locals.user));
    const canEdit = canWrite(effectiveRole);
    const canClaim = !page.user_id && !!locals.user;

    return {
      page,
      canonicalPath,
      html,
      seoHtml,
      blocks,
      comments,
      frontmatter: fm,
      pageUser,
      kanbanData,
      changelogData,
      timelineData,
      slidesData,
      dashboardData,
      isOwner,
      canEdit,
      canClaim,
    };
  } catch (e: unknown) {
    if (isHttpError(e) || isRedirect(e)) throw e;
    console.error('Page load error:', e);
    throw error(500, `Failed to load page: ${e instanceof Error ? e.message : String(e)}`);
  }
};
