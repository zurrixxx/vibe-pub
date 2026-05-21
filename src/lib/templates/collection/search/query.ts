import type { SearchEntry } from '$lib/templates/collection/server/search-index';

export type SearchHit = {
  entry: SearchEntry;
  score: number;
  snippet: string;
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Build a short excerpt around the query phrase match. */
export function searchSnippet(text: string, phrase: string, maxLen = 140): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(phrase);
  if (idx < 0) return text.slice(0, maxLen).trim() + (text.length > maxLen ? '…' : '');

  const start = Math.max(0, idx - 48);
  const end = Math.min(text.length, idx + maxLen);
  let slice = text.slice(start, end).trim();
  if (start > 0) slice = '…' + slice;
  if (end < text.length) slice = slice + '…';
  return slice;
}

export function searchCollection(
  entries: SearchEntry[],
  rawQuery: string,
  limit = 24
): SearchHit[] {
  const phrase = normalize(rawQuery);
  if (!phrase) return [];

  const hits: SearchHit[] = [];

  for (const entry of entries) {
    const titleNorm = normalize(entry.title);
    const textNorm = normalize(entry.text);
    const partNorm = entry.partEyebrow ? normalize(entry.partEyebrow) : '';

    const inTitle = titleNorm.includes(phrase);
    const inPart = partNorm.includes(phrase);
    const inText = textNorm.includes(phrase);
    if (!inTitle && !inPart && !inText) continue;

    let score = 0;
    if (inTitle) score += 12;
    if (inPart) score += 4;
    if (inText) score += 2;
    if (titleNorm.startsWith(phrase)) score += 6;

    hits.push({
      entry,
      score,
      snippet: searchSnippet(entry.text, phrase),
    });
  }

  hits.sort((a, b) => b.score - a.score || a.entry.chapterNum - b.entry.chapterNum);
  return hits.slice(0, limit);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Highlight the query phrase in snippet HTML (snippet is escaped first). */
export function highlightSnippet(snippet: string, rawQuery: string): string {
  const safe = escapeHtml(snippet);
  const phrase = normalize(rawQuery);
  if (!phrase) return safe;

  const re = new RegExp(`(${escapeRegex(phrase)})`, 'gi');
  return safe.replace(re, '<mark>$1</mark>');
}
