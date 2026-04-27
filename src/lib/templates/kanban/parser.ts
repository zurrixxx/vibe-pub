// src/lib/templates/kanban/parser.ts — server-only (imports gray-matter)
import type { Block } from '../types';
import matter from 'gray-matter';
// Re-export types and serialize from the client-safe module
export {
  serializeKanban,
  type KanbanCard,
  type KanbanColumn,
  type KanbanLabels,
} from './serialize';
import type { KanbanCard, KanbanColumn, KanbanLabels } from './serialize';

function nanoid(size = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < size; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export interface KanbanParseResult {
  columns: KanbanColumn[];
  blocks: Block[];
  labels: KanbanLabels;
  needsIdInjection: boolean; // true if any card was missing {#id}
  normalizedMarkdown: string; // markdown with auto-generated IDs injected
}

/**
 * Parse kanban markdown into columns, cards, and blocks.
 *
 * Format:
 *   ## Column Title          -> column
 *   ### Card Title {#id} [label1, label2]   -> card
 *   body lines...            -> card body (until next ### or ##)
 */
export function parseKanbanBlocks(markdown: string): KanbanParseResult {
  const { data: fm, content } = matter(markdown);
  const labels: KanbanLabels = (fm.labels as KanbanLabels) || {};
  const lines = content.split('\n');

  const columns: KanbanColumn[] = [];
  const blocks: Block[] = [];
  let currentColumn: KanbanColumn | null = null;
  let currentCard: {
    titleLine: string;
    id: string;
    title: string;
    labels: string[];
    bodyLines: string[];
    generated: boolean;
  } | null = null;
  let blockIndex = 0;
  let needsIdInjection = false;
  const outputLines: string[] = [];

  // Rebuild frontmatter for normalizedMarkdown
  const fmRaw = markdown.match(/^---\n[\s\S]*?\n---\n/);
  if (fmRaw) {
    outputLines.push(fmRaw[0].trimEnd());
  }

  function flushCard() {
    if (!currentCard || !currentColumn) return;
    const body = currentCard.bodyLines.join('\n').trim();
    const card: KanbanCard = {
      id: currentCard.id,
      title: currentCard.title,
      labels: currentCard.labels,
      body,
      column: currentColumn.title,
    };
    currentColumn.cards.push(card);
    blocks.push({
      id: currentCard.id,
      type: 'card',
      index: blockIndex++,
      hint: currentCard.title.slice(0, 80),
      content: currentCard.titleLine + (body ? '\n' + body : ''),
      metadata: {
        column: currentColumn.title,
        labels: currentCard.labels,
        body,
      },
    });
    if (currentCard.generated) needsIdInjection = true;
    currentCard = null;
  }

  for (const line of lines) {
    // ## Column (but not ###)
    const colMatch = line.match(/^##\s+(.+)/);
    if (colMatch && !line.match(/^###/)) {
      flushCard();
      currentColumn = { title: colMatch[1].trim(), cards: [] };
      columns.push(currentColumn);
      outputLines.push('', line);
      continue;
    }

    // ### Card {#id} [labels]
    const cardMatch = line.match(/^###\s+(.+)/);
    if (cardMatch && currentColumn) {
      flushCard();
      let rest = cardMatch[1].trim();

      // Extract [labels] from end
      let cardLabels: string[] = [];
      const labelMatch = rest.match(/\[([^\]]*)\]\s*$/);
      if (labelMatch) {
        cardLabels = labelMatch[1]
          .split(',')
          .map((l) => l.trim())
          .filter(Boolean);
        rest = rest.slice(0, labelMatch.index).trim();
      }

      // Extract {#id}
      let cardId = '';
      let generated = false;
      const idMatch = rest.match(/\{#([^}]+)\}\s*$/);
      if (idMatch) {
        cardId = idMatch[1];
        rest = rest.slice(0, idMatch.index).trim();
      } else {
        cardId = 'c' + nanoid(6);
        generated = true;
      }

      const cardTitle = rest;

      // Rebuild the line with id injected (for normalization)
      const labelsStr = cardLabels.length > 0 ? ` [${cardLabels.join(', ')}]` : '';
      const normalizedLine = `### ${cardTitle} {#${cardId}}${labelsStr}`;
      outputLines.push('', normalizedLine);

      currentCard = {
        titleLine: normalizedLine,
        id: cardId,
        title: cardTitle,
        labels: cardLabels,
        bodyLines: [],
        generated,
      };
      continue;
    }

    // Card body lines
    if (currentCard) {
      currentCard.bodyLines.push(line);
      outputLines.push(line);
    } else if (currentColumn) {
      // Lines between column header and first card (usually empty)
      outputLines.push(line);
    }
  }
  flushCard();

  // Sort columns by numeric prefix if present (e.g. "0-backlog", "1-signal", "3-scale")
  const sortedColumns = [...columns].sort((a, b) => {
    const aNum = a.title.match(/^(\d+)/);
    const bNum = b.title.match(/^(\d+)/);
    if (aNum && bNum) return parseInt(aNum[1]) - parseInt(bNum[1]);
    if (aNum) return -1;
    if (bNum) return 1;
    return 0; // preserve original order for non-numeric
  });

  return {
    columns: sortedColumns,
    blocks,
    labels,
    needsIdInjection,
    normalizedMarkdown: outputLines.join('\n').trim() + '\n',
  };
}

// serializeKanban moved to ./serialize.ts (client-safe)
