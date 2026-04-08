// src/lib/templates/doc/parser.ts
import type { Block } from '../types';
import matter from 'gray-matter';

/**
 * Parse markdown into doc blocks.
 * Each heading starts a new heading block.
 * Content between headings becomes paragraph blocks grouped under the heading.
 */
export function parseDocBlocks(markdown: string): Block[] {
  const { content } = matter(markdown);
  const lines = content.split('\n');
  const blocks: Block[] = [];
  let currentHeadingSlug = '';
  let buffer: string[] = [];
  let blockIndex = 0;
  let paragraphIndex = 0;

  function flushBuffer() {
    const text = buffer.join('\n').trim();
    if (!text) {
      buffer = [];
      return;
    }
    const id = currentHeadingSlug
      ? `p:${paragraphIndex}:under:${currentHeadingSlug}`
      : `p:${paragraphIndex}:top`;
    blocks.push({
      id,
      type: 'paragraph',
      index: blockIndex++,
      hint: text.slice(0, 80),
      content: text,
    });
    paragraphIndex++;
    buffer = [];
  }

  function slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      flushBuffer();
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      currentHeadingSlug = slugify(title);
      paragraphIndex = 0;
      blocks.push({
        id: `heading:${currentHeadingSlug}`,
        type: 'heading',
        index: blockIndex++,
        hint: title.slice(0, 80),
        content: line,
        metadata: { level },
      });
    } else {
      buffer.push(line);
    }
  }
  flushBuffer();

  return blocks;
}
