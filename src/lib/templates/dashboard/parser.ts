// src/lib/templates/dashboard/parser.ts — server-only (imports gray-matter)
import type { Block } from '../types';
import matter from 'gray-matter';

export interface DashboardTable {
  headers: string[];
  rows: string[][];
}

export interface DashboardSection {
  title: string;
  type: 'kpi' | 'table' | 'text';
  table?: DashboardTable;
  text?: string;
}

export interface DashboardParseResult {
  sections: DashboardSection[];
  blocks: Block[];
}

/**
 * Parse dashboard markdown into sections and blocks.
 *
 * Format:
 *   ## Section Title          -> section heading
 *   | Header | ... |          -> table (if present)
 *   |--------|-----|          -> table separator
 *   | Cell   | ... |          -> table row
 *   plain text               -> text content (if no table in section)
 *
 * Section type detection:
 *   - 'kpi' if the table has both "Value" and "Change" columns (case-insensitive)
 *   - 'table' if the section contains any markdown table
 *   - 'text' if the section has no table (raw markdown content)
 */
export function parseDashboardBlocks(markdown: string): DashboardParseResult {
  const { content } = matter(markdown);
  const lines = content.split('\n');

  const sections: DashboardSection[] = [];
  const blocks: Block[] = [];
  let currentTitle: string | null = null;
  let currentLines: string[] = [];
  let blockIndex = 0;

  function flushSection() {
    if (!currentTitle) return;

    const raw = currentLines.join('\n').trim();
    const table = extractTable(currentLines);
    let type: 'kpi' | 'table' | 'text';

    if (table) {
      const headersLower = table.headers.map((h) => h.toLowerCase());
      type = headersLower.includes('value') && headersLower.includes('change') ? 'kpi' : 'table';
    } else {
      type = 'text';
    }

    const section: DashboardSection = {
      title: currentTitle,
      type,
      ...(table ? { table } : {}),
      ...(type === 'text' ? { text: raw } : {}),
    };

    sections.push(section);
    blocks.push({
      id: `section:${currentTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')}`,
      type: 'section',
      index: blockIndex++,
      hint: `${currentTitle}`.slice(0, 80),
      content: `## ${currentTitle}\n\n${raw}`,
      metadata: {
        sectionType: type,
        title: currentTitle,
      },
    });

    currentTitle = null;
    currentLines = [];
  }

  for (const line of lines) {
    // ## Section heading
    const headingMatch = line.match(/^##\s+(.+)/);
    if (headingMatch && !line.startsWith('###')) {
      flushSection();
      currentTitle = headingMatch[1].trim();
      continue;
    }

    if (currentTitle) {
      currentLines.push(line);
    }
  }
  flushSection();

  return { sections, blocks };
}

/**
 * Extract a markdown table from a set of lines.
 * Returns null if no valid table found.
 */
function extractTable(lines: string[]): DashboardTable | null {
  const tableLines: string[] = [];
  let foundSeparator = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Table row: starts and ends with |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      tableLines.push(trimmed);
      // Check if this is the separator row (|---|---|)
      if (/^\|[\s\-:|]+\|$/.test(trimmed)) {
        foundSeparator = true;
      }
    }
  }

  // Need at least header + separator + 1 data row
  if (tableLines.length < 3 || !foundSeparator) return null;

  const headers = parseCells(tableLines[0]);
  // Skip the separator line (index 1)
  const rows: string[][] = [];
  for (let i = 2; i < tableLines.length; i++) {
    // Skip any additional separator-like rows
    if (/^\|[\s\-:|]+\|$/.test(tableLines[i])) continue;
    rows.push(parseCells(tableLines[i]));
  }

  return { headers, rows };
}

/**
 * Parse a markdown table row into cells.
 * "| a | b | c |" -> ["a", "b", "c"]
 */
function parseCells(row: string): string[] {
  return row
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
}
