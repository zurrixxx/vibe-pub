/**
 * Block ids in top-to-bottom order for doc HTML, matching DocView `applyDocEnhancements`
 * after the same heading-id pass as `PublishedPage.addHeadingIds` (h2/h3, tree order).
 */
export function listDocViewBlockIdsInOrder(
  html: string,
  slugifyHeadingText: (text: string) => string
): string[] {
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

    const ids: string[] = [];
    let blockIdx = 0;
    for (const child of Array.from(root.children)) {
      if (!(child instanceof HTMLElement)) continue;
      const blockId = child.id?.trim() || `block-${blockIdx}`;
      ids.push(blockId);
      blockIdx++;
    }
    return ids;
  } catch {
    return [];
  }
}
