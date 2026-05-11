/**
 * Block ids in top-to-bottom order for doc HTML, matching DocView `applyDocEnhancements`
 * after the same heading-id pass as `PublishedPage.addHeadingIds` (h2/h3, tree order).
 */

/** Same rules as `PublishedPage.slugifyHeadingText` / reader outline. */
export function slugifyDocHeadingText(text: string): string {
  const t = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return t || 'section';
}

export interface DocBlockMapEntry {
  /** DOM / gutter id used in comment anchors (`data-for-block`) */
  block_id: string;
  /** Plain-text preview of that top-level block (whitespace normalized) */
  content: string;
}

const MAX_BLOCK_CONTENT_LEN = 2000;

/**
 * Map each reader top-level doc block to `block_id` + text preview (for comment anchors).
 * Algorithm matches `listDocViewBlockIdsInOrder` + DocView gutter assignment.
 */
export function listDocViewBlockMap(
  html: string,
  slugifyHeadingText: (text: string) => string = slugifyDocHeadingText
): DocBlockMapEntry[] {
  if (typeof DOMParser === 'undefined') return [];
  try {
    const doc = new DOMParser().parseFromString(
      `<div id="__doc_view_frag">${html}</div>`,
      'text/html'
    );
    const root = doc.getElementById('__doc_view_frag');
    if (!root) return [];

    const used = new Set<string>();
    root.querySelectorAll('h2, h3').forEach((h) => {
      const el = h as HTMLElement;
      const text = (el.textContent ?? '').trim();
      const base = el.id?.trim() ? el.id.trim() : slugifyHeadingText(text);
      let candidate = base || 'section';
      let n = 2;
      while (used.has(candidate)) {
        candidate = `${base}-${n}`;
        n++;
      }
      used.add(candidate);
      el.id = candidate;
    });

    const out: DocBlockMapEntry[] = [];
    let blockIdx = 0;
    for (const child of Array.from(root.children)) {
      if (!(child instanceof HTMLElement)) continue;
      const blockId = child.id?.trim() || `block-${blockIdx}`;
      const raw = (child.textContent ?? '').replace(/\s+/g, ' ').trim();
      out.push({
        block_id: blockId,
        content: raw.slice(0, MAX_BLOCK_CONTENT_LEN),
      });
      blockIdx++;
    }
    return out;
  } catch {
    return [];
  }
}

export function listDocViewBlockIdsInOrder(
  html: string,
  slugifyHeadingText: (text: string) => string = slugifyDocHeadingText
): string[] {
  return listDocViewBlockMap(html, slugifyHeadingText).map((b) => b.block_id);
}
