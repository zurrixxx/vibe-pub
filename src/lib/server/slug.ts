import { customAlphabet } from 'nanoid';

const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const ID_LENGTH = 8;
const MAX_SLUG_LEN = 60;

const nano = customAlphabet(ID_ALPHABET, ID_LENGTH);

export function generatePageId(): string {
  return nano();
}

export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length > 100) return false;
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(slug);
}

/** Last `-`-separated token of a URL segment is the page id. */
export function extractIdFromUrlSegment(segment: string): string {
  const idx = segment.lastIndexOf('-');
  return idx === -1 ? segment : segment.slice(idx + 1);
}

/** Derive a cosmetic slug from a title. Returns `''` when nothing usable. */
export function slugifyTitle(title: string | null | undefined): string {
  if (!title) return '';
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LEN)
    .replace(/-+$/g, '');
  return slug;
}

/** Canonical URL path for a page: `/<slug>-<id>` or `/<id>` when no slug. */
export function buildCanonicalPath(page: {
  id: string;
  slug: string | null;
  title: string | null;
}): string {
  const stored = (page.slug ?? '').trim();
  const part = stored !== '' ? stored : slugifyTitle(page.title);
  return part ? `/${part}-${page.id}` : `/${page.id}`;
}
