/**
 * Map markdown to comment-style block ids → paragraph/section text.
 * Doc: heading slug per section, plus block-0… from blank-line paragraph splits.
 * Kanban: ### card {#id} … body until next ### / ##.
 */

export interface BlockIdEntry {
  blockId: string;
  text: string;
}

export function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith('---\n')) return markdown;
  const end = markdown.indexOf('\n---\n', 4);
  if (end === -1) return markdown;
  return markdown.slice(end + 5);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/** Same heuristic as the original reference (two-level doc vs kanban). */
export function detectView(markdown: string): 'doc' | 'kanban' {
  const lines = markdown.split('\n');
  let headingWithCheckboxes = 0;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (/^#{2,}\s+\S/.test(line)) {
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') {
        j++;
      }
      if (j < lines.length && /^-\s+\[[ xX]\]/.test(lines[j].trim())) {
        headingWithCheckboxes++;
      }
    }
    i++;
  }
  return headingWithCheckboxes >= 2 ? 'kanban' : 'doc';
}

function docHeadingEntries(markdown: string): BlockIdEntry[] {
  const content = stripFrontmatter(markdown);
  const lines = content.split('\n');
  const entries: BlockIdEntry[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (!m) continue;
    const headingText = m[2].trim();
    const blockId = slugify(headingText);
    const chunk = [lines[i]];
    let j = i + 1;
    while (j < lines.length && !lines[j].match(/^(#{1,6})\s+(.+)/)) {
      chunk.push(lines[j]);
      j++;
    }
    entries.push({ blockId, text: chunk.join('\n').trim() });
  }
  return entries;
}

/** DocView fallback ids: block-0, block-1, … (split on blank-line paragraphs). */
function docParagraphBlockEntries(markdown: string): BlockIdEntry[] {
  const content = stripFrontmatter(markdown);
  const blocks = content
    .split(/\n\s*\n/g)
    .map((b) => b.trim())
    .filter(Boolean);
  return blocks.map((text, i) => ({
    blockId: `block-${i}`,
    text,
  }));
}

/** Kanban cards with `{#id}` on ### lines only (matches resolveKanbanBlockText). */
function kanbanBlockEntries(markdown: string): BlockIdEntry[] {
  const content = stripFrontmatter(markdown);
  const lines = content.split('\n');
  let currentCardId: string | null = null;
  let currentCardLines: string[] = [];
  const entries: BlockIdEntry[] = [];

  function flushCard(): void {
    if (!currentCardId) {
      currentCardLines = [];
      return;
    }
    const text = currentCardLines.join('\n').trim();
    entries.push({ blockId: currentCardId, text });
    currentCardId = null;
    currentCardLines = [];
  }

  for (const line of lines) {
    if (/^##\s+/.test(line) && !/^###\s+/.test(line)) {
      flushCard();
      continue;
    }

    const cardMatch = line.match(/^###\s+(.+)/);
    if (cardMatch) {
      flushCard();
      const rest = cardMatch[1].trim();
      const idMatch = rest.match(/\{#([^}]+)\}/);
      currentCardId = idMatch?.[1] ?? null;
      currentCardLines = [line];
      continue;
    }

    if (currentCardId) {
      currentCardLines.push(line);
    }
  }
  flushCard();
  return entries;
}

export function markdownBlockIdMap(
  markdown: string,
  options: { view?: 'doc' | 'kanban' } = {}
): BlockIdEntry[] {
  const view = options.view ?? detectView(markdown);
  if (view === 'kanban') {
    return kanbanBlockEntries(markdown);
  }
  return [...docHeadingEntries(markdown), ...docParagraphBlockEntries(markdown)];
}

export function formatMarkdownBlockIdMap(
  markdown: string,
  options?: { view?: 'doc' | 'kanban' }
): string {
  return markdownBlockIdMap(markdown, options)
    .map(({ blockId, text }) => `${blockId} : ${text}`)
    .join('\n\n');
}

export function resolveDocBlockText(markdown: string, blockId: string): string | null {
  const content = stripFrontmatter(markdown);
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (!m) continue;
    const headingText = m[2].trim();
    if (slugify(headingText) === blockId) {
      const chunk = [lines[i]];
      let j = i + 1;
      while (j < lines.length && !lines[j].match(/^(#{1,6})\s+(.+)/)) {
        chunk.push(lines[j]);
        j++;
      }
      return chunk.join('\n').trim();
    }
  }

  const idxMatch = String(blockId).match(/^block-(\d+)$/);
  if (idxMatch) {
    const targetIdx = Number(idxMatch[1]);
    const blocks = content
      .split(/\n\s*\n/g)
      .map((b) => b.trim())
      .filter(Boolean);
    if (Number.isInteger(targetIdx) && targetIdx >= 0 && targetIdx < blocks.length) {
      return blocks[targetIdx];
    }
  }

  return null;
}

export function resolveKanbanBlockText(markdown: string, blockId: string): string | null {
  const content = stripFrontmatter(markdown);
  const lines = content.split('\n');
  let currentCardId: string | null = null;
  let currentCardLines: string[] = [];

  function flushCard(): { id: string; text: string } | null {
    if (!currentCardId) return null;
    const text = currentCardLines.join('\n').trim();
    const id = currentCardId;
    currentCardId = null;
    currentCardLines = [];
    return { id, text };
  }

  for (const line of lines) {
    if (/^##\s+/.test(line) && !/^###\s+/.test(line)) {
      const flushed = flushCard();
      if (flushed && flushed.id === blockId) return flushed.text;
      continue;
    }

    const cardMatch = line.match(/^###\s+(.+)/);
    if (cardMatch) {
      const flushed = flushCard();
      if (flushed && flushed.id === blockId) return flushed.text;

      const rest = cardMatch[1].trim();
      const idMatch = rest.match(/\{#([^}]+)\}/);
      currentCardId = idMatch?.[1] ?? null;
      currentCardLines = [line];
      continue;
    }

    if (currentCardId) {
      currentCardLines.push(line);
    }
  }

  const last = flushCard();
  if (last && last.id === blockId) return last.text;
  return null;
}
