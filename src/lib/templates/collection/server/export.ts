import { error } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import { slugifyTitle } from '$lib/server/slug';
import { loadCollectionReaderContext } from './load';
import { loadAllReaderChapters } from './reader-chapter';
import { strToU8, zipSync } from 'fflate';

export type MdFile = {
  filename: string;
  markdown: string;
};

export type PrintChapter = {
  title: string;
  partEyebrow: string | null;
  chapterNum: number;
  view: string;
  html: string;
  markdown: string;
};

function mdFilename(index: number, title: string, slug: string | null, id: string): string {
  const base = slugifyTitle(title) || slug || id;
  const num = String(index + 1).padStart(2, '0');
  return `${num}-${base}.md`;
}

export async function loadMarkdownFiles(
  db: D1Database,
  collectionSlug: string,
  viewerUserId?: string
): Promise<{ collectionTitle: string; files: MdFile[] }> {
  const ctx = await loadCollectionReaderContext(db, collectionSlug, viewerUserId);
  const collection = await db
    .prepare('SELECT title FROM collections WHERE slug = ?')
    .bind(collectionSlug)
    .first<{ title: string }>();
  if (!collection) throw error(404, 'Collection not found');

  const files = ctx.pages.map((page, index) => ({
    filename: mdFilename(index, page.label ?? page.title ?? page.id, page.slug, page.id),
    markdown: page.markdown,
  }));

  return { collectionTitle: collection.title, files };
}

export async function buildMarkdownZip(
  db: D1Database,
  collectionSlug: string,
  viewerUserId?: string
): Promise<{ filename: string; bytes: Uint8Array }> {
  const { files } = await loadMarkdownFiles(db, collectionSlug, viewerUserId);
  const zipBytes = zipSync(Object.fromEntries(files.map((f) => [f.filename, strToU8(f.markdown)])));
  const safeSlug =
    collectionSlug.replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '') || 'collection';
  return {
    filename: `${safeSlug}-markdown.zip`,
    bytes: zipBytes,
  };
}

export async function loadPrintChapters(
  db: D1Database,
  collectionSlug: string,
  viewerUserId?: string
): Promise<{
  collectionTitle: string;
  ownerUsername: string | null;
  chapters: CollectionPrintChapter[];
  returnHref: string;
}> {
  const ctx = await loadCollectionReaderContext(db, collectionSlug, viewerUserId);
  const collection = await db
    .prepare('SELECT title FROM collections WHERE slug = ?')
    .bind(collectionSlug)
    .first<{ title: string }>();

  if (!collection) throw error(404, 'Collection not found');

  const loaded = await loadAllReaderChapters(db, collectionSlug, viewerUserId);
  const chapters: PrintChapter[] = loaded.map((ch) => ({
    title: ch.title,
    partEyebrow: ch.partEyebrow,
    chapterNum: ch.chapterNum,
    view: ch.view,
    html: ch.html,
    markdown: ch.markdown,
  }));

  return {
    collectionTitle: collection.title,
    ownerUsername: ctx.ownerUsername,
    chapters,
    returnHref: `/c/${collectionSlug}`,
  };
}

/** @deprecated */
export const loadCollectionMarkdownFiles = loadMarkdownFiles;
export const buildCollectionMarkdownZip = buildMarkdownZip;
export const loadCollectionPrintChapters = loadPrintChapters;
export type CollectionMdFile = MdFile;
export type CollectionPrintChapter = PrintChapter;
