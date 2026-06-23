/**
 * block-text-helper — block_id ↔ plain-text mapping for reader gutters, comment anchors,
 * and GET /api/comment. Doc HTML follows DocView + PublishedPage.addHeadingIds.
 */

import rehypeParse from 'rehype-parse';
import { unified } from 'unified';
import type { Element, Root, RootContent } from 'hast';
import type { Block, CommentAnchor } from '$lib/templates/types';
import type { Comment, Page } from '$lib/types';

export const MAX_BLOCK_TEXT_LEN = 2000;

/** Same rules as `PublishedPage.slugifyHeadingText` / reader outline. */
export function slugifyDocHeadingText(text: string): string {
  const t = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return t || 'section';
}

export interface BlockTextEntry {
  block_id: string;
  content: string;
}

function normalizeBlockText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_BLOCK_TEXT_LEN);
}

function getElementId(el: Element): string | undefined {
  const raw = el.properties?.id;
  if (typeof raw === 'string') {
    const id = raw.trim();
    return id || undefined;
  }
  if (Array.isArray(raw) && typeof raw[0] === 'string') {
    const id = raw[0].trim();
    return id || undefined;
  }
  return undefined;
}

function elementPlainText(el: Element): string {
  let out = '';
  function walk(node: Element['children'][number]) {
    if (node.type === 'text') out += node.value;
    else if (node.type === 'element') node.children.forEach(walk);
  }
  el.children.forEach(walk);
  return out.replace(/\s+/g, ' ').trim();
}

function collectHeadingsInOrder(nodes: RootContent[]): Element[] {
  const out: Element[] = [];
  for (const node of nodes) {
    if (node.type !== 'element') continue;
    if (node.tagName === 'h2' || node.tagName === 'h3') out.push(node);
    out.push(...collectHeadingsInOrder(node.children));
  }
  return out;
}

function parseDocHtmlFragment(html: string): Root | null {
  try {
    return unified().use(rehypeParse, { fragment: true }).parse(html.trim()) as Root;
  } catch {
    return null;
  }
}

/** Top-level doc blocks in reader order (id + plain-text preview). */
export function listBlockTextEntries(
  html: string,
  slugifyHeadingText: (text: string) => string = slugifyDocHeadingText
): BlockTextEntry[] {
  const root = parseDocHtmlFragment(html);
  if (!root) return [];

  const used = new Set<string>();
  for (const h of collectHeadingsInOrder(root.children)) {
    const text = elementPlainText(h);
    const base = getElementId(h) ?? slugifyHeadingText(text);
    let candidate = base || 'section';
    let n = 2;
    while (used.has(candidate)) {
      candidate = `${base}-${n}`;
      n++;
    }
    used.add(candidate);
    h.properties = { ...h.properties, id: candidate };
  }

  const out: BlockTextEntry[] = [];
  let blockIdx = 0;
  for (const child of root.children) {
    if (child.type !== 'element') continue;
    const blockId = getElementId(child) ?? `block-${blockIdx}`;
    out.push({
      block_id: blockId,
      content: elementPlainText(child).slice(0, MAX_BLOCK_TEXT_LEN),
    });
    blockIdx++;
  }
  return out;
}

export function listBlockIdsInOrder(
  html: string,
  slugifyHeadingText: (text: string) => string = slugifyDocHeadingText
): string[] {
  return listBlockTextEntries(html, slugifyHeadingText).map((b) => b.block_id);
}

export function blockTextMapFromDocHtml(html: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of listBlockTextEntries(html)) {
    map.set(entry.block_id, entry.content);
  }
  return map;
}

export function blockTextMapFromBlocks(blocks: Block[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const block of blocks) {
    map.set(block.id, normalizeBlockText(block.content));
  }
  return map;
}

export function blockIdFromCommentAnchor(anchor: CommentAnchor | string | null): string | null {
  if (!anchor) return null;
  if (typeof anchor === 'object') {
    if (anchor.type === 'block' && typeof anchor.block_id === 'string') {
      const id = anchor.block_id.trim();
      return id || null;
    }
    return null;
  }
  try {
    const parsed = JSON.parse(anchor) as CommentAnchor;
    if (parsed?.type === 'block' && typeof parsed.block_id === 'string') {
      const id = parsed.block_id.trim();
      return id || null;
    }
  } catch {
    const id = anchor.trim();
    return id || null;
  }
  return null;
}

export type CommentWithBlockText = Omit<Comment, 'anchor'> & {
  anchor: CommentAnchor | string | null;
  block_text: string | null;
};

type ParsedCommentRow = Omit<Comment, 'anchor'> & {
  anchor: CommentAnchor | string | null;
};

export function enrichCommentsWithBlockText(
  comments: ParsedCommentRow[],
  blockTextById: Map<string, string>
): CommentWithBlockText[] {
  return comments.map((c): CommentWithBlockText => {
    const blockId = blockIdFromCommentAnchor(c.anchor);
    const block_text = blockId ? (blockTextById.get(blockId) ?? null) : null;
    return { ...c, block_text };
  });
}

export function buildPageBlockTextMap(
  page: Pick<Page, 'markdown' | 'view'>,
  options: { docHtml?: string; templateBlocks?: Block[] } = {}
): Map<string, string> {
  const view = page.view || 'doc';
  if (view === 'doc') {
    if (options.docHtml !== undefined) return blockTextMapFromDocHtml(options.docHtml);
    return new Map();
  }
  if (options.templateBlocks) return blockTextMapFromBlocks(options.templateBlocks);
  return new Map();
}
