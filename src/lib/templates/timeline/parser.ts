// src/lib/templates/timeline/parser.ts — server-only (imports gray-matter)
import type { Block } from '../types';
import matter from 'gray-matter';

export interface TimelineEvent {
  text: string;
  detail?: string;
}

export interface TimelinePeriod {
  title: string; // "April 2026"
  events: TimelineEvent[];
}

export interface TimelineSection {
  title: string; // "Q2 2026 — Launch"
  periods: TimelinePeriod[];
}

export interface TimelineParseResult {
  sections: TimelineSection[];
  blocks: Block[];
}

/**
 * Parse timeline markdown into sections, periods, and blocks.
 *
 * Format:
 *   ## Section Title           -> section
 *   ### Period Title            -> period
 *   - event text               -> event
 *   - event text — detail      -> event with detail (split on em-dash)
 */
export function parseTimelineBlocks(markdown: string): TimelineParseResult {
  const { content } = matter(markdown);
  const lines = content.split('\n');

  const sections: TimelineSection[] = [];
  const blocks: Block[] = [];
  let currentSection: { title: string; rawLines: string[]; periods: TimelinePeriod[] } | null =
    null;
  let currentPeriod: TimelinePeriod | null = null;
  let blockIndex = 0;

  function flushPeriod() {
    if (!currentPeriod || !currentSection) return;
    if (currentPeriod.events.length > 0) {
      currentSection.periods.push(currentPeriod);
    }
    currentPeriod = null;
  }

  function flushSection() {
    if (!currentSection) return;
    flushPeriod();
    const raw = currentSection.rawLines.join('\n').trim();
    const section: TimelineSection = {
      title: currentSection.title,
      periods: currentSection.periods,
    };
    sections.push(section);
    blocks.push({
      id: `period:${currentSection.title}`,
      type: 'period',
      index: blockIndex++,
      hint: currentSection.title.slice(0, 80),
      content: raw,
      metadata: {
        sectionTitle: currentSection.title,
        periodCount: currentSection.periods.length,
      },
    });
    currentSection = null;
  }

  for (const line of lines) {
    // ## Section Title
    const sectionMatch = line.match(/^##\s+(.+)/);
    if (sectionMatch && !line.startsWith('###')) {
      flushSection();
      currentSection = {
        title: sectionMatch[1].trim(),
        rawLines: [line],
        periods: [],
      };
      continue;
    }

    // ### Period Title
    const periodMatch = line.match(/^###\s+(.+)/);
    if (periodMatch && currentSection) {
      flushPeriod();
      currentPeriod = {
        title: periodMatch[1].trim(),
        events: [],
      };
      currentSection.rawLines.push(line);
      continue;
    }

    // - event (with optional em-dash detail)
    const eventMatch = line.match(/^-\s+(.+)/);
    if (eventMatch && currentPeriod) {
      const full = eventMatch[1].trim();
      // Split on em-dash for optional detail
      const dashIndex = full.indexOf('\u2014');
      if (dashIndex > 0) {
        currentPeriod.events.push({
          text: full.slice(0, dashIndex).trim(),
          detail: full.slice(dashIndex + 1).trim(),
        });
      } else {
        currentPeriod.events.push({ text: full });
      }
      if (currentSection) currentSection.rawLines.push(line);
      continue;
    }

    // Other lines (blanks, etc.) — accumulate into current section raw
    if (currentSection) {
      currentSection.rawLines.push(line);
    }
  }
  flushSection();

  return { sections, blocks };
}
