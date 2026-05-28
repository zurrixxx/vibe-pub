import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  getDb,
  getPageById,
  updatePage,
  deletePage,
  getCommentsByPage,
  updateCommentAnchor,
  appendPageVersionSnapshot,
} from '$lib/server/db';
import { assertCanReadPage, assertCanWritePage, toAccessViewer } from '$lib/server/access';
import { parseFrontmatter } from '$lib/server/markdown';
import { reconcileComments } from '$lib/templates/reconcile';
import { parseKanbanBlocks } from '$lib/templates/kanban/parser';
import { parseDocBlocks } from '$lib/templates/doc/parser';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await getPageById(db, params.id);
  if (!page) throw error(404, 'Page not found');

  await assertCanReadPage(db, page, toAccessViewer(locals.user));

  return json(page);
};

export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const page = await getPageById(db, params.id);
  if (!page) throw error(404, 'Page not found');

  const contentType = request.headers.get('content-type') ?? '';
  let markdown: string | undefined;
  let viewOverride: string | undefined;
  let accessOverride: string | undefined;
  let titleOverride: string | undefined;
  let themeOverride: string | undefined;

  if (contentType.includes('application/json')) {
    const body = (await request.json()) as {
      markdown?: string;
      view?: string;
      access?: string;
      title?: string;
      theme?: string;
    };
    markdown = body.markdown;
    viewOverride = body.view;
    accessOverride = body.access;
    titleOverride = body.title;
    themeOverride = body.theme;
  } else {
    markdown = (await request.text()) || undefined;
  }

  // Owner or shared editor can update; anon pages remain open to anyone.
  let isOwner = page.user_id === null;
  if (page.user_id !== null) {
    const role = await assertCanWritePage(db, page, toAccessViewer(locals.user));
    isOwner = role === 'owner';
    if (
      !isOwner &&
      (accessOverride !== undefined ||
        viewOverride !== undefined ||
        titleOverride !== undefined ||
        themeOverride !== undefined)
    ) {
      throw error(403, 'Not authorized');
    }
  }

  // Re-parse frontmatter if markdown is being updated
  let oldBlocks: import('$lib/templates/types').Block[] = [];
  let newBlocks: import('$lib/templates/types').Block[] = [];
  const hasAnyUpdate =
    markdown !== undefined ||
    viewOverride !== undefined ||
    accessOverride !== undefined ||
    titleOverride !== undefined ||
    themeOverride !== undefined;

  if (markdown) {
    const { data: fm } = parseFrontmatter(markdown);
    if (isOwner) {
      viewOverride = viewOverride ?? fm.view;
      accessOverride = accessOverride ?? fm.access;
      titleOverride = titleOverride ?? fm.title;
    }

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
  }

  await updatePage(
    db,
    params.id,
    isOwner
      ? {
          markdown,
          view: viewOverride,
          access: accessOverride,
          title: titleOverride,
          theme: themeOverride,
        }
      : { markdown }
  );

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

  // Snapshot updated content as the next version after each update.
  if (hasAnyUpdate && updated) {
    try {
      await appendPageVersionSnapshot(db, params.id, {
        markdown: updated.markdown,
        title: updated.title ?? null,
      });
    } catch (e) {
      console.error('Version snapshot failed:', e);
    }
  }

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
