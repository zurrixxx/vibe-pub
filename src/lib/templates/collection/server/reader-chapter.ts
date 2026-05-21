import { error } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import { buildCanonicalPath } from '$lib/server/slug';
import {
  type CollectionPageRow,
  type CollectionPartRow,
  type CollectionRow,
  chapterLedeForPage,
  loadCollectionReaderContext,
  pageDisplayTitle,
  partEyebrowForPage,
  renderCollectionPageContent,
} from './load';
import type { Comment } from '$lib/types';
import type { KanbanColumn, KanbanLabels } from '$lib/templates/kanban/serialize';

export type { CollectionPageRow, CollectionPartRow, CollectionRow };

export { loadCollectionReaderContext } from './load';

export interface ReaderChapterPayload {
  id: string;
  pageId: string;
  title: string;
  html: string;
  markdown: string;
  lede: string | null;
  partEyebrow: string | null;
  chapterNum: number;
  totalChapters: number;
  authorUsername: string | null;
  updated: string;
  comments: Comment[];
  view: string;
  kanbanData: { columns: KanbanColumn[]; labels: KanbanLabels } | null;
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
  pageHref: string;
}

export type CollectionReaderChapterPayload = ReaderChapterPayload;

type FlatPage = { id: string; title: string; num: number };

interface ReaderContext {
  collection: CollectionRow;
  pages: CollectionPageRow[];
  partsMeta: CollectionPartRow[];
  flatPages: FlatPage[];
  ownerUsername: string | null;
}

async function buildChapterPayload(
  db: D1Database,
  ctx: ReaderContext,
  page: CollectionPageRow,
  chapterIndex: number
): Promise<ReaderChapterPayload> {
  const { flatPages, partsMeta, ownerUsername } = ctx;
  const totalChapters = flatPages.length;
  const chapterNum = chapterIndex + 1;
  const prevFlat = chapterIndex > 0 ? flatPages[chapterIndex - 1] : null;
  const nextFlat = chapterIndex < flatPages.length - 1 ? flatPages[chapterIndex + 1] : null;

  const { html, comments, frontmatter, kanbanData } = await renderCollectionPageContent(db, page);
  const lede = chapterLedeForPage(page, html, frontmatter, kanbanData);

  return {
    id: page.id,
    pageId: page.page_id,
    title: pageDisplayTitle(page),
    html,
    markdown: page.markdown,
    lede,
    partEyebrow: partEyebrowForPage(page, partsMeta),
    chapterNum,
    totalChapters,
    authorUsername: ownerUsername,
    updated: page.updated,
    comments,
    view: page.view,
    kanbanData,
    prev: prevFlat ? { id: prevFlat.id, title: prevFlat.title } : null,
    next: nextFlat ? { id: nextFlat.id, title: nextFlat.title } : null,
    pageHref: buildCanonicalPath({
      id: page.page_id,
      slug: page.slug,
      title: page.title,
    }),
  };
}

export async function loadAllReaderChapters(
  db: D1Database,
  collectionSlug: string,
  viewerUserId?: string
): Promise<ReaderChapterPayload[]> {
  const ctx = (await loadCollectionReaderContext(
    db,
    collectionSlug,
    viewerUserId
  )) as ReaderContext;
  return Promise.all(ctx.pages.map((page, index) => buildChapterPayload(db, ctx, page, index)));
}

/** @deprecated Use loadAllReaderChapters */
export const loadAllCollectionReaderChapters = loadAllReaderChapters;

export async function loadReaderChapter(
  db: D1Database,
  collectionSlug: string,
  pageId: string,
  viewerUserId?: string
): Promise<ReaderChapterPayload> {
  const ctx = (await loadCollectionReaderContext(
    db,
    collectionSlug,
    viewerUserId
  )) as ReaderContext;
  const chapterIndex = ctx.pages.findIndex((p) => p.id === pageId || p.page_id === pageId);
  if (chapterIndex < 0) throw error(404, 'Page not found in collection');
  return buildChapterPayload(db, ctx, ctx.pages[chapterIndex], chapterIndex);
}

/** @deprecated Use loadReaderChapter */
export const loadCollectionReaderChapter = loadReaderChapter;
