import type { ReaderChapterPayload } from '$lib/templates/collection/server/reader-chapter';

/** In-memory cache for continuous collection reader (all chapters preloaded). */
let cache: { slug: string; chapters: ReaderChapterPayload[] } | null = null;

export function getContinuousChaptersCache(slug: string): ReaderChapterPayload[] | null {
  if (cache?.slug === slug) return cache.chapters;
  return null;
}

export function setContinuousChaptersCache(slug: string, chapters: ReaderChapterPayload[]) {
  cache = { slug, chapters };
}

export function clearContinuousChaptersCache() {
  cache = null;
}
