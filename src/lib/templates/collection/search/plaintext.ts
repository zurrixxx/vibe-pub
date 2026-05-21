import { parseFrontmatter } from '$lib/server/markdown';
import { parseKanbanBlocks } from '$lib/templates/kanban/parser';

const MAX_TEXT_PER_PAGE = 12_000;

/** Strip leading `0 · ` / `1 — ` column index from kanban column titles. */
function stripColumnIndex(title: string): string {
  const s = title.trim();
  const w = s.replace(/^\d+\s*(?:\u00B7|[-\u2013\u2014])\s*/, '').trim();
  return w || s;
}

/** Plain text from markdown body (no structural syntax). */
export function markdownBodyToPlain(body: string): string {
  let s = body;
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/```[\s\S]*?```/g, ' ');
  s = s.replace(/`[^`]+`/g, ' ');
  s = s.replace(/!\[[^\]]*]\([^)]*\)/g, ' ');
  s = s.replace(/\[([^\]]+)]\([^)]*\)/g, '$1');
  s = s.replace(/\{#([^}]+)\}/g, ' ');
  s = s.replace(/\s+\[[^\]]*]\s*$/gm, ' ');
  s = s.replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, '');
  s = s.replace(/^\s*\d+\.\s+/gm, '');
  s = s.replace(/^\s*[-*+]\s+/gm, '');
  s = s.replace(/^#{1,6}\s+/gm, '');
  s = s.replace(/^>\s+/gm, '');
  s = s.replace(/^\s*\|/gm, '');
  s = s.replace(/[*_~]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function kanbanMarkdownToPlain(markdown: string): string {
  const { columns } = parseKanbanBlocks(markdown);
  const chunks: string[] = [];
  for (const col of columns) {
    const title = stripColumnIndex(col.title);
    if (title) chunks.push(title);
    for (const card of col.cards) {
      if (card.title.trim()) chunks.push(card.title.trim());
      if (card.body.trim()) chunks.push(markdownBodyToPlain(card.body));
    }
  }
  return chunks.join(' ');
}

/**
 * Build searchable plain text from page markdown (title + frontmatter + readable body).
 * Kanban pages use the parser so {#id}, [labels], ##/###, and task markup are excluded.
 */
export function markdownToPlainSearchText(markdown: string, displayTitle: string): string {
  const { content, data } = parseFrontmatter(markdown);
  const fm = data as Record<string, unknown>;
  const view = typeof fm.view === 'string' ? fm.view : '';

  const fmBits = [displayTitle, fm.title, fm.lede, fm.subtitle, fm.kicker]
    .filter((v) => typeof v === 'string' && v.trim())
    .join(' ');

  const body =
    view === 'kanban'
      ? kanbanMarkdownToPlain(markdown) || markdownBodyToPlain(content)
      : markdownBodyToPlain(content);

  return `${fmBits} ${body}`.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT_PER_PAGE);
}
