<script lang="ts">
  import { browser } from '$app/environment';
  import { tick } from 'svelte';
  import { kanbanReaderBoardFullwidth } from '$lib/stores';
  import type { Comment } from '$lib/types';
  import {
    serializeKanban,
    type KanbanCard,
    type KanbanColumn,
    type KanbanLabels,
  } from './serialize';
  import KanbanCardComponent from './KanbanCard.svelte';
  import { marked } from 'marked';
  import { parseKanbanBlocks } from './parser';
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  interface Props {
    markdown: string;
    pageId: string;
    comments: Comment[];
    initialColumns: KanbanColumn[];
    initialLabels: KanbanLabels;
    isOwner?: boolean;
    /** Reader_Kanban full-width board (driven by parent + `kanbanReaderBoardFullwidth` store, same as Header ···). */
    boardFullwidth?: boolean;
  }

  let {
    markdown,
    pageId,
    comments,
    initialColumns,
    initialLabels,
    isOwner = false,
    boardFullwidth = true,
  }: Props = $props();

  let columns = $state<KanbanColumn[]>(
    initialColumns.map((col) => ({
      title: col.title,
      cards: col.cards.map((c) => ({ ...c })),
    }))
  );
  let labels = $state<KanbanLabels>({ ...initialLabels });
  let sortMode = $state<'column' | 'label' | 'due'>('column');

  // Extract frontmatter from markdown for serialization (simple regex, no gray-matter)
  function getFrontmatter(): Record<string, unknown> {
    const match = markdown.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return { view: 'kanban' };
    const fm: Record<string, unknown> = { view: 'kanban' };
    for (const line of match[1].split('\n')) {
      const kv = line.match(/^(\w[\w-]*)\s*:\s*(.+)/);
      if (kv && kv[1] !== 'labels') {
        let val: unknown = kv[2].trim();
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        else if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"'))
          val = val.slice(1, -1);
        fm[kv[1]] = val;
      }
    }
    return fm;
  }

  /** Strip due metadata from card body so the board preview does not echo it (footer chip still shows due). */
  function stripDueMetaForPreview(text: string): string {
    let t = text.replace(/<!--\s*due:\s*[\d-]+\s*(?:-->|->)\s*/gi, '');
    t = t.replace(/^\s*<!--\s*due:\s*[^\n\r]*$/gim, '');
    return t;
  }

  const dueBodyLineRe = /^(?:\*\*)?due:?\*?\*?\s*.+$/i;

  // Get body preview (first 2 non-empty lines), excluding due-only lines
  function bodyPreview(body: string): string {
    if (!body) return '';
    const cleaned = stripDueMetaForPreview(body);
    const lines = cleaned
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !dueBodyLineRe.test(l));
    return lines.slice(0, 2).join(' ').slice(0, 120);
  }

  // ─── Card detail drawer (Reader_Kanban `.card-drawer`) ─────────
  let expandedCard = $state<KanbanCard | null>(null);
  let expandedColumnTitle = $state<string>('');
  let saving = $state(false);

  function expandCard(card: KanbanCard, columnTitle: string) {
    expandedCard = { ...card };
    expandedColumnTitle = columnTitle;
  }

  function closeExpanded() {
    expandedCard = null;
  }

  /** True if click path included an element inside `selector` (survives target node removal mid-bubble). */
  function composedPathIncludesSelector(e: MouseEvent, selector: string): boolean {
    return e.composedPath().some((n) => n instanceof Element && n.closest(selector));
  }

  /** Click outside drawer (blank / chrome) closes it; keep open on cards & board toolbar. */
  function onWindowClick(e: MouseEvent) {
    if (expandedCard) {
      if (
        !composedPathIncludesSelector(e, '.card-drawer') &&
        !composedPathIncludesSelector(e, '.kanban-card') &&
        !composedPathIncludesSelector(e, '.kb-board-tools')
      ) {
        closeExpanded();
      }
    }
    if (!openToolbarMenu) return;
    const el = e.target;
    if (el instanceof Element && el.closest('.kb-board-tools')) return;
    closeToolbarMenus();
  }

  $effect(() => {
    if (!browser || !expandedCard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeExpanded();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ─── Drag-and-drop ────────────────────────────────────────────
  let dragCardId = $state<string | null>(null);
  let dragSourceColumn = $state<string | null>(null);
  let dragOverColumn = $state<string | null>(null);
  /** Insert index in column `cards` (0 = before first). Only used when `sortMode === 'column'`. */
  let dragInsertSlot = $state<number | null>(null);

  function onDragStart(e: DragEvent, card: KanbanCard, columnTitle: string) {
    dragCardId = card.id;
    dragSourceColumn = columnTitle;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.id);
    }
  }

  /** Slot from Y against direct `.card-drag-wrapper` children (matches column order when sortMode is column). */
  function slotFromPointerInList(listEl: HTMLElement, clientY: number): number {
    const wrappers = [...listEl.querySelectorAll(':scope > .card-drag-wrapper')] as HTMLElement[];
    for (let i = 0; i < wrappers.length; i++) {
      const r = wrappers[i]!.getBoundingClientRect();
      if (clientY < r.top + r.height / 2) return i;
    }
    return wrappers.length;
  }

  /** Same-column: current slot yields the same card order as now (no placeholder / no save). */
  function sameColSlotNoOp(
    columnTitle: string,
    vis: KanbanCard[],
    slot: number | null,
    cardId: string,
    sourceCol: string
  ): boolean {
    if (slot === null || sortMode !== 'column' || sourceCol !== columnTitle) return false;
    const o = vis.findIndex((c) => c.id === cardId);
    if (o < 0) return false;
    const afterRemoveLen = vis.length - 1;
    let insertAt = slot;
    if (o < insertAt) insertAt -= 1;
    insertAt = Math.max(0, Math.min(insertAt, afterRemoveLen));
    return insertAt === o;
  }

  function kanbanDragSlotIsNoOp(columnTitle: string, vis: KanbanCard[]): boolean {
    if (!dragCardId || !dragSourceColumn) return false;
    return sameColSlotNoOp(columnTitle, vis, dragInsertSlot, dragCardId, dragSourceColumn);
  }

  function onDragOverColumn(e: DragEvent, columnTitle: string) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    dragOverColumn = columnTitle;
    const t = e.target;
    if (isOwner && sortMode === 'column' && t instanceof Element && t.closest('.column-header')) {
      dragInsertSlot = 0;
    }
  }

  function onDragOverCardsList(e: DragEvent, columnTitle: string) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    dragOverColumn = columnTitle;
    if (!isOwner || sortMode !== 'column') {
      dragInsertSlot = null;
      return;
    }
    const list = e.currentTarget;
    if (list instanceof HTMLElement) dragInsertSlot = slotFromPointerInList(list, e.clientY);
  }

  /** Ignore spurious `dragleave` when the pointer is still inside the column (e.g. entering a child). */
  function onDragLeave(e: DragEvent, columnTitle: string) {
    const cur = e.currentTarget;
    if (cur instanceof HTMLElement) {
      const rel = e.relatedTarget;
      if (rel instanceof Node && cur.contains(rel)) return;
    }
    if (dragOverColumn === columnTitle) {
      dragOverColumn = null;
      dragInsertSlot = null;
    }
  }

  async function onDrop(e: DragEvent, targetColumnTitle: string) {
    e.preventDefault();
    const slotHint = dragInsertSlot;
    dragOverColumn = null;
    dragInsertSlot = null;
    if (!dragCardId || !dragSourceColumn) return;

    if (dragSourceColumn === targetColumnTitle && sortMode !== 'column') {
      dragCardId = null;
      dragSourceColumn = null;
      return;
    }

    const skipCol = columns.find((c) => c.title === targetColumnTitle);
    if (
      skipCol &&
      sameColSlotNoOp(
        targetColumnTitle,
        orderedCards(skipCol.cards),
        slotHint,
        dragCardId,
        dragSourceColumn
      )
    ) {
      dragCardId = null;
      dragSourceColumn = null;
      return;
    }

    let movedCard: KanbanCard | null = null;
    for (const col of columns) {
      const found = col.cards.find((c) => c.id === dragCardId);
      if (found) {
        movedCard = { ...found };
        break;
      }
    }
    if (!movedCard) {
      dragCardId = null;
      dragSourceColumn = null;
      return;
    }

    saving = true;
    const fm = getFrontmatter();
    const newColumns = columns.map((c) => ({
      ...c,
      cards: [...c.cards],
    }));

    let oldIndex = -1;
    let oldColTitle = '';
    for (const col of newColumns) {
      const idx = col.cards.findIndex((c) => c.id === dragCardId);
      if (idx >= 0) {
        oldIndex = idx;
        oldColTitle = col.title;
        col.cards.splice(idx, 1);
        break;
      }
    }
    if (oldIndex < 0) {
      saving = false;
      dragCardId = null;
      dragSourceColumn = null;
      return;
    }

    const tcol = newColumns.find((c) => c.title === targetColumnTitle);
    if (!tcol) {
      saving = false;
      dragCardId = null;
      dragSourceColumn = null;
      return;
    }

    let insertAt: number;
    if (sortMode === 'column' && slotHint !== null) {
      insertAt = slotHint;
      if (oldColTitle === targetColumnTitle && oldIndex < insertAt) insertAt -= 1;
      insertAt = Math.max(0, Math.min(insertAt, tcol.cards.length));
    } else {
      insertAt = tcol.cards.length;
    }

    const placed: KanbanCard = { ...movedCard, column: targetColumnTitle };
    tcol.cards.splice(insertAt, 0, placed);

    dragCardId = null;
    dragSourceColumn = null;

    columns = newColumns;

    const newMarkdown = serializeKanban(fm, newColumns, labels);
    await putMarkdown(newMarkdown);
    saving = false;
  }

  function onDragEnd() {
    dragCardId = null;
    dragSourceColumn = null;
    dragOverColumn = null;
    dragInsertSlot = null;
  }

  // ─── API save ─────────────────────────────────────────────────
  async function putMarkdown(newMarkdown: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/pub/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: newMarkdown }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ─── Per-card comments ────────────────────────────────────────
  // Local reactive copy of comments so we can append without reload
  let localComments = $state<typeof comments>(comments);
  $effect(() => {
    localComments = comments;
  });

  let openToolbarMenu = $state<'filter' | 'sort' | 'view' | null>(null);
  let filterKey = $state<string>('all');
  let density = $state<'comfortable' | 'compact'>('comfortable');
  let visibleColCount = $state<3 | 4 | 5>(5);

  /** Re-sync board when `markdown` changes (e.g. reader version history snapshot). */
  $effect(() => {
    void pageId;
    void markdown;
    closeExpanded();
    dragCardId = null;
    dragSourceColumn = null;
    dragOverColumn = null;
    dragInsertSlot = null;
    openToolbarMenu = null;
    try {
      const parsed = parseKanbanBlocks(markdown);
      columns = parsed.columns.map((col) => ({
        title: col.title,
        cards: col.cards.map((c) => ({ ...c })),
      }));
      labels = { ...parsed.labels };
    } catch (e) {
      console.error('[KanbanView] parseKanbanBlocks:', e);
      /* Do not clear the board — keep SSR / previous columns if parse fails. */
    }
  });

  function closeToolbarMenus() {
    openToolbarMenu = null;
  }

  function toggleToolbarMenu(which: 'filter' | 'sort' | 'view') {
    openToolbarMenu = openToolbarMenu === which ? null : which;
  }

  function labelSwatch(label: string): string {
    const k = label.toLowerCase();
    const preset: Record<string, string> = {
      bug: 'var(--label-bug)',
      feature: 'var(--label-feature)',
      urgent: 'var(--label-urgent)',
      design: 'var(--label-design)',
      infra: '#0f766e',
      docs: '#6b7280',
    };
    return labels[label] ?? labels[k] ?? preset[k] ?? 'var(--text-tertiary)';
  }

  const KANBAN_PRESET_LABELS = new Set(['bug', 'feature', 'urgent', 'design', 'infra', 'docs']);

  function labelIsPreset(name: string): boolean {
    return KANBAN_PRESET_LABELS.has(name.toLowerCase());
  }

  let labelMenuRows = $derived.by(() => {
    const m = new Map<string, number>();
    for (const col of columns) {
      for (const card of col.cards) {
        for (const lb of card.labels) {
          const key = lb.toLowerCase();
          m.set(key, (m.get(key) ?? 0) + 1);
        }
      }
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  });

  let toolbarTotalCards = $derived(columns.reduce((n, c) => n + c.cards.length, 0));
  let toolbarShippedCards = $derived.by(() => {
    let n = 0;
    for (const c of columns) {
      if (/\bshipped\b/i.test(c.title)) n += c.cards.length;
    }
    return n;
  });
  let toolbarUnsolved = $derived(localComments.filter((c) => c.resolved === 0).length);

  /** All markdown columns; View “3/4/5 columns” sets target column width for the scroll viewport. */
  let boardColumns = $derived(columns);
  let gridColCount = $derived(Math.max(1, boardColumns.length));
  const boardLayoutViewportPx = 1320 - 48 * 2;
  let boardGapPx = $derived(density === 'compact' ? 12 : 16);

  /** Live scrollport width (avoids off-by-one vs fixed 1224 + scrollbar). */
  let boardScrollClientW = $state(0);

  /** Integer column min so `vc` columns + gaps exactly fill `usable` (no fractional “next column” peek). */
  function packedColMinPx(usable: number, vc: 3 | 4 | 5, g: number): number {
    if (usable <= 320) return 260;
    const n = vc;
    const space = usable - (n - 1) * g;
    if (space <= 0) return 260;
    let c = Math.max(260, Math.floor(space / n));
    while (c * n + (n - 1) * g < usable) c += 1;
    return c;
  }

  let usableBoardPx = $derived(
    boardScrollClientW > 320 ? boardScrollClientW : boardLayoutViewportPx
  );
  let colMinPx = $derived(packedColMinPx(usableBoardPx, visibleColCount, boardGapPx));
  let boardMinWidthPx = $derived(
    gridColCount * colMinPx + Math.max(0, gridColCount - 1) * boardGapPx
  );

  let boardWrapEl = $state<HTMLElement | undefined>(undefined);
  let canScrollBoardLeft = $state(false);
  let boardLeftEdgePeek = $state(false);

  function syncBoardScrollArrows() {
    if (!browser) return;
    const el = boardWrapEl;
    if (!el) {
      canScrollBoardLeft = false;
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 2) {
      canScrollBoardLeft = false;
      return;
    }
    canScrollBoardLeft = el.scrollLeft > 2;
  }

  function onBoardOuterPointerMove(e: MouseEvent) {
    const el = boardWrapEl;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const insideY = e.clientY >= r.top && e.clientY <= r.bottom;
    if (!insideY) {
      boardLeftEdgePeek = false;
      return;
    }
    const fromLeft = e.clientX - r.left;
    boardLeftEdgePeek = fromLeft >= 0 && fromLeft < 72;
  }

  function clearBoardEdgePeek() {
    boardLeftEdgePeek = false;
  }

  function scrollBoardStep(dir: -1 | 1) {
    const el = boardWrapEl;
    if (!el) return;
    const step = Math.max(160, Math.floor(el.clientWidth * 0.65));
    const maxScroll = el.scrollWidth - el.clientWidth;
    const next = Math.min(maxScroll, Math.max(0, el.scrollLeft + dir * step));
    el.scrollTo({ left: next, behavior: 'smooth' });
  }

  $effect(() => {
    if (!browser) return;
    void columns.length;
    void gridColCount;
    void boardMinWidthPx;
    void colMinPx;
    void density;
    void boardWrapEl;
    tick().then(() => syncBoardScrollArrows());
  });

  $effect(() => {
    if (!browser || !boardWrapEl) return;
    const el = boardWrapEl;
    const ro = new ResizeObserver(() => {
      boardScrollClientW = el.clientWidth;
      syncBoardScrollArrows();
    });
    ro.observe(el);
    boardScrollClientW = el.clientWidth;
    syncBoardScrollArrows();
    return () => ro.disconnect();
  });

  function orderedCards(cards: KanbanCard[]): KanbanCard[] {
    const list = [...cards];
    if (sortMode === 'label') {
      list.sort((a, b) => (a.labels[0] ?? '').localeCompare(b.labels[0] ?? ''));
    } else if (sortMode === 'due') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }

  /** Reader_Kanban `.col-title`: first word roman, rest italic (e.g. `Up <em>next</em>`). */
  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Strip `0 · ` / `1 — ` style column index from display (markdown `##` title). */
  function stripLeadingColumnIndex(t: string): string {
    const s = t.trim();
    const w = s.replace(/^\d+\s*(?:\u00B7|[-\u2013\u2014])\s*/, '').trim();
    return w || s;
  }

  /** Reader_Kanban shipped column — cards use `.card.done` (same word boundary as toolbar shipped count). */
  function columnIsShipped(columnTitle: string): boolean {
    return /\bshipped\b/i.test(columnTitle);
  }

  function columnTitleHtml(title: string): string {
    const raw = title.trim();
    if (!raw) return '';
    const base = stripLeadingColumnIndex(raw);
    if (!base) return '';
    // Author-controlled inline markup (e.g. `Up *next*`)
    if (/[*_`]|\[[^\]]+\]\([^)]+\)/.test(base)) {
      const out = marked.parseInline(base);
      return typeof out === 'string' ? out : '';
    }
    const i = base.indexOf(' ');
    if (i > 0 && i < base.length - 1) {
      return `${escapeHtml(base.slice(0, i))} <em>${escapeHtml(base.slice(i + 1))}</em>`;
    }
    return escapeHtml(base);
  }

  function cardDimmed(card: KanbanCard): boolean {
    if (filterKey === 'all') return false;
    return !card.labels.some((l) => l.toLowerCase() === filterKey.toLowerCase());
  }

  function cardComments(cardId: string) {
    return localComments.filter((c) => {
      if (!c.anchor) return false;
      try {
        const a = typeof c.anchor === 'string' ? JSON.parse(c.anchor) : c.anchor;
        return a.block_id === cardId;
      } catch {
        return false;
      }
    });
  }

  /** Doc / Reader: thread has comments and every one is resolved (`resolved !== 0`). */
  function cardCommentsAllResolved(cardId: string): boolean {
    const thread = cardComments(cardId);
    return thread.length > 0 && thread.every((c) => c.resolved !== 0);
  }

  /** Oldest first — same ordering as doc thread / API chrono. */
  function cardCommentsChrono(cardId: string): Comment[] {
    return [...cardComments(cardId)].sort((a, b) => {
      const t = a.created.localeCompare(b.created);
      if (t !== 0) return t;
      return a.id.localeCompare(b.id);
    });
  }

  /** Resolved row gets a pill when a later comment reopened the thread (unresolved below). */
  function commentShowResolvedReopenPill(thread: Comment[], index: number): boolean {
    const c = thread[index];
    if (!c || c.resolved === 0) return false;
    for (let j = index + 1; j < thread.length; j++) {
      if (thread[j]!.resolved === 0) return true;
    }
    return false;
  }

  function commentCountForCard(cardId: string): number {
    return cardComments(cardId).length;
  }

  function formatCommentRelative(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
    if (sec < 45) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day === 1) return 'yesterday';
    if (day < 7) return `${day}d ago`;
    const wk = Math.floor(day / 7);
    if (wk < 5) return `${wk}w ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /** Reader_Kanban.html `.act-av` — initial matches prototype (Z, M, C). */
  function commentAvatarLetter(displayName: string | null): string {
    const raw = (displayName ?? 'A').trim() || 'A';
    const ch = raw.match(/[a-zA-Z0-9\u4e00-\u9fff]/)?.[0] ?? raw[0] ?? 'A';
    return /[a-z]/.test(ch) ? ch.toUpperCase() : ch;
  }

  function commentHandle(displayName: string | null): string {
    let n = (displayName ?? 'anonymous').trim();
    if (!n) n = 'anonymous';
    if (n.startsWith('@')) return n;
    return `@${n.replace(/\s+/g, '').toLowerCase()}`;
  }

  function isAgentComment(c: Comment): boolean {
    if (c.agent_published === 1) return true;
    const n = (c.display_name ?? '').trim().toLowerCase();
    return n === 'agent' || n === 'vibe agent';
  }

  /** Reader `.act-updated` — from latest anchored comment on this card. */
  function cardCommentLatestRelative(cardId: string): string | null {
    const cs = cardComments(cardId);
    if (cs.length === 0) return null;
    let latest = cs[0]!.created;
    for (const c of cs) {
      if (c.created > latest) latest = c.created;
    }
    return formatCommentRelative(latest) || null;
  }

  let commentBody = $state('');
  let commentPosting = $state(false);
  let commentError = $state('');

  async function postComment() {
    if (!expandedCard || !commentBody.trim()) return;
    commentPosting = true;
    commentError = '';
    try {
      const res = await fetch(`/api/comment/${pageId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: commentBody.trim(),
          anchor: {
            type: 'block',
            block_type: 'card',
            block_id: expandedCard.id,
          },
          anchor_hint: expandedCard.title.slice(0, 80),
        }),
      });
      if (!res.ok) {
        commentError = 'Failed to post comment.';
      } else {
        const newComment = (await res.json()) as Comment;
        localComments = [...localComments, newComment];
        commentBody = '';
      }
    } catch {
      commentError = 'Network error.';
    }
    commentPosting = false;
  }

  // ─── Checklist toggle ─────────────────────────────────────────
  let checklistSaving = $state(false);

  async function toggleChecklist(checkboxIndex: number) {
    if (!expandedCard || checklistSaving) return;
    checklistSaving = true;
    try {
      const body = expandedCard.body;
      let count = 0;
      // Match GFM task items: `- [ ]`, `- [x]`, `- [X]`
      const newBody = body.replace(/^(\s*- \[)([xX ])(\])/gm, (match, pre, state, post) => {
        if (count === checkboxIndex) {
          count++;
          const unchecked = state === ' ';
          return `${pre}${unchecked ? 'x' : ' '}${post}`;
        }
        count++;
        return match;
      });

      if (newBody === body) {
        return;
      }

      const fm = getFrontmatter();
      const newColumns = columns.map((col) => ({
        ...col,
        cards: col.cards.map((c) => (c.id === expandedCard!.id ? { ...c, body: newBody } : c)),
      }));
      const newMarkdown = serializeKanban(fm, newColumns, labels);

      // Optimistic local update — no full reload needed
      expandedCard = { ...expandedCard, body: newBody };
      columns = newColumns;

      await putMarkdown(newMarkdown);
    } finally {
      checklistSaving = false;
    }
  }

  /**
   * Svelte action: attach click handlers to checkbox inputs in rendered markdown.
   * Re-attaches whenever the node updates (e.g. after toggle re-renders).
   */
  function checklistAction(node: HTMLElement) {
    function attachHandlers() {
      const inputs = node.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
      inputs.forEach((input, idx) => {
        if (!isOwner) {
          input.setAttribute('disabled', '');
          input.style.cursor = 'default';
          return;
        }
        input.removeAttribute('disabled');
        input.style.cursor = 'pointer';
        input.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleChecklist(idx);
        };
      });
    }
    attachHandlers();
    return {
      update() {
        attachHandlers();
      },
      destroy() {},
    };
  }

  /** Trackpad: horizontal pan scrolls the board; vertical scroll bubbles to the page / card lists. */
  function onBoardWheel(e: WheelEvent) {
    const wrap = e.currentTarget as HTMLElement;
    if (!wrap || wrap.scrollWidth <= wrap.clientWidth + 1) return;

    const absX = Math.abs(e.deltaX);
    const absY = Math.abs(e.deltaY);
    const shiftHorizontal = e.shiftKey && absY > 0 && absX <= absY;
    const horizontalIntent = shiftHorizontal || absX > absY;

    if (!horizontalIntent) {
      const list = (e.target as HTMLElement | null)?.closest('.cards-list');
      if (list && list.scrollHeight > list.clientHeight + 1) return;
      return;
    }

    e.preventDefault();
    wrap.scrollLeft += shiftHorizontal ? e.deltaY : e.deltaX;
    syncBoardScrollArrows();
  }
</script>

<svelte:window onclick={onWindowClick} />

<div
  class="kanban-root"
  class:density-compact={density === 'compact'}
  class:board-fullwidth={boardFullwidth}
>
  <!-- Reader_Kanban `.board-tools` -->
  <div class="kb-board-tools">
    <div class="kb-tools-left" role="status" aria-live="polite">
      <span class="kb-stat"><b>{toolbarTotalCards}</b> cards</span>
      <span class="kb-sep">·</span>
      <span class="kb-stat"><b>{toolbarShippedCards}</b> shipped</span>
      {#if toolbarUnsolved > 0}
        <span class="kb-sep">·</span>
        <span class="kb-stat kb-unsolved">
          <span class="kb-mv-dot" aria-hidden="true"></span>
          <b>{toolbarUnsolved}</b> unsolved
        </span>
      {/if}
    </div>

    <div class="kb-tools-right">
      <div class="tb-cluster">
        <button
          type="button"
          class="tb-btn"
          class:open={openToolbarMenu === 'filter'}
          onclick={() => toggleToolbarMenu('filter')}
          aria-expanded={openToolbarMenu === 'filter'}
          aria-haspopup="true"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg
          >
          Filter{#if filterKey !== 'all'}<span class="tb-val">: <span>{filterKey}</span></span>{/if}
          <svg
            class="caret"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg
          >
        </button>
        {#if openToolbarMenu === 'filter'}
          <div class="tb-menu" role="menu">
            <div class="tb-menu-label">Show cards with label</div>
            <button
              type="button"
              class="tb-menu-item"
              class:on={filterKey === 'all'}
              onclick={() => {
                filterKey = 'all';
                closeToolbarMenus();
              }}
            >
              <span class="mi-sw" style="background: var(--text-tertiary)"></span>
              <span class="mi-label">All labels</span>
              <span class="mi-ct">{toolbarTotalCards}</span>
              <svg
                class="mi-check"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"><polyline points="20 6 9 17 4 12" /></svg
              >
            </button>
            {#if labelMenuRows.length > 0}
              <div class="tb-menu-sep"></div>
              {#each labelMenuRows as [labelKey, ct] (labelKey)}
                <button
                  type="button"
                  class="tb-menu-item"
                  class:on={filterKey === labelKey}
                  onclick={() => {
                    filterKey = labelKey;
                    closeToolbarMenus();
                  }}
                >
                  <span class="mi-sw" style="background: {labelSwatch(labelKey)};"></span>
                  <span class="mi-label">{labelKey}</span>
                  <span class="mi-ct">{ct}</span>
                  <svg
                    class="mi-check"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"><polyline points="20 6 9 17 4 12" /></svg
                  >
                </button>
              {/each}
            {/if}
          </div>
        {/if}
      </div>

      <div class="tb-cluster">
        <button
          type="button"
          class="tb-btn"
          class:open={openToolbarMenu === 'sort'}
          onclick={() => toggleToolbarMenu('sort')}
          aria-expanded={openToolbarMenu === 'sort'}
          aria-haspopup="true"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"><path d="M3 6h18M6 12h12M10 18h4" /></svg
          >
          Sort
          <svg
            class="caret"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg
          >
        </button>
        {#if openToolbarMenu === 'sort'}
          <div class="tb-menu" role="menu">
            <div class="tb-menu-label">Ranking</div>
            <button
              type="button"
              class="tb-menu-item"
              class:on={sortMode === 'column'}
              onclick={() => {
                sortMode = 'column';
                closeToolbarMenus();
              }}
            >
              <span class="mi-label">Column order</span>
              <svg
                class="mi-check"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"><polyline points="20 6 9 17 4 12" /></svg
              >
            </button>
            <button
              type="button"
              class="tb-menu-item"
              class:on={sortMode === 'label'}
              onclick={() => {
                sortMode = 'label';
                closeToolbarMenus();
              }}
            >
              <span class="mi-label">By label</span>
              <svg
                class="mi-check"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"><polyline points="20 6 9 17 4 12" /></svg
              >
            </button>
            <button
              type="button"
              class="tb-menu-item"
              class:on={sortMode === 'due'}
              onclick={() => {
                sortMode = 'due';
                closeToolbarMenus();
              }}
            >
              <span class="mi-label">By due date</span>
              <svg
                class="mi-check"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"><polyline points="20 6 9 17 4 12" /></svg
              >
            </button>
          </div>
        {/if}
      </div>

      <div class="tb-cluster">
        <button
          type="button"
          class="tb-btn"
          class:open={openToolbarMenu === 'view'}
          onclick={() => toggleToolbarMenu('view')}
          aria-expanded={openToolbarMenu === 'view'}
          aria-haspopup="true"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
            ><rect x="3" y="4" width="18" height="16" rx="2" /><line
              x1="9"
              y1="4"
              x2="9"
              y2="20"
            /><line x1="15" y1="4" x2="15" y2="20" /></svg
          >
          View
          <svg
            class="caret"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg
          >
        </button>
        {#if openToolbarMenu === 'view'}
          <div class="tb-menu" role="menu">
            <div class="tb-menu-label">Density</div>
            <button
              type="button"
              class="tb-menu-item"
              class:on={density === 'comfortable'}
              onclick={() => {
                density = 'comfortable';
                closeToolbarMenus();
              }}
            >
              <span class="mi-label">Comfortable</span>
              <svg
                class="mi-check"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"><polyline points="20 6 9 17 4 12" /></svg
              >
            </button>
            <button
              type="button"
              class="tb-menu-item"
              class:on={density === 'compact'}
              onclick={() => {
                density = 'compact';
                closeToolbarMenus();
              }}
            >
              <span class="mi-label">Compact</span>
              <svg
                class="mi-check"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"><polyline points="20 6 9 17 4 12" /></svg
              >
            </button>
            <div class="tb-menu-sep"></div>
            <div class="tb-menu-label">Columns</div>
            {#each [5, 4, 3] as n (n)}
              <button
                type="button"
                class="tb-menu-item"
                class:on={visibleColCount === n}
                onclick={() => {
                  visibleColCount = n as 3 | 4 | 5;
                  closeToolbarMenus();
                }}
              >
                <span class="mi-label">{n} columns{n === 5 ? ' (default)' : ''}</span>
                <svg
                  class="mi-check"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"><polyline points="20 6 9 17 4 12" /></svg
                >
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <button
        type="button"
        class="tb-icon-btn"
        class:active={boardFullwidth}
        title="Toggle full-width board"
        aria-label="Toggle full-width board"
        aria-pressed={boardFullwidth}
        onclick={(e) => {
          e.stopPropagation();
          kanbanReaderBoardFullwidth.update((v) => !v);
        }}
      >
        {#if boardFullwidth}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
            ><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line
              x1="14"
              y1="10"
              x2="21"
              y2="3"
            /><line x1="3" y1="21" x2="10" y2="14" /></svg
          >
        {:else}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
            ><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line
              x1="21"
              y1="3"
              x2="14"
              y2="10"
            /><line x1="3" y1="21" x2="10" y2="14" /></svg
          >
        {/if}
      </button>
    </div>
  </div>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="board-outer"
    role="presentation"
    onmousemove={onBoardOuterPointerMove}
    onmouseleave={clearBoardEdgePeek}
  >
    {#if canScrollBoardLeft}
      <button
        type="button"
        class="kb-board-scroll kb-board-scroll--prev"
        class:kb-board-scroll--peek={boardLeftEdgePeek}
        onclick={() => scrollBoardStep(-1)}
        aria-label="Show previous columns"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg
        >
      </button>
    {/if}
    <div
      class="board-wrap"
      bind:this={boardWrapEl}
      onscroll={syncBoardScrollArrows}
      onwheel={onBoardWheel}
    >
      <div
        class="kanban-board"
        style="width: {boardMinWidthPx}px; min-width: {boardMinWidthPx}px; grid-template-columns: repeat({gridColCount}, {colMinPx}px);"
      >
        {#each boardColumns as column}
          {@const vis = orderedCards(column.cards)}
          <div
            class="kanban-column"
            class:drop-target={dragOverColumn === column.title}
            ondragover={(e) => onDragOverColumn(e, column.title)}
            ondragleave={(e) => onDragLeave(e, column.title)}
            ondrop={(e) => onDrop(e, column.title)}
          >
            <div class="column-header">
              <h2 class="column-title">{@html columnTitleHtml(column.title)}</h2>
              <span class="column-count">{column.cards.length}</span>
            </div>
            <div class="column-stack">
              <!-- dragover + slot; only one draggable=true during drag avoids Chrome ignoring drops over other cards -->
              <div
                class="cards-list"
                role="list"
                ondragover={isOwner ? (e) => onDragOverCardsList(e, column.title) : undefined}
              >
                {#each vis as card, i (card.id)}
                  {#if isOwner && sortMode === 'column' && dragCardId && dragOverColumn === column.title && dragInsertSlot === i && !kanbanDragSlotIsNoOp(column.title, vis)}
                    <div class="kb-drag-slot-placeholder" aria-hidden="true"></div>
                  {/if}
                  <div
                    class="card-drag-wrapper"
                    class:dragging={dragCardId === card.id}
                    class:kb-card-dim={cardDimmed(card)}
                    draggable={isOwner && (dragCardId === null || dragCardId === card.id)
                      ? 'true'
                      : 'false'}
                    ondragstart={isOwner ? (e) => onDragStart(e, card, column.title) : undefined}
                    ondragend={isOwner ? onDragEnd : undefined}
                    role="listitem"
                  >
                    <KanbanCardComponent
                      id={card.id}
                      title={card.title}
                      labels={card.labels}
                      labelColors={labels}
                      body={card.body}
                      bodyPreview={bodyPreview(card.body)}
                      commentCount={commentCountForCard(card.id)}
                      commentLatestRelative={cardCommentLatestRelative(card.id)}
                      compact={density === 'compact'}
                      shippedColumn={columnIsShipped(column.title)}
                      onexpand={() => expandCard(card, column.title)}
                    />
                  </div>
                {/each}
                {#if isOwner && sortMode === 'column' && dragCardId && dragOverColumn === column.title && dragInsertSlot === vis.length && !kanbanDragSlotIsNoOp(column.title, vis)}
                  <div class="kb-drag-slot-placeholder" aria-hidden="true"></div>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<!-- Reader_Kanban card drawer -->
{#if expandedCard}
  <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
  <div
    class="card-drawer"
    role="dialog"
    aria-modal="true"
    aria-labelledby="dr-card-title"
    tabindex="-1"
    transition:fly={{ x: 480, duration: 260, easing: quintOut }}
  >
    <div class="dr-head">
      <div class="dr-head-l">
        <div class="dr-kicker">
          <span class="dr-crumbs">
            <span class="dr-cr-col">{expandedColumnTitle}</span>
            <span class="dr-arrow" aria-hidden="true">›</span>
            <span class="dr-cr-id">#{expandedCard.id}</span>
          </span>
        </div>
        <h3
          class="dr-card-title"
          class:dr-card-title--shipped={columnIsShipped(expandedColumnTitle)}
          id="dr-card-title"
        >
          {expandedCard.title}
        </h3>
      </div>
      <button class="icon-btn" type="button" onclick={closeExpanded} aria-label="Close">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg
        >
      </button>
    </div>

    <div class="dr-body">
      {#if expandedCard.labels.length > 0}
        <div class="dr-field">
          <div class="dr-lbl">Labels</div>
          <div class="dr-labels">
            {#each expandedCard.labels as label}
              <span
                class="lbl lbl-dot"
                class:bug={label.toLowerCase() === 'bug'}
                class:feature={label.toLowerCase() === 'feature'}
                class:urgent={label.toLowerCase() === 'urgent'}
                class:design={label.toLowerCase() === 'design'}
                class:infra={label.toLowerCase() === 'infra'}
                class:docs={label.toLowerCase() === 'docs'}
                class:lbl-dot-custom={!labelIsPreset(label)}
                style:--lbl-dot={!labelIsPreset(label) ? labelSwatch(label) : undefined}
                >{label}</span
              >
            {/each}
          </div>
        </div>
      {/if}

      <div class="dr-field">
        <div class="dr-lbl">Details</div>
        {#if expandedCard.body}
          {#key expandedCard.body}
            <div class="dr-prose prose dark:prose-invert dr-body-md" use:checklistAction>
              {@html marked.parse(expandedCard.body)}
            </div>
          {/key}
        {:else}
          <p class="empty-body">No description.</p>
        {/if}
      </div>

      <div class="dr-field">
        <div class="dr-lbl">Comments</div>
        {#if cardComments(expandedCard.id).length === 0}
          <p class="card-comments-empty">No comments yet.</p>
        {:else}
          {@const drawerThread = cardCommentsChrono(expandedCard.id)}
          <div class="dr-activity">
            {#each drawerThread as c, i (c.id)}
              <article class="act-item">
                {#if isAgentComment(c)}
                  <div class="act-av agent" aria-hidden="true"></div>
                {:else}
                  <div class="act-av" aria-hidden="true">{commentAvatarLetter(c.display_name)}</div>
                {/if}
                <div class="act-body">
                  <div class="act-head">
                    <span class="act-who"
                      >{isAgentComment(c) ? 'agent' : commentHandle(c.display_name)}</span
                    >
                    <span class="act-when">{formatCommentRelative(c.created)}</span>
                    {#if commentShowResolvedReopenPill(drawerThread, i)}
                      <span class="act-resolved-pill" aria-label="Resolved">resolved</span>
                    {/if}
                  </div>
                  <div class="act-msg">{c.body}</div>
                </div>
              </article>
            {/each}
            {#if cardCommentsAllResolved(expandedCard.id)}
              <div class="dr-thread-resolved-footer" role="status">
                ✓ resolved · {cardCommentLatestRelative(expandedCard.id) ?? 'now'}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <div class="dr-compose-foot">
      {#if commentError}
        <p class="card-comment-error">{commentError}</p>
      {/if}
      <div class="cp-compose">
        <div class="cp-compose-row">
          <input
            type="text"
            class="cp-compose-input"
            placeholder="Reply, or leave a new note…"
            bind:value={commentBody}
            onkeydown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                postComment();
              }
            }}
          />
          <button
            type="button"
            class="cp-compose-send"
            onclick={postComment}
            disabled={commentPosting || !commentBody.trim()}
          >
            {commentPosting ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .kanban-root {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
  }

  .kanban-root.board-fullwidth .board-outer {
    max-width: none;
    padding-left: 32px;
    padding-right: 32px;
  }

  .kanban-root.board-fullwidth .board-wrap {
    max-width: none;
  }

  .kanban-root.board-fullwidth .kb-board-tools {
    max-width: none;
    padding-left: 32px;
    padding-right: 32px;
  }

  /* Reader_Kanban `.board-tools` */
  .kb-board-tools {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    width: 100%;
    max-width: 1320px;
    margin: 0 auto;
    padding: 16px 48px 0;
    box-sizing: border-box;
    transition:
      max-width 200ms ease,
      padding 200ms ease;
  }

  @media (max-width: 900px) {
    .kb-board-tools {
      padding-left: 22px;
      padding-right: 22px;
    }
  }

  .kb-tools-left {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
    flex-wrap: wrap;
  }

  .kb-stat {
    white-space: nowrap;
  }

  .kb-stat b {
    color: var(--text-primary);
    font-weight: 600;
  }

  .kb-sep {
    opacity: 0.4;
  }

  .kb-unsolved {
    color: var(--label-urgent, #d97706);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0;
    border-radius: 6px;
  }

  .kb-unsolved b {
    color: var(--label-urgent, #d97706);
    font-weight: 600;
  }

  .kb-mv-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--label-urgent, #d97706);
    animation: kb-mv-pulse 2s ease-in-out infinite;
  }

  @keyframes kb-mv-pulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.4;
      transform: scale(1.25);
    }
  }

  .kb-tools-right {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .tb-cluster {
    position: relative;
  }

  .tb-btn {
    font-family: var(--font-sans);
    font-size: 12.5px;
    font-weight: 500;
    padding: 6px 10px;
    border-radius: 6px;
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-secondary);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    line-height: 1.2;
    transition:
      background 0.12s,
      color 0.12s,
      border-color 0.12s;
  }

  .tb-btn:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .tb-btn.open {
    background: var(--surface-hover);
    color: var(--text-primary);
    border-color: var(--border);
  }

  .tb-btn .caret {
    width: 10px;
    height: 10px;
    opacity: 0.6;
  }

  .tb-btn .tb-val {
    color: var(--text-primary);
    font-weight: 500;
  }

  .tb-icon-btn {
    background: transparent;
    border: 1px solid transparent;
    width: 30px;
    height: 30px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all 0.12s;
  }

  .tb-icon-btn:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .tb-icon-btn.active {
    color: var(--text-primary);
    background: var(--surface-hover);
  }

  .tb-icon-btn svg {
    width: 15px;
    height: 15px;
  }

  .tb-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow-elevated);
    padding: 6px;
    min-width: 220px;
    z-index: 50;
  }

  .tb-menu-label {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-tertiary);
    padding: 8px 10px 4px;
  }

  .tb-menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    border-radius: 6px;
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--text-primary);
    cursor: pointer;
    width: 100%;
    border: none;
    background: transparent;
    text-align: left;
    transition: background 0.1s;
  }

  .tb-menu-item:hover {
    background: var(--surface-hover);
  }

  .tb-menu-item .mi-sw {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .tb-menu-item .mi-label {
    flex: 1;
  }

  .tb-menu-item .mi-ct {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }

  .tb-menu-item .mi-check {
    width: 14px;
    height: 14px;
    opacity: 0;
    color: var(--text-primary);
    flex-shrink: 0;
  }

  .tb-menu-item.on .mi-check {
    opacity: 1;
  }

  .tb-menu-sep {
    height: 1px;
    background: var(--border);
    margin: 6px 4px;
  }

  .card-drag-wrapper.kb-card-dim {
    opacity: 0.22;
    transition: opacity 0.15s ease;
  }

  .density-compact .cards-list {
    gap: 8px;
  }

  .density-compact :global(.kanban-card) {
    padding: 10px 12px 10px;
    border-radius: 10px;
  }

  .density-compact :global(.card-preview) {
    display: none;
  }

  .density-compact :global(.card-foot) {
    margin-top: 8px;
  }

  /* Reader_Kanban.html — board chrome (outer: width cap + padding; inner: horizontal scroll) */
  .board-outer {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    max-width: 1320px;
    margin: 0 auto;
    box-sizing: border-box;
    padding: 20px 48px 32px;
    transition:
      max-width 200ms ease,
      padding 200ms ease;
  }

  @media (max-width: 900px) {
    .board-outer {
      padding-left: 22px;
      padding-right: 22px;
    }
  }

  .board-wrap {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    display: flex;
    flex-direction: column;
  }

  .kb-board-scroll {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 4;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: color-mix(in oklab, var(--surface) 92%, transparent);
    color: var(--text-secondary);
    box-shadow: var(--shadow-card);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    opacity: 0.14;
    transition:
      opacity 0.18s ease,
      background 0.15s ease,
      color 0.15s ease,
      transform 0.15s ease;
  }

  .kb-board-scroll:hover,
  .kb-board-scroll:focus-visible {
    opacity: 1;
    color: var(--text-primary);
    background: var(--surface);
    outline: none;
  }

  .kb-board-scroll--peek {
    opacity: 1;
  }

  @media (hover: none) {
    .kb-board-scroll {
      opacity: 0.72;
    }
  }

  .kb-board-scroll svg {
    width: 18px;
    height: 18px;
  }

  .kb-board-scroll--prev {
    left: 10px;
  }

  @media (min-width: 901px) {
    .kb-board-scroll--prev {
      left: 18px;
    }
  }

  .kanban-board {
    display: grid;
    gap: 16px;
    flex: 1 1 auto;
    min-height: min(560px, calc(100vh - 220px));
    align-items: stretch;
    align-self: flex-start;
    box-sizing: border-box;
  }

  .density-compact .kanban-board {
    gap: 12px;
  }

  .kanban-column {
    background: transparent;
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    min-width: 0;
  }

  /* Reader_Kanban `.col-head` / `.col-title` / `.col-count` — typography only */
  .column-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 2px 12px;
    background: var(--bg);
    margin-bottom: 14px;
    border-bottom: 1px solid var(--text-primary);
    flex: 0 0 auto;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  .column-title {
    font-family: var(--font-serif), Georgia, 'Times New Roman', serif;
    font-size: 18px;
    font-weight: 400;
    font-style: normal;
    letter-spacing: -0.01em;
    line-height: 1.15;
    color: var(--text-primary);
    margin: 0;
  }

  .column-title :global(em) {
    font-family: inherit;
    font-style: italic;
    font-weight: 400;
  }

  .column-count {
    font-family: var(--font-mono), ui-monospace, SFMono-Regular, monospace;
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0.02em;
    color: var(--text-tertiary);
    margin-left: auto;
    font-variant-numeric: tabular-nums;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .column-stack {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .cards-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 0 2px 24px;
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }

  .cards-list::-webkit-scrollbar {
    width: 8px;
  }

  .cards-list::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 4px;
  }

  .cards-list::-webkit-scrollbar-thumb:hover {
    background: var(--text-tertiary);
  }

  .cards-list::-webkit-scrollbar-track {
    background: transparent;
  }

  /* Same look as former `.kanban-column.drop-target .cards-list::before` drop slot */
  .kb-drag-slot-placeholder {
    flex-shrink: 0;
    width: 100%;
    height: 56px;
    box-sizing: border-box;
    border-radius: 10px;
    border: 1.5px dashed var(--text-primary);
    background: color-mix(in oklab, var(--text-primary) 4%, transparent);
    pointer-events: none;
    animation: kb-drop-hint 0.2s ease-out;
  }

  @keyframes kb-drop-hint {
    from {
      opacity: 0;
      transform: scaleY(0.5);
    }
    to {
      opacity: 1;
      transform: scaleY(1);
    }
  }

  /* Drag wrapper — cursor set via draggable attribute */
  .card-drag-wrapper[draggable='true'] {
    cursor: grab;
  }

  .card-drag-wrapper[draggable='true']:active {
    cursor: grabbing;
  }

  .card-drag-wrapper[draggable='false'] {
    cursor: default;
  }

  .card-drag-wrapper.dragging {
    opacity: 0.35;
  }

  /* Hover translate on inner card fights the drag ghost */
  .card-drag-wrapper.dragging :global(.kanban-card) {
    transform: none;
    box-shadow: var(--shadow-card);
    transition:
      opacity 0.15s ease,
      box-shadow 0.15s ease,
      border-color 0.15s ease;
  }

  /* Reader_Kanban `.card-drawer` — no dimming scrim (matches design) */
  .card-drawer {
    position: fixed;
    top: 56px;
    right: 0;
    bottom: 0;
    width: 440px;
    max-width: 100vw;
    background: var(--bg);
    border-left: 1px solid var(--border);
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.04);
    z-index: 42;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }

  .dr-head {
    padding: 18px 24px 14px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-shrink: 0;
  }

  .dr-head-l {
    min-width: 0;
    flex: 1;
  }

  .dr-kicker {
    margin: 0 0 6px;
  }

  .dr-crumbs {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .dr-crumbs .dr-arrow {
    margin: 0 4px;
    opacity: 0.5;
  }

  .dr-cr-id {
    color: var(--text-secondary);
  }

  .dr-card-title {
    font-family: var(--font-serif);
    font-size: 22px;
    font-weight: 400;
    letter-spacing: -0.015em;
    line-height: 1.25;
    margin: 0;
    color: var(--text-primary);
    text-wrap: pretty;
  }

  /* Reader_Kanban.html `.card.done .card-title` — shipped column in drawer */
  .dr-card-title.dr-card-title--shipped {
    text-decoration: line-through;
    color: var(--text-tertiary);
  }

  .dr-card-title :global(em) {
    font-style: italic;
  }

  .icon-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    flex-shrink: 0;
  }

  .icon-btn:hover {
    background: color-mix(in srgb, var(--text-primary) 5%, transparent);
    color: var(--text-primary);
  }

  .icon-btn svg {
    width: 14px;
    height: 14px;
  }

  .dr-body {
    flex: 1;
    overflow-y: auto;
    padding: 18px 24px 24px;
    min-height: 0;
  }

  /* Pinned comment composer (matches doc rail: stays at drawer bottom while list scrolls) */
  .dr-compose-foot {
    flex-shrink: 0;
    border-top: 1px solid var(--border);
    padding: 12px 24px max(16px, env(safe-area-inset-bottom, 0px));
    background: var(--bg);
  }

  .dr-compose-foot .cp-compose {
    border-top: none;
    margin-top: 0;
    padding: 0;
    background: transparent;
  }

  .dr-field {
    margin-bottom: 18px;
  }

  .dr-field:last-child {
    margin-bottom: 0;
  }

  .dr-lbl {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-tertiary);
    margin-bottom: 6px;
  }

  .dr-labels {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px 8px;
  }

  /* Drawer labels — same dot row treatment as KanbanCard (Reader_Kanban `.card` labels). */
  .dr-labels .lbl.lbl-dot {
    font-family: var(--font-sans);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.01em;
    line-height: 1.35;
    padding: 0;
    border-radius: 0;
    background: transparent;
    color: var(--text-tertiary);
    display: inline-flex;
    align-items: center;
  }

  .dr-labels .lbl.lbl-dot::before {
    content: '';
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    margin-right: 4px;
    flex-shrink: 0;
    background: currentColor;
  }

  .dr-labels .lbl.lbl-dot.feature::before {
    background: var(--label-feature);
  }
  .dr-labels .lbl.lbl-dot.bug::before {
    background: var(--label-bug);
  }
  .dr-labels .lbl.lbl-dot.urgent::before {
    background: var(--label-urgent);
  }
  .dr-labels .lbl.lbl-dot.design::before {
    background: var(--label-design);
  }
  .dr-labels .lbl.lbl-dot.infra::before {
    background: #0f766e;
  }
  .dr-labels .lbl.lbl-dot.docs::before {
    background: #6b7280;
  }

  .dr-labels .lbl.lbl-dot.lbl-dot-custom::before {
    background: var(--lbl-dot, var(--text-tertiary));
  }

  .dr-prose {
    font-family: var(--font-prose);
    font-size: 15px;
    line-height: 1.65;
    color: var(--text-primary);
  }

  .dr-prose :global(p) {
    margin: 0 0 12px;
  }

  .dr-prose :global(code) {
    font-family: var(--font-mono);
    font-size: 0.88em;
    background: rgba(0, 0, 0, 0.05);
    padding: 1px 5px;
    border-radius: 4px;
  }

  :global(.dark) .dr-prose :global(code) {
    background: rgba(255, 255, 255, 0.08);
  }

  /* Markdown in drawer (with Tailwind `prose` on same node) */
  .dr-body-md :global(h1),
  .dr-body-md :global(h2),
  .dr-body-md :global(h3) {
    color: var(--text-primary);
    font-weight: 600;
    margin: 1em 0 0.4em;
  }

  .dr-body-md :global(p) {
    margin: 0.6em 0;
  }

  .dr-body-md :global(ul),
  .dr-body-md :global(ol) {
    padding-left: 1.4em;
    margin: 0.6em 0;
  }

  .dr-body-md :global(code) {
    background: var(--surface-hover);
    padding: 1px 5px;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 0.9em;
  }

  .dr-body-md :global(pre) {
    background: var(--surface-hover);
    padding: 12px 16px;
    border-radius: var(--radius-md);
    overflow-x: auto;
  }

  .dr-body-md :global(pre code) {
    background: none;
    padding: 0;
  }

  .dr-body-md :global(blockquote) {
    border-left: 3px solid var(--border);
    padding-left: 12px;
    color: var(--text-tertiary);
    margin: 0.6em 0;
  }

  .dr-body-md :global(a) {
    color: var(--accent);
    text-decoration: underline;
  }

  @media (max-width: 900px) {
    .card-drawer {
      width: 100%;
    }
  }

  .empty-body {
    color: var(--text-tertiary);
    font-style: italic;
  }

  /* Reader_Kanban.html — card drawer `.dr-activity` / `.act-item` (comments list only) */
  .dr-activity {
    margin-top: 6px;
  }

  .act-item {
    display: flex;
    gap: 10px;
    padding: 10px 0;
    border-top: 1px solid var(--border);
    font-family: var(--font-sans);
    font-size: 12.5px;
    line-height: 1.5;
    margin: 0;
  }

  .act-item:first-child {
    border-top: none;
  }

  .act-av {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--text-primary);
    color: var(--bg);
    font-size: 10px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .act-av.agent {
    background: var(--accent, #c96442);
  }

  .act-av.agent::before {
    content: '✦';
    font-size: 10px;
  }

  .act-body {
    flex: 1;
    min-width: 0;
  }

  .act-head {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 8px;
    margin-bottom: 2px;
  }

  .act-resolved-pill {
    margin-left: auto;
    font-family: var(--font-sans);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #8e8e8e;
    background: #f2f2f2;
    border: 1px solid rgba(15, 23, 42, 0.1);
    padding: 3px 8px;
    border-radius: 999px;
    line-height: 1;
    flex-shrink: 0;
  }

  :global(.dark) .act-resolved-pill {
    color: rgba(250, 250, 249, 0.5);
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .act-who {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 12px;
  }

  .act-when {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-tertiary);
  }

  .act-msg {
    color: var(--text-secondary);
    white-space: pre-wrap;
    word-break: break-word;
    text-wrap: pretty;
  }

  /* PublishedPage — `.thread-resolved-footer` under drawer comments */
  .dr-thread-resolved-footer {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    color: #15803d;
    text-align: center;
    padding: 14px 8px 4px;
    margin-top: 4px;
    line-height: 1.4;
  }

  :global(.dark) .dr-thread-resolved-footer {
    color: #86efac;
  }

  .card-comments-empty {
    font-size: 13px;
    color: var(--text-tertiary);
    font-style: italic;
    margin: 0 0 12px;
  }

  /* Bottom composer: same spacing idea as Reader_Doc `.thread-reply` (not Kanban HTML export) */
  .cp-compose {
    flex-shrink: 0;
    border-top: 1px solid var(--border);
    padding: 14px 0 0;
    margin-top: 8px;
    background: var(--bg);
  }

  .cp-compose-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cp-compose-input {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    padding: 10px 14px;
    border-radius: var(--radius-input, 12px);
    border: 1px solid var(--border);
    outline: none;
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 1.4;
    color: var(--text-primary);
    background: var(--bg);
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }

  .cp-compose-input:focus {
    border-color: var(--text-primary);
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.04);
  }

  :global(.dark) .cp-compose-input:focus {
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.06);
  }

  .cp-compose-input::placeholder {
    color: var(--text-tertiary);
    font-style: normal;
  }

  .cp-compose-send {
    flex-shrink: 0;
    padding: 8px 16px;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 500;
    border-radius: 999px;
    border: none;
    cursor: pointer;
    background: var(--text-primary);
    color: var(--bg);
    transition: filter 0.15s ease;
  }

  .cp-compose-send:hover:not(:disabled) {
    filter: brightness(0.92);
  }

  :global(.dark) .cp-compose-send:hover:not(:disabled) {
    filter: brightness(1.08);
  }

  .cp-compose-send:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .card-comment-error {
    font-size: 12px;
    color: var(--error);
    margin: 0 0 8px;
  }
</style>
