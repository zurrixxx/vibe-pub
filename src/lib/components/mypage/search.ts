import { highlightSnippet, searchSnippet } from '$lib/templates/collection/search/query';

export type MyPageSearchEntry = {
  kind: 'page' | 'collection';
  title: string;
  href: string;
  meta: string;
  text: string;
};

export type MyPageSearchHit = {
  entry: MyPageSearchEntry;
  score: number;
  snippet: string;
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function buildMyPageSearchEntries(
  pages: {
    id: string;
    title?: string | null;
    slug?: string | null;
    canonicalPath: string;
    view?: string | null;
  }[],
  collections: { slug: string; title: string; description?: string | null }[]
): MyPageSearchEntry[] {
  const pageEntries: MyPageSearchEntry[] = pages.map((p) => ({
    kind: 'page',
    title: p.title?.trim() || p.id,
    href: p.canonicalPath,
    meta: p.view || 'doc',
    text: [p.title, p.slug, p.id, p.canonicalPath].filter(Boolean).join(' '),
  }));

  const collectionEntries: MyPageSearchEntry[] = collections.map((c) => ({
    kind: 'collection',
    title: c.title,
    href: `/c/${c.slug}`,
    meta: 'collection',
    text: [c.title, c.slug, c.description].filter(Boolean).join(' '),
  }));

  return [...pageEntries, ...collectionEntries];
}

export function searchMyPage(
  entries: MyPageSearchEntry[],
  rawQuery: string,
  limit = 24
): MyPageSearchHit[] {
  const phrase = normalize(rawQuery);
  if (!phrase) return [];

  const hits: MyPageSearchHit[] = [];

  for (const entry of entries) {
    const titleNorm = normalize(entry.title);
    const textNorm = normalize(entry.text);
    const metaNorm = normalize(entry.meta);

    const inTitle = titleNorm.includes(phrase);
    const inMeta = metaNorm.includes(phrase);
    const inText = textNorm.includes(phrase);
    if (!inTitle && !inMeta && !inText) continue;

    let score = 0;
    if (inTitle) score += 12;
    if (titleNorm.startsWith(phrase)) score += 6;
    if (inMeta) score += 3;
    if (inText) score += 2;
    if (entry.kind === 'collection') score += 1;

    hits.push({
      entry,
      score,
      snippet: searchSnippet(entry.text, phrase),
    });
  }

  hits.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title));
  return hits.slice(0, limit);
}

export { highlightSnippet };
