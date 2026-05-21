import { error } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import { getCommentsByPage, getUserById } from '$lib/server/db';
import { assertCollectionReadable, PAGES_ORDER_SQL, readerGuideFromRow } from './db';
import { renderMarkdown, parseFrontmatter } from '$lib/server/markdown';
import { buildCanonicalPath } from '$lib/server/slug';
import { toRoman } from '$lib/roman';
import { chapterLede } from '$lib/templates/collection/chapter/index';
import type { ChapterLink } from '$lib/templates/collection/chapter/index';
import type { SettingsChapter, SettingsPart } from '$lib/templates/collection/settings';
import { parseKanbanBlocks } from '$lib/templates/kanban/parser';
import { detectView } from '$lib/templates/detect';
import type { KanbanColumn, KanbanLabels } from '$lib/templates/kanban/serialize';
import type { Comment } from '$lib/types';
import type { PageFrontmatter } from '$lib/types';

export interface CollectionRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  readers_guide: string | null;
  what_its_about: string | null;
  who_its_for: string | null;
  how_to_read_it: string | null;
  user_id: string | null;
  access: string;
  theme: string;
  updated: string;
}

export interface CollectionPageRow {
  page_id: string;
  sort_order: number;
  label: string | null;
  part_id: string | null;
  id: string;
  slug: string;
  title: string | null;
  markdown: string;
  view: string;
  updated: string;
}

export interface CollectionPartRow {
  id: string;
  title: string;
  sort_order: number;
}

export type NavPage = {
  id: string;
  title: string;
  view: string;
  active: boolean;
  num: number;
};

export type NavPart = {
  id: string;
  title: string;
  partNum: string;
  pages: NavPage[];
};

export type CoverPartMeta = {
  partNum: string;
  title: string;
  pageCount: number;
};

export type ChapterNav = {
  num: number;
  total: number;
  partEyebrow: string | null;
  prev: ChapterLink | null;
  next: ChapterLink | null;
};

export function pageDisplayTitle(p: CollectionPageRow): string {
  return p.label ?? p.title ?? p.id;
}

export function buildCollectionSettings(
  pages: CollectionPageRow[],
  partsMeta: CollectionPartRow[],
  isCollectionOwner: boolean
): { settingsChapters: SettingsChapter[]; settingsParts: SettingsPart[] } {
  if (!isCollectionOwner) {
    return { settingsChapters: [], settingsParts: [] };
  }
  return {
    settingsParts: partsMeta.map((p, i) => ({
      id: p.id,
      title: p.title,
      partNum: toRoman(i + 1),
    })),
    settingsChapters: pages.map((p) => ({
      id: p.id,
      pageSlug: p.slug,
      title: pageDisplayTitle(p),
      view: p.view,
      detectedView: detectView(p.markdown),
      partId: p.part_id,
      sortOrder: p.sort_order,
      filename: `${p.slug}.md`,
    })),
  };
}

export function collectionMetaFromRow(collection: CollectionRow) {
  return {
    title: collection.title,
    slug: collection.slug,
    description: collection.description,
    theme: collection.theme,
    updated: collection.updated,
    ...readerGuideFromRow(collection),
  };
}

function toNavPage(p: CollectionPageRow, activeId: string, num: number): NavPage {
  return {
    id: p.id,
    title: pageDisplayTitle(p),
    view: p.view,
    active: p.id === activeId,
    num,
  };
}

export function buildCoverParts(
  partsMeta: CollectionPartRow[],
  pages: CollectionPageRow[]
): CoverPartMeta[] {
  return partsMeta.map((part, i) => ({
    partNum: toRoman(i + 1),
    title: part.title,
    pageCount: pages.filter((p) => p.part_id === part.id).length,
  }));
}

export function buildNavStructure(
  pages: CollectionPageRow[],
  partsMeta: CollectionPartRow[],
  activeId: string
): { parts: NavPart[]; ungroupedPages: NavPage[]; flatPages: NavPage[] } {
  let chapterNum = 0;
  const parts = partsMeta.map((part, i) => ({
    id: part.id,
    title: part.title,
    partNum: toRoman(i + 1),
    pages: pages
      .filter((p) => p.part_id === part.id)
      .map((p) => toNavPage(p, activeId, ++chapterNum)),
  }));
  const ungroupedPages = pages
    .filter((p) => !p.part_id)
    .map((p) => toNavPage(p, activeId, ++chapterNum));
  const flatPages = pages.map((p, i) => toNavPage(p, activeId, i + 1));
  return { parts, ungroupedPages, flatPages };
}

export function partEyebrowForPage(
  page: CollectionPageRow,
  partsMeta: CollectionPartRow[]
): string | null {
  const activePartRow = page.part_id ? partsMeta.find((p) => p.id === page.part_id) : null;
  if (!activePartRow) return null;
  const partNum = toRoman(partsMeta.findIndex((p) => p.id === activePartRow.id) + 1);
  return `Part ${partNum} · ${activePartRow.title}`;
}

