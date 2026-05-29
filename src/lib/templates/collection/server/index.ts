/**
 * Collection server — DB, reader load, search index, export.
 * Lives with `templates/collection` (not generic `$lib/server`).
 */

export {
  newCollectionEntityId,
  getCollectionBySlug,
  assertCollectionOwner,
  assertCollectionAccessForOwner,
  resolveCollectionAccess,
  touchCollectionUpdated,
  deleteCollectionById,
  getPartInCollection,
  nextPartSortOrder,
  nextPageSortOrderInPart,
  readerGuideFromRow,
  readerGuideFromBody,
  buildCollectionPagesSelectQuery,
  type DbCollectionRow,
  type ReaderGuide,
} from './db';

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
  type CollectionReaderChapterPayload,
} from './reader-chapter';

export { type SearchEntry, loadSearchIndex, type CollectionSearchEntry } from './search-index';

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
