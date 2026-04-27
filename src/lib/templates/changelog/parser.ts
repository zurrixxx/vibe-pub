// src/lib/templates/changelog/parser.ts — server-only (imports gray-matter)
import type { Block } from '../types';
import matter from 'gray-matter';

export interface ChangelogEntry {
  text: string;
}

export interface ChangelogCategory {
  name: string; // 'Added' | 'Changed' | 'Fixed' | 'Removed' | 'Deprecated' | 'Security' | etc.
  entries: ChangelogEntry[];
}

export interface ChangelogRelease {
  version: string; // '1.2.0'
  date: string; // '2024-03-15'
  categories: ChangelogCategory[];
  raw: string; // raw markdown of this release section
}

export interface ChangelogParseResult {
  releases: ChangelogRelease[];
  blocks: Block[];
}

/**
 * Parse changelog markdown into releases, categories, and blocks.
 *
 * Format:
 *   ## [version] - date          -> release
 *   ### Category                 -> category (Added, Changed, Fixed, etc.)
 *   - item                      -> change entry
 */
export function parseChangelogBlocks(markdown: string): ChangelogParseResult {
  const { content } = matter(markdown);
  const lines = content.split('\n');

  const releases: ChangelogRelease[] = [];
  const blocks: Block[] = [];
  let currentRelease: {
    version: string;
    date: string;
    rawLines: string[];
    categories: ChangelogCategory[];
  } | null = null;
  let currentCategory: ChangelogCategory | null = null;
  let blockIndex = 0;

  function flushRelease() {
    if (!currentRelease) return;
    flushCategory();
    const raw = currentRelease.rawLines.join('\n').trim();
    const release: ChangelogRelease = {
      version: currentRelease.version,
      date: currentRelease.date,
      categories: currentRelease.categories,
      raw,
    };
    releases.push(release);
    blocks.push({
      id: `release:${currentRelease.version}`,
      type: 'release',
      index: blockIndex++,
      hint: `${currentRelease.version} - ${currentRelease.date}`.slice(0, 80),
      content: raw,
      metadata: {
        version: currentRelease.version,
        date: currentRelease.date,
        categoryCount: currentRelease.categories.length,
      },
    });
    currentRelease = null;
  }

  function flushCategory() {
    if (!currentCategory || !currentRelease) return;
    if (currentCategory.entries.length > 0) {
      currentRelease.categories.push(currentCategory);
    }
    currentCategory = null;
  }

  for (const line of lines) {
    // ## [version] - date
    const releaseMatch = line.match(/^##\s+\[([^\]]+)\](?:\s*-\s*(.+))?/);
    if (releaseMatch && !line.startsWith('###')) {
      flushRelease();
      currentRelease = {
        version: releaseMatch[1].trim(),
        date: (releaseMatch[2] || '').trim(),
        rawLines: [line],
        categories: [],
      };
      continue;
    }

    // ### Category
    const categoryMatch = line.match(/^###\s+(.+)/);
    if (categoryMatch && currentRelease) {
      flushCategory();
      currentCategory = {
        name: categoryMatch[1].trim(),
        entries: [],
      };
      currentRelease.rawLines.push(line);
      continue;
    }

    // - entry
    const entryMatch = line.match(/^-\s+(.+)/);
    if (entryMatch && currentCategory) {
      currentCategory.entries.push({ text: entryMatch[1].trim() });
      if (currentRelease) currentRelease.rawLines.push(line);
      continue;
    }

    // Other lines (blanks, etc.) — accumulate into current release raw
    if (currentRelease) {
      currentRelease.rawLines.push(line);
    }
  }
  flushRelease();

  return { releases, blocks };
}
