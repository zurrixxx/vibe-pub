/**
 * Collection server — DB, reader load, search index, export.
 * Lives with `templates/collection` (not generic `$lib/server`).
 */

export {
  newCollectionEntityId,
  getCollectionBySlug,
  assertCollectionOwner,
  assertCollectionAccessForOwner,
  assertCollectionReadable,
  resolveCollectionAccess,
  type CollectionAccess,
  touchCollectionUpdated,
  getPartInCollection,
  nextPartSortOrder,
  nextPageSortOrderInPart,
  readerGuideFromRow,
  readerGuideFromBody,
  PAGES_ORDER_SQL,
  type DbCollectionRow,
  type ReaderGuide,
} from './db';

/** @deprecated Use PAGES_ORDER_SQL */
export { PAGES_ORDER_SQL as COLLECTION_PAGES_ORDER_SQL } from './db';

export {
  type CollectionRow,
  type CollectionPageRow,
  type CollectionPartRow,
  type NavPage,
  type NavPart,
  type CoverPartMeta,
  type ChapterNav,
  pageDisplayTitle,
  buildCollectionSettings,
  collectionMetaFromRow,
  buildCoverParts,
  buildNavStructure,
  partEyebrowForPage,
  buildChapterNav,
  renderCollectionPageContent,
  extractAllHeadings,
  chapterLedeForPage,
  loadCollectionReaderContext,
} from './load';

export {
  type ReaderChapterPayload,
  loadAllReaderChapters,
  loadReaderChapter,
  loadAllCollectionReaderChapters,
  loadCollectionReaderChapter,
  type CollectionReaderChapterPayload,
} from './reader-chapter';

export {
  type SearchEntry,
  loadSearchIndex,
  loadCollectionSearchIndex,
  type CollectionSearchEntry,
} from './search-index';

export {
  type MdFile,
  type PrintChapter,
  loadMarkdownFiles,
  buildMarkdownZip,
  loadPrintChapters,
  loadCollectionMarkdownFiles,
  buildCollectionMarkdownZip,
  loadCollectionPrintChapters,
  type CollectionMdFile,
  type CollectionPrintChapter,
} from './export';
