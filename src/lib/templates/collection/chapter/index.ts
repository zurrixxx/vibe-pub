import type { PageFrontmatter } from '$lib/types';

export interface ChapterLink {
  id: string;
  title: string;
  href: string;
}

/** First `<p>` in rendered doc HTML (matches PublishedPage doc lede). */
export function ledeFromHtml(html: string): string | null {
  if (!html.trim()) return null;
  const match = html.match(/<p[^>]*>(.*?)<\/p>/s);
  if (!match) return null;
  const text = match[1].replace(/<[^>]*>/g, '').trim();
  return text || null;
}

type KanbanColumnLike = { cards?: unknown[] | null };

/** Hero lede for collection chapter head — frontmatter, then doc/kanban fallbacks. */
export function chapterLede(opts: {
  view: string;
  frontmatter: PageFrontmatter & Record<string, unknown>;
  html?: string;
  kanbanColumns?: KanbanColumnLike[];
}): string | null {
  const { view, frontmatter: fm, html = '', kanbanColumns } = opts;
  if (typeof fm.lede === 'string' && fm.lede.trim()) return fm.lede.trim();
  if (typeof fm.subtitle === 'string' && fm.subtitle.trim()) return fm.subtitle.trim();

  if (view === 'kanban') {
    const cols = kanbanColumns ?? [];
    const n = cols.reduce((a, c) => a + (c.cards?.length ?? 0), 0);
    return `The board in ${n} cards across ${cols.length} column${cols.length === 1 ? '' : 's'}. Readable by anyone — this page is the markdown.`;
  }

  if (view === 'doc' || view === 'slides' || !view) {
    return ledeFromHtml(html);
  }

  return ledeFromHtml(html);
}

/** Last word of title rendered in italic (Reader_Collection ch-title). */
export function titleEmphasisParts(title: string): { lead: string; emphasis: string | null } {
  const t = (title ?? '').trim() || 'Untitled';
  const words = t.replace(/\.$/, '').split(/\s+/);
  if (words.length <= 1) return { lead: t, emphasis: null };
  const emphasis = words.pop()!;
  return { lead: words.join(' '), emphasis };
}

export function formatChapterDate(updated: string): string {
  const d = new Date(updated);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
