// src/lib/templates/slides/parser.ts — server-only (imports gray-matter)
import type { Block } from '../types';
import matter from 'gray-matter';
import { marked } from 'marked';

export interface Slide {
  index: number;
  markdown: string; // raw markdown of this slide
  html: string; // rendered HTML
}

export interface SlidesParseResult {
  slides: Slide[];
  blocks: Block[];
}

/**
 * Parse slides markdown into individual slides and blocks.
 *
 * Format:
 *   Content between --- horizontal rules becomes one slide.
 *   Frontmatter --- delimiters are stripped first (via gray-matter),
 *   then the body is split on \n---\n boundaries.
 */
export function parseSlidesBlocks(markdown: string): SlidesParseResult {
  const { content } = matter(markdown);

  // Split on --- that appear on their own line (slide separators)
  const rawSlides = content
    .split(/\n---\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const slides: Slide[] = [];
  const blocks: Block[] = [];

  for (let i = 0; i < rawSlides.length; i++) {
    const md = rawSlides[i];
    const html = marked.parse(md) as string;

    slides.push({
      index: i,
      markdown: md,
      html,
    });

    // Extract first line as hint
    const firstLine = md
      .split('\n')[0]
      .replace(/^#+\s*/, '')
      .trim();

    blocks.push({
      id: `slide:${i}`,
      type: 'slide',
      index: i,
      hint: firstLine.slice(0, 80),
      content: md,
      metadata: {
        slideIndex: i,
      },
    });
  }

  return { slides, blocks };
}
