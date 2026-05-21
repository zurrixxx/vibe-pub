import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb, getUserById } from '$lib/server/db';
import { assertCollectionReadable } from '$lib/templates/collection/server/db';
import {
  PAGES_ORDER_SQL,
  type CollectionPageRow,
  type CollectionPartRow,
  type CollectionRow,
  buildChapterNav,
  buildCollectionSettings,
  buildCoverParts,
  buildNavStructure,
  collectionMetaFromRow,
  extractAllHeadings,
  renderCollectionPageContent,
} from '$lib/templates/collection/server';

export const load: PageServerLoad = async ({ params, url, platform, locals, depends }) => {
  depends(`collection:${params.slug}:${url.searchParams.get('page') ?? ''}`);

  if (!platform) throw error(500, 'No platform');
  const db = getDb(platform);

  const collection = await db
    .prepare('SELECT * FROM collections WHERE slug = ?')
    .bind(params.slug)
    .first<CollectionRow>();

  if (!collection) throw error(404, 'Collection not found');
  assertCollectionReadable(collection, locals.user?.id);

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
  const partsMeta = partsResult.results;
  const isCollectionOwner = collection.user_id !== null && locals.user?.id === collection.user_id;
  const { settingsChapters, settingsParts } = buildCollectionSettings(
    pages,
    partsMeta,
    isCollectionOwner
  );

  const collectionMeta = collectionMetaFromRow(collection);
  const pageParam = url.searchParams.get('page');
  const showCover = !pageParam || pageParam === 'cover';
  const coverParts = buildCoverParts(partsMeta, pages);
  let owner: { username: string } | null = null;
  if (collection.user_id) {
    const ownerUser = await getUserById(db, collection.user_id);
    if (ownerUser) owner = { username: ownerUser.username };
  }

  const shared = {
    collection: collectionMeta,
    owner,
    coverParts,
    isCollectionOwner,
    settingsChapters,
    settingsParts,
  };

  if (pages.length === 0) {
    const { parts, ungroupedPages, flatPages } = buildNavStructure(pages, partsMeta, '');
    return {
      ...shared,
      showCover: true,
      parts,
      ungroupedPages,
      pages: flatPages,
      activePart: null,
      activePage: null,
      chapter: null,
      allHeadings: [],
    };
  }

  if (showCover) {
    const { parts, ungroupedPages, flatPages } = buildNavStructure(pages, partsMeta, '');
    return {
      ...shared,
      showCover: true,
      parts,
      ungroupedPages,
      pages: flatPages,
      activePart: null,
      activePage: null,
      chapter: null,
      allHeadings: [],
    };
  }

  const activeKey = pageParam!;
  const activePage = pages.find((p) => p.id === activeKey);
  if (!activePage) throw error(404, 'Page not found in collection');

  const { parts, ungroupedPages, flatPages } = buildNavStructure(pages, partsMeta, activePage.id);
  const { chapter, activePart } = buildChapterNav(
    flatPages,
    activePage,
    collection.slug,
    partsMeta,
    parts
  );

  const { html, comments, frontmatter, kanbanData, sourceMarkdownHref } =
    await renderCollectionPageContent(db, activePage);

  return {
    ...shared,
    showCover: false,
    parts,
    ungroupedPages,
    pages: flatPages,
    activePart,
    chapter,
    activePage: {
      id: activePage.page_id,
      slug: activePage.slug,
      title: activePage.title,
      markdown: activePage.markdown,
      view: activePage.view,
      updated: activePage.updated,
      html,
      comments,
      frontmatter,
      kanbanData,
      sourceMarkdownHref,
    },
    allHeadings: extractAllHeadings(pages),
  };
};
