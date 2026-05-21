import { error } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import { toRoman } from '$lib/roman';
import { assertCollectionReadable, PAGES_ORDER_SQL } from './db';
import { markdownToPlainSearchText } from '$lib/templates/collection/search/plaintext';

export type SearchEntry = {
  pageId: string;
  title: string;
  chapterNum: number;
  partEyebrow: string | null;
  href: string;
  /** Plain text for matching (title + frontmatter + body). */
  text: string;
};

/** @deprecated Use SearchEntry */
export type CollectionSearchEntry = SearchEntry;

interface CollectionRow {
  id: string;
  slug: string;
  access: string;
  user_id: string | null;
}

interface PageRow {
  page_id: string;
  part_id: string | null;
  id: string;
  slug: string;
  title: string | null;
  label: string | null;
  markdown: string;
}

interface PartRow {
  id: string;
  title: string;
}

export { markdownToPlainSearchText } from '$lib/templates/collection/search/plaintext';

export async function loadSearchIndex(
  db: D1Database,
  collectionSlug: string,
  viewerUserId?: string
): Promise<SearchEntry[]> {
  const collection = await db
    .prepare('SELECT id, slug, access, user_id FROM collections WHERE slug = ?')
    .bind(collectionSlug)
    .first<CollectionRow>();

  if (!collection) throw error(404, 'Collection not found');
  assertCollectionReadable(collection, viewerUserId);

  const partsResult = await db
    .prepare(
      'SELECT id, title FROM collection_parts WHERE collection_id = ? ORDER BY sort_order ASC'
    )
    .bind(collection.id)
    .all<PartRow>();

  const partsMeta = partsResult.results;

  const pagesResult = await db
    .prepare(
      `
      SELECT cp.page_id, cp.part_id, cp.label,
             p.id, p.slug, p.title, p.markdown
      FROM collection_pages cp
      JOIN pages p ON cp.page_id = p.id
      LEFT JOIN collection_parts pt ON pt.id = cp.part_id
      WHERE cp.collection_id = ?
      ${PAGES_ORDER_SQL}
    `
    )
    .bind(collection.id)
    .all<PageRow>();

  const pages = pagesResult.results;
  const slug = collection.slug;

  return pages.map((page, index) => {
    const title = page.label ?? page.title ?? page.slug ?? page.id;
    const partRow = page.part_id ? partsMeta.find((p) => p.id === page.part_id) : null;
    const partEyebrow = partRow
      ? `Part ${toRoman(partsMeta.findIndex((p) => p.id === partRow.id) + 1)} · ${partRow.title}`
      : null;

    return {
      pageId: page.id,
      title,
      chapterNum: index + 1,
      partEyebrow,
      href: `/c/${slug}?page=${page.id}`,
      text: markdownToPlainSearchText(page.markdown, title),
    };
  });
}

/** @deprecated Use loadSearchIndex */
export const loadCollectionSearchIndex = loadSearchIndex;
