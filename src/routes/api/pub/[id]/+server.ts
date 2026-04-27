import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  getDb,
  getPageById,
  updatePage,
  deletePage,
  getCommentsByPage,
  updateCommentAnchor,
} from '$lib/server/db';
import { parseFrontmatter } from '$lib/server/markdown';
import { reconcileComments } from '$lib/templates/reconcile';
import { parseKanbanBlocks } from '$lib/templates/kanban/parser';
import { parseDocBlocks } from '$lib/templates/doc/parser';

export const GET: RequestHandler = async ({ params, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await getPageById(db, params.id);
  if (!page) throw error(404, 'Page not found');

  return json(page);
};

export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await getPageById(db, params.id);
  if (!page) throw error(404, 'Page not found');

  // Owner check — only the owner (or anon pages if no user) can update
  if (page.user_id !== null) {
    if (!locals.user || locals.user.id !== page.user_id) {
      throw error(403, 'Forbidden');
    }
  }

  const contentType = request.headers.get('content-type') ?? '';
  let markdown: string | undefined;
  let viewOverride: string | undefined;
  let accessOverride: string | undefined;
  let titleOverride: string | undefined;
  let themeOverride: string | undefined;

  if (contentType.includes('application/json')) {
    const body = await request.json();
    markdown = body.markdown;
    viewOverride = body.view;
    accessOverride = body.access;
    titleOverride = body.title;
    themeOverride = body.theme;
  } else {
    markdown = (await request.text()) || undefined;
  }

  // Re-parse frontmatter if markdown is being updated
  let oldBlocks: import('$lib/templates/types').Block[] = [];
  let newBlocks: import('$lib/templates/types').Block[] = [];

  if (markdown) {
    const { data: fm } = parseFrontmatter(markdown);
    viewOverride = viewOverride ?? fm.view;
    accessOverride = accessOverride ?? fm.access;
    titleOverride = titleOverride ?? fm.title;

    // Capture old blocks for reconciliation (before update)
    const oldMarkdown = page.markdown;
    const effectiveView = viewOverride ?? page.view;
    if (effectiveView === 'kanban') {
      oldBlocks = parseKanbanBlocks(oldMarkdown).blocks;
      newBlocks = parseKanbanBlocks(markdown).blocks;
    } else {
      oldBlocks = parseDocBlocks(oldMarkdown);
      newBlocks = parseDocBlocks(markdown);
    }

    // Snapshot current content as a version before updating
    try {
      const maxRow = await db
        .prepare('SELECT MAX(version) as max_v FROM page_versions WHERE page_id = ?')
        .bind(params.id)
        .first<{ max_v: number | null }>();
      const nextVersion = (maxRow?.max_v ?? 0) + 1;

      const versionId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      await db
        .prepare(
          `INSERT INTO page_versions (id, page_id, version, markdown, title)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(versionId, params.id, nextVersion, page.markdown, page.title ?? null)
        .run();

      // Prune versions older than 20
      await db
        .prepare(
          `DELETE FROM page_versions
           WHERE page_id = ? AND version <= (
             SELECT MAX(version) - 20 FROM page_versions WHERE page_id = ?
           )`
        )
        .bind(params.id, params.id)
        .run();
    } catch (e) {
      console.error('Version snapshot failed:', e);
      // Don't block the update if snapshot fails
    }
  }

  await updatePage(db, params.id, {
    markdown,
    view: viewOverride,
    access: accessOverride,
    title: titleOverride,
    theme: themeOverride,
  });

  // Reconcile comment anchors if markdown changed and we have block info
  if (markdown && (oldBlocks.length > 0 || newBlocks.length > 0)) {
    const comments = await getCommentsByPage(db, params.id);
    const reconciled = reconcileComments(oldBlocks, newBlocks, comments);
    await Promise.all(
      reconciled
        .filter((r) => r.changed)
        .map((r) => updateCommentAnchor(db, r.commentId, r.newAnchor))
    );
  }

  const updated = await getPageById(db, params.id);
  return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await getPageById(db, params.id);
  if (!page) throw error(404, 'Page not found');

  // Owner check
  if (page.user_id !== null) {
    if (!locals.user || locals.user.id !== page.user_id) {
      throw error(403, 'Forbidden');
    }
  }

  await deletePage(db, params.id);
  return new Response(null, { status: 204 });
};
