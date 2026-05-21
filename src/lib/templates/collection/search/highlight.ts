import { tick } from 'svelte';
import { browser } from '$app/environment';

export const COLLECTION_SEARCH_QUERY_PARAM = 'q';

const MARK_CLASS = 'c-search-mark';
const MARK_ACTIVE_CLASS = 'c-search-mark-active';
const KANBAN_CARD_HIT_CLASS = 'c-search-kanban-card-hit';

const SKIP_PARENT_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'MARK',
  'CODE',
  'PRE',
  'TEXTAREA',
  'INPUT',
  'SELECT',
  'BUTTON',
  'SVG',
]);

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole query as one phrase (spaces kept, not split into AND terms). */
export function searchTermsFromQuery(rawQuery: string): string[] {
  const phrase = normalize(rawQuery);
  return phrase ? [phrase] : [];
}

/** Append or replace `q` on a collection chapter href. */
export function pageHrefWithSearch(href: string, query: string): string {
  if (!browser) return href;
  const url = new URL(href, window.location.origin);
  const q = query.trim();
  if (q) url.searchParams.set(COLLECTION_SEARCH_QUERY_PARAM, q);
  else url.searchParams.delete(COLLECTION_SEARCH_QUERY_PARAM);
  return `${url.pathname}${url.search}`;
}

export function preserveSearchQueryOnHref(href: string, currentQuery: string | null): string {
  if (!browser || !currentQuery?.trim()) return href;
  return pageHrefWithSearch(href, currentQuery);
}

/** Remove `q` from the current location (keeps other params such as `page`). */
export function clearSearchFromUrl(url: URL | string): string {
  const u =
    typeof url === 'string'
      ? new URL(url, browser ? window.location.origin : 'http://local')
      : new URL(url);
  u.searchParams.delete(COLLECTION_SEARCH_QUERY_PARAM);
  const search = u.searchParams.toString();
  return `${u.pathname}${search ? `?${search}` : ''}`;
}

function shouldSkipTextNode(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent) return true;
  if (SKIP_PARENT_TAGS.has(parent.tagName)) return true;
  if (parent.closest(`.${MARK_CLASS}`)) return true;
  if (parent.closest('[data-no-search-highlight]')) return true;
  return false;
}

function wrapTextNode(node: Text, terms: string[]): void {
  const text = node.textContent ?? '';
  if (!text.trim()) return;

  const pattern = terms.map(escapeRegex).join('|');
  if (!pattern) return;

  const re = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(re);
  if (parts.length <= 1) return;

  const frag = document.createDocumentFragment();
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    if (i % 2 === 1) {
      const mark = document.createElement('mark');
      mark.className = MARK_CLASS;
      mark.textContent = part;
      frag.appendChild(mark);
    } else {
      frag.appendChild(document.createTextNode(part));
    }
  }

  node.parentNode?.replaceChild(frag, node);
}

function kanbanBoardCardForMark(mark: Element, root: HTMLElement): HTMLElement | null {
  const onBoard = mark.closest('button.kanban-card[data-card-id]');
  if (onBoard) return onBoard as HTMLElement;

  const drawer = mark.closest('.card-drawer');
  if (!drawer) return null;
  const idText = drawer.querySelector('.dr-cr-id')?.textContent?.trim() ?? '';
  const id = idText.startsWith('#') ? idText.slice(1) : '';
  if (!id) return null;
  return root.querySelector(
    `button.kanban-card[data-card-id="${CSS.escape(id)}"]`
  ) as HTMLElement | null;
}

export function clearKanbanCardSearchOutlines(root: HTMLElement): void {
  root.querySelectorAll(`button.kanban-card.${KANBAN_CARD_HIT_CLASS}`).forEach((el) => {
    el.classList.remove(KANBAN_CARD_HIT_CLASS);
  });
}

/** Yellow dashed outline on board cards that contain a search match. */
export function applyKanbanCardSearchOutlines(root: HTMLElement): void {
  clearKanbanCardSearchOutlines(root);
  const cards = new Set<HTMLElement>();
  root.querySelectorAll(`mark.${MARK_CLASS}`).forEach((mark) => {
    const card = kanbanBoardCardForMark(mark, root);
    if (card) cards.add(card);
  });
  for (const card of cards) card.classList.add(KANBAN_CARD_HIT_CLASS);
}

export function clearSearchHighlights(root: HTMLElement): void {
  clearKanbanCardSearchOutlines(root);
  root.querySelectorAll(`mark.${MARK_CLASS}`).forEach((mark) => {
    const el = mark as HTMLElement;
    const parent = el.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(el.textContent ?? ''), el);
    parent.normalize();
  });
}

export function applySearchHighlights(root: HTMLElement, rawQuery: string): number {
  clearSearchHighlights(root);
  const terms = searchTermsFromQuery(rawQuery);
  if (terms.length === 0) return 0;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    const tn = current as Text;
    if (!shouldSkipTextNode(tn)) nodes.push(tn);
    current = walker.nextNode();
  }

  for (const node of nodes) wrapTextNode(node, terms);

  const marks = root.querySelectorAll(`mark.${MARK_CLASS}`);
  marks.forEach((m, i) => {
    if (i === 0) m.classList.add(MARK_ACTIVE_CLASS);
    else m.classList.remove(MARK_ACTIVE_CLASS);
  });

  applyKanbanCardSearchOutlines(root);

  return marks.length;
}

export function scrollToFirstSearchMark(
  root: HTMLElement,
  behavior: ScrollBehavior = 'smooth'
): void {
  const first = root.querySelector(`mark.${MARK_ACTIVE_CLASS}, mark.${MARK_CLASS}`);
  first?.scrollIntoView({ behavior, block: 'center' });
}

export type SearchHighlightParams = {
  query: string | null | undefined;
  /** Delay highlight until children (e.g. DocView) render. */
  defer?: boolean;
  /** Scroll to first match (default true). */
  scroll?: boolean;
};

export function searchHighlight(
  node: HTMLElement,
  params: SearchHighlightParams | string | null | undefined
) {
  let cancelled = false;
  let scrollTimer: ReturnType<typeof setTimeout> | null = null;

  const resolve = (p: SearchHighlightParams | string | null | undefined) => {
    if (typeof p === 'string' || p == null) {
      return { query: p, defer: true, scroll: true };
    }
    return { defer: true, scroll: true, ...p };
  };

  async function apply(p: SearchHighlightParams | string | null | undefined) {
    if (scrollTimer) {
      clearTimeout(scrollTimer);
      scrollTimer = null;
    }
    clearSearchHighlights(node);

    const { query, defer = true, scroll = true } = resolve(p);
    if (!query?.trim() || cancelled) return;

    if (defer) await tick();
    if (cancelled) return;

    const count = applySearchHighlights(node, query);
    if (count > 0 && scroll && !cancelled) {
      scrollTimer = setTimeout(() => {
        if (!cancelled) scrollToFirstSearchMark(node);
      }, 80);
    }
  }

  void apply(params);

  return {
    update(p: SearchHighlightParams | string | null | undefined) {
      void apply(p);
    },
    destroy() {
      cancelled = true;
      if (scrollTimer) clearTimeout(scrollTimer);
      clearSearchHighlights(node);
    },
  };
}