export function buildChapterNav(
  flatPages: NavPage[],
  activePage: CollectionPageRow,
  collectionSlug: string,
  partsMeta: CollectionPartRow[],
  navParts: NavPart[]
): {
  chapter: ChapterNav;
  activePart: { id: string; title: string } | null;
} {
  const chapterIndex = flatPages.findIndex((p) => p.id === activePage.id);
  const chapterNum = chapterIndex >= 0 ? chapterIndex + 1 : 1;
  const totalChapters = flatPages.length;

  const activePartRow = activePage.part_id
    ? partsMeta.find((p) => p.id === activePage.part_id)
    : null;
  const activePart = activePartRow ? { id: activePartRow.id, title: activePartRow.title } : null;

  const activePartNav = activePartRow ? navParts.find((p) => p.id === activePartRow.id) : null;
  const partEyebrow = activePartNav
    ? `Part ${activePartNav.partNum} · ${activePartRow!.title}`
    : null;

  const toChapterLink = (p: NavPage | undefined): ChapterLink | null =>
    p ? { id: p.id, title: p.title, href: `/c/${collectionSlug}?page=${p.id}` } : null;

  return {
    chapter: {
      num: chapterNum,
      total: totalChapters,
      partEyebrow,
      prev: chapterIndex > 0 ? toChapterLink(flatPages[chapterIndex - 1]) : null,
      next:
        chapterIndex >= 0 && chapterIndex < flatPages.length - 1
          ? toChapterLink(flatPages[chapterIndex + 1])
          : null,
    },
    activePart,
  };
}

export async function renderCollectionPageContent(
  db: D1Database,
  page: CollectionPageRow
): Promise<{
  html: string;
  comments: Comment[];
  frontmatter: PageFrontmatter & Record<string, unknown>;
  kanbanData: { columns: KanbanColumn[]; labels: KanbanLabels } | null;
  sourceMarkdownHref: string;
}> {
  const { content, data: fm } = parseFrontmatter(page.markdown);
  const isKanban = page.view === 'kanban';
  const html = isKanban ? '' : await renderMarkdown(content);
  const comments = await getCommentsByPage(db, page.page_id);

  let kanbanData: { columns: KanbanColumn[]; labels: KanbanLabels } | null = null;
  if (isKanban) {
    try {
      const parsed = parseKanbanBlocks(page.markdown);
      kanbanData = { columns: parsed.columns, labels: parsed.labels };
    } catch {
      kanbanData = { columns: [], labels: {} };
    }
  }

  return {
    html,
    comments,
    frontmatter: fm as PageFrontmatter & Record<string, unknown>,
    kanbanData,
    sourceMarkdownHref:
      buildCanonicalPath({
        id: page.page_id,
        slug: page.slug,
        title: page.title,
      }) + '.md',
  };
}

export function extractAllHeadings(pages: CollectionPageRow[]) {
  return pages.map((p) => {
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
    return { id: p.id, title: pageDisplayTitle(p), headings };
  });
}

export async function loadCollectionReaderContext(
  db: D1Database,
  collectionSlug: string,
  viewerUserId?: string
): Promise<{
  collection: CollectionRow;
  pages: CollectionPageRow[];
  partsMeta: CollectionPartRow[];
  flatPages: { id: string; title: string; num: number }[];
  ownerUsername: string | null;
}> {
  const collection = await db
    .prepare(
      'SELECT id, slug, title, user_id, access, description, readers_guide, what_its_about, who_its_for, how_to_read_it, theme, updated FROM collections WHERE slug = ?'
    )
    .bind(collectionSlug)
    .first<CollectionRow>();

  if (!collection) throw error(404, 'Collection not found');
  assertCollectionReadable(collection, viewerUserId);

  const partsResult = await db
    .prepare(
      'SELECT id, title, sort_order FROM collection_parts WHERE collection_id = ? ORDER BY sort_order ASC'
    )
    .bind(collection.id)
    .all<CollectionPartRow>();

  const pagesResult = await db
    .prepare(
      `
      SELECT cp.page_id, cp.sort_order, cp.label, cp.part_id,
             p.id, p.slug, p.title, p.markdown, p.view, p.updated
      FROM collection_pages cp
      JOIN pages p ON cp.page_id = p.id
      LEFT JOIN collection_parts pt ON pt.id = cp.part_id
      WHERE cp.collection_id = ?
      ${PAGES_ORDER_SQL}
    `
    )
    .bind(collection.id)
    .all<CollectionPageRow>();

  const pages = pagesResult.results;
  const flatPages = pages.map((p, i) => ({
    id: p.id,
    title: pageDisplayTitle(p),
    num: i + 1,
  }));

  let ownerUsername: string | null = null;
  if (collection.user_id) {
    const ownerUser = await getUserById(db, collection.user_id);
    if (ownerUser) ownerUsername = ownerUser.username;
  }

  return {
    collection,
    pages,
    partsMeta: partsResult.results,
    flatPages,
    ownerUsername,
  };
}

/** Lede for SSR active chapter (matches continuous-reader payload). */
export function chapterLedeForPage(
  page: CollectionPageRow,
  html: string,
  frontmatter: PageFrontmatter & Record<string, unknown>,
  kanbanData: { columns: KanbanColumn[]; labels: KanbanLabels } | null
): string | null {
  return chapterLede({
    view: page.view,
    frontmatter,
    html,
    kanbanColumns: kanbanData?.columns,
  });
}
