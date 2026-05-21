import { customAlphabet } from 'nanoid';
import { buildCanonicalPath, slugifyTitle } from '$lib/slug-path';

const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const ID_LENGTH = 8;

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

export { buildCanonicalPath, slugifyTitle };
