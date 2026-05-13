<script lang="ts">
  import { tick } from 'svelte';
  import { page as pageStore } from '$app/stores';
  import { afterNavigate } from '$app/navigation';
  import { browser } from '$app/environment';
  import DocView from '$lib/templates/doc/DocView.svelte';
  import KanbanView from '$lib/templates/kanban/KanbanView.svelte';
  import ChangelogView from '$lib/templates/changelog/ChangelogView.svelte';
  import TimelineView from '$lib/templates/timeline/TimelineView.svelte';
  import SlidesView from '$lib/templates/slides/SlidesView.svelte';
  import DashboardView from '$lib/templates/dashboard/DashboardView.svelte';
  import type { PublishedPageData, Comment, BlockReviseSuggestResponse } from '$lib/types';
  import { marked } from 'marked';
  import {
    cancelDeferredCommentsPanelBlockClear,
    docCommentsPanelBlockId,
    docCommentsPanelOpen,
    closeDocCommentsPanel,
    closeReaderHistoryPanel,
    readerHistoryPanelOpen,
  } from '$lib/stores';
  import { listDocViewBlockIdsInOrder } from '$lib/doc-view-block-ids';
  import {
    parseBlockReviseCommentBody,
    serializeBlockReviseCommentBody,
  } from '$lib/block-revise-comment-payload';

  interface Props {
    data: PublishedPageData;
  }
  let { data }: Props = $props();

  let { page, canonicalPath, html, seoHtml, blocks, comments, frontmatter, isOwner, canClaim } =
    $derived(data);

  type VersionRow = {
    version: number;
    title: string | null;
    created: string;
    lines: number;
    lines_added: number;
    lines_removed: number;
    author_username: string | null;
  };
  let readerVersions = $state<VersionRow[]>([]);
  let readerHistoryLoading = $state(false);
  let readerHistoryError = $state('');
  /** null = live page (SSR html); otherwise viewing that snapshot in the article */
  let readerHistorySelectedVersion = $state<number | null>(null);
  let readerHistoryPreviewHtml = $state('');
  let readerHistoryPreviewTitle = $state<string | null>(null);
  let readerHistoryPreviewCreated = $state<string | null>(null);
  let readerHistoryVersionLoading = $state(false);
  let readerHistoryVersionLoadError = $state('');

  let effectiveDocHtml = $derived.by(() => {
    if (isOwner || page.view !== 'doc') return html;
    if (readerHistorySelectedVersion === null) return html;
    return readerHistoryPreviewHtml || html;
  });

  /** Reader viewing an old snapshot: comments panel lists threads but no composer. */
  let docCommentsSnapshotReadonly = $derived(!isOwner && readerHistorySelectedVersion !== null);

  let readerHistoryOpen = $state(false);
  $effect(() => readerHistoryPanelOpen.subscribe((v) => (readerHistoryOpen = v)));

  function formatHistoryDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const mon = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const day = d.getDate();
    const y = d.getFullYear();
    const t = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
    return `${mon} ${day}, ${y} · ${t}`;
  }

  async function loadReaderVersions() {
    readerHistoryLoading = true;
    readerHistoryError = '';
    try {
      const res = await fetch(`/api/pub/${page.id}/versions`);
      if (!res.ok) {
        readerHistoryError =
          res.status === 403
            ? 'History is only visible to the page owner.'
            : 'Could not load history.';
        readerVersions = [];
      } else {
        readerVersions = (await res.json()) as VersionRow[];
      }
    } catch {
      readerHistoryError = 'Could not load history.';
      readerVersions = [];
    } finally {
      readerHistoryLoading = false;
    }
  }

  async function selectReaderHistoryVersion(row: VersionRow, i: number) {
    readerHistoryVersionLoadError = '';
    if (i === 0) {
      readerHistorySelectedVersion = null;
      readerHistoryPreviewHtml = '';
      readerHistoryPreviewTitle = null;
      readerHistoryPreviewCreated = null;
      readerHistoryVersionLoading = false;
      return;
    }
    readerHistoryVersionLoading = true;
    readerHistorySelectedVersion = row.version;
    readerHistoryPreviewHtml = '';
    readerHistoryPreviewTitle = null;
    readerHistoryPreviewCreated = null;
    try {
      const res = await fetch(`/api/pub/${page.id}/versions/${row.version}`);
      if (!res.ok) {
        readerHistoryVersionLoadError =
          res.status === 404 ? 'Snapshot not found.' : 'Could not load this snapshot.';
        readerHistorySelectedVersion = null;
        return;
      }
      const v = (await res.json()) as { markdown: string; title: string | null; created: string };
      const parsed = marked.parse(v.markdown);
      readerHistoryPreviewHtml = typeof parsed === 'string' ? parsed : await parsed;
      readerHistoryPreviewTitle = v.title ?? null;
      readerHistoryPreviewCreated = v.created ?? null;
    } catch {
      readerHistoryVersionLoadError = 'Could not load this snapshot.';
      readerHistorySelectedVersion = null;
      readerHistoryPreviewHtml = '';
    } finally {
      readerHistoryVersionLoading = false;
    }
  }

  $effect(() => {
    if (!browser || !readerHistoryOpen || isOwner) return;
    void page.id;
    void loadReaderVersions();
  });

  /** New published page — drop history list + in-article snapshot (closing the rail alone keeps the snapshot). */
  $effect(() => {
    void page.id;
    readerHistorySelectedVersion = null;
    readerHistoryPreviewHtml = '';
    readerHistoryPreviewTitle = null;
    readerHistoryPreviewCreated = null;
    readerHistoryVersionLoading = false;
    readerHistoryVersionLoadError = '';
    readerVersions = [];
  });

  // Edit state
  let editing = $state(false);
  let editMarkdown = $state('');
  let saving = $state(false);
  let saveError = $state('');

  let claiming = $state(false);

  async function claimPage() {
    claiming = true;
    try {
      const res = await fetch(`/api/pub/${page.id}/claim`, { method: 'POST' });
      if (res.ok) window.location.reload();
    } catch {}
    claiming = false;
  }

  function startEdit() {
    editMarkdown = page.markdown;
    editing = true;
  }

  async function saveEdit() {
    saving = true;
    saveError = '';
    try {
      const res = await fetch(`/api/pub/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: editMarkdown }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const detail = await res.text().catch(() => '');
        saveError = `Failed to save (${res.status})${detail ? ': ' + detail : ''}`;
      }
    } catch {
      saveError = 'Network error — check your connection';
    }
    saving = false;
  }

  function cancelEdit() {
    editing = false;
    editMarkdown = '';
  }

  function stripHtml(s: string): string {
    return s
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Extract TOC from HTML headings (for doc sidebar)
  interface TocItem {
    id: string;
    text: string;
    level: number;
  }

  /** Same slug rules as server markdown pipeline / marked output where ids are absent */
  function slugifyHeadingText(text: string): string {
    const t = text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return t || 'section';
  }

  /** Stable unique ids in document order — must match `addHeadingIds` on the live DOM */
  function finalizeOutlineHeadings(items: TocItem[]): TocItem[] {
    const used = new Set<string>();
    return items.map((item) => {
      const base = item.id?.trim() ? item.id.trim() : slugifyHeadingText(item.text);
      let candidate = base || 'section';
      let n = 2;
      while (used.has(candidate)) {
        candidate = `${base}-${n}`;
        n++;
      }
      used.add(candidate);
      return { level: item.level, text: item.text, id: candidate };
    });
  }

  let toc = $derived.by((): TocItem[] => {
    if (
      page.view === 'kanban' ||
      page.view === 'changelog' ||
      page.view === 'timeline' ||
      page.view === 'slides' ||
      page.view === 'dashboard' ||
      !effectiveDocHtml
    )
      return [];
    const items: TocItem[] = [];
    const regex = /<h([2-3])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h[2-3]>/gi;
    let match;
    while ((match = regex.exec(effectiveDocHtml)) !== null) {
      items.push({
        level: parseInt(match[1]),
        id: match[2],
        text: match[3].replace(/<[^>]*>/g, ''),
      });
    }
    return finalizeOutlineHeadings(items);
  });

  // If no IDs in headings, generate from text
  let tocFromText = $derived.by((): TocItem[] => {
    if (
      toc.length > 0 ||
      page.view === 'kanban' ||
      page.view === 'changelog' ||
      page.view === 'timeline' ||
      page.view === 'slides' ||
      page.view === 'dashboard' ||
      !effectiveDocHtml
    )
      return toc;
    const items: TocItem[] = [];
    const regex = /<h([2-3])[^>]*>(.*?)<\/h[2-3]>/gi;
    let match;
    while ((match = regex.exec(effectiveDocHtml)) !== null) {
      const text = match[2].replace(/<[^>]*>/g, '');
      const id = slugifyHeadingText(text);
      items.push({ level: parseInt(match[1]), id, text });
    }
    return finalizeOutlineHeadings(items);
  });

  let activeTocId = $state('');

  // Outline: Reader — fixed left rail when ≥1280px; below that, overlay via toggle only.
  let showToc = $state(false);

  $effect(() => {
    if (!browser) return;
    tocFromText.length;
    const mq = window.matchMedia('(min-width: 1280px)');
    const apply = () => {
      if (mq.matches && tocFromText.length > 0) showToc = true;
      else if (!mq.matches) showToc = false;
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  });

  let commentsPanelOpen = $state(false);
  $effect(() => docCommentsPanelOpen.subscribe((v) => (commentsPanelOpen = v)));

  let panelBlockId = $state<string | null>(null);
  $effect(() => docCommentsPanelBlockId.subscribe((v) => (panelBlockId = v)));

  /** Local copy so posting from the panel updates DocView gutter counts without reload */
  let localComments = $state<Comment[]>([]);
  $effect(() => {
    localComments = [...(data.comments ?? [])];
  });

  let panelNewBody = $state('');
  let panelPosting = $state(false);
  let blockReviseLoading = $state(false);
  let blockReviseError = $state('');
  let blockRevisePanelKey = $state('');
  let commentBodyExpandedById = $state<Record<string, boolean>>({});

  $effect(() => {
    if (!commentsPanelOpen) panelNewBody = '';
  });

  /** Top-level doc block ids in reading order (for global comments rail sorting) */
  let docBlockIdsInOrder = $derived.by(() =>
    listDocViewBlockIdsInOrder(effectiveDocHtml ?? '', slugifyHeadingText)
  );

  function parseBlockAnchorId(c: Comment): string | null {
    if (!c.anchor) return null;
    try {
      const a = typeof c.anchor === 'string' ? JSON.parse(c.anchor) : c.anchor;
      if (a?.type === 'block' && typeof a?.block_id === 'string') return a.block_id;
    } catch {
      /* ignore */
    }
    return null;
  }

  let panelCommentsFiltered = $derived.by((): Comment[] => {
    const bid = panelBlockId;
    if (!bid) {
      // Header “all threads”: open comments only; one row per block (chronologically first on that block)
      const open = localComments.filter((c) => c.resolved === 0);
      const byTime = [...open].sort(
        (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()
      );
      const seenBlock = new Set<string>();
      const picked: Comment[] = [];
      for (const c of byTime) {
        const b = parseBlockAnchorId(c);
        if (b) {
          if (seenBlock.has(b)) continue;
          seenBlock.add(b);
        }
        picked.push(c);
      }
      const order = docBlockIdsInOrder;
      const missingRank = Number.MAX_SAFE_INTEGER;
      const blockRank = (id: string | null) => {
        if (!id || order.length === 0) return missingRank;
        const i = order.indexOf(id);
        return i >= 0 ? i : missingRank;
      };
      picked.sort((a, b) => {
        const ra = blockRank(parseBlockAnchorId(a));
        const rb = blockRank(parseBlockAnchorId(b));
        if (ra !== rb) return ra - rb;
        return new Date(b.created).getTime() - new Date(a.created).getTime();
      });
      return picked;
    }
    return localComments.filter((c) => commentAnchoredToBlock(c, bid));
  });

  /** Global panel: every comment is already resolved — nothing to list in “open” view */
  let panelGlobalAllResolved = $derived(
    !panelBlockId && localComments.length > 0 && panelCommentsFiltered.length === 0
  );

  /** Block thread: at least one comment and every one is resolved (Reader_Doc `thread-resolved`) */
  let panelBlockThreadAllResolved = $derived.by(() => {
    const bid = panelBlockId;
    if (!bid) return false;
    const thread = localComments.filter((c) => commentAnchoredToBlock(c, bid));
    return thread.length > 0 && thread.every((c) => c.resolved !== 0);
  });

  function commentAnchoredToBlock(c: Comment, blockId: string): boolean {
    return parseBlockAnchorId(c) === blockId;
  }

  /** Show “Suggestion for revise” only when this block has at least one open comment */
  let panelBlockHasOpenComment = $derived.by(() => {
    const bid = panelBlockId;
    if (!bid) return false;
    return localComments.some((c) => commentAnchoredToBlock(c, bid) && c.resolved === 0);
  });

  /** Global “open” list: jump to block in article and switch panel to that block’s thread */
  async function openThreadFromGlobalComment(comment: Comment) {
    if (panelBlockId !== null) return;
    const bid = parseBlockAnchorId(comment);
    if (!bid || !browser) return;
    cancelDeferredCommentsPanelBlockClear();
    docCommentsPanelBlockId.set(bid);
    await tick();
    const el = document.getElementById(bid);
    if (!(el instanceof HTMLElement)) return;
    // Sticky header ~56px + air; panel layout can shift after tick — measure on next frame
    const headerOffsetPx = 130;
    requestAnimationFrame(() => {
      const y = el.getBoundingClientRect().top + window.scrollY - headerOffsetPx;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    });
  }

  async function postPanelBlockComment() {
    if (docCommentsSnapshotReadonly || !panelBlockId || !panelNewBody.trim()) return;
    panelPosting = true;
    try {
      const anchor = { type: 'block', block_id: panelBlockId };
      const res = await fetch(`/api/comment/${page.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: panelNewBody.trim(),
          anchor,
          anchor_hint: panelBlockId,
        }),
      });
      if (res.ok) {
        const saved = (await res.json().catch(() => null)) as
          | (Partial<Comment> & { anchor?: unknown })
          | null;
        if (saved && typeof saved.id === 'string') {
          const anchorNorm =
            saved.anchor == null
              ? null
              : typeof saved.anchor === 'string'
                ? saved.anchor
                : JSON.stringify(saved.anchor);
          const row: Comment = {
            id: saved.id,
            page_id: saved.page_id ?? page.id,
            user_id: saved.user_id ?? null,
            display_name: saved.display_name ?? null,
            anchor: anchorNorm,
            anchor_hint: saved.anchor_hint ?? panelBlockId,
            body: saved.body ?? panelNewBody.trim(),
            resolved: typeof saved.resolved === 'number' ? saved.resolved : 0,
            agent_published: typeof saved.agent_published === 'number' ? saved.agent_published : 0,
            created: typeof saved.created === 'string' ? saved.created : new Date().toISOString(),
          };
          localComments = [...localComments, row];
        }
        panelNewBody = '';
      }
    } catch {
      /* ignore */
    }
    panelPosting = false;
  }

  $effect(() => {
    const key = commentsPanelOpen && panelBlockId ? `${panelBlockId}` : '';
    if (!commentsPanelOpen) {
      commentBodyExpandedById = {};
    }
    if (key !== blockRevisePanelKey) {
      blockReviseError = '';
      blockReviseLoading = false;
      blockRevisePanelKey = key;
    }
  });

  async function requestBlockReviseSuggestion() {
    if (
      !browser ||
      docCommentsSnapshotReadonly ||
      !panelBlockId ||
      !panelBlockHasOpenComment ||
      !isOwner ||
      page.view !== 'doc'
    )
      return;
    const el = document.getElementById(panelBlockId);
    const block_plain_text = (el?.innerText ?? '').replace(/\s+/g, ' ').trim();
    if (!block_plain_text) {
      blockReviseError = "Could not read this block's text from the page.";
      return;
    }
    const docRoot = document.querySelector('article.doc-view');
    let doc_plain_text = (docRoot instanceof HTMLElement ? docRoot.innerText : '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!doc_plain_text) doc_plain_text = block_plain_text;
    const anchorBlockId = panelBlockId;
    blockReviseLoading = true;
    blockReviseError = '';
    let newResult: BlockReviseSuggestResponse | null = null;
    try {
      const res = await fetch(`/api/pub/${page.id}/block-revise-suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          block_id: anchorBlockId,
          block_plain_text: block_plain_text.slice(0, 12_000),
          doc_plain_text: doc_plain_text.slice(0, 120_000),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
      } & Partial<BlockReviseSuggestResponse>;
      if (!res.ok) {
        blockReviseError =
          typeof data.message === 'string' && data.message
            ? data.message
            : `Request failed (${res.status})`;
        return;
      }
      newResult = {
        summary: typeof data.summary === 'string' ? data.summary : '',
        pairs: Array.isArray(data.pairs) ? data.pairs : [],
      };
      const persisted = await persistBlockReviseSuggestionComment(newResult, anchorBlockId);
      if (!persisted) {
        blockReviseError =
          'The suggestion was generated but could not be saved as a comment. Please try again.';
        console.warn(
          '[block-revise-suggest] persistBlockReviseSuggestionComment failed — Gemini result (not saved)',
          { pageId: page.id, blockId: anchorBlockId, payload: newResult }
        );
      }
    } catch {
      blockReviseError = 'Network error.';
    } finally {
      blockReviseLoading = false;
    }
  }

  afterNavigate(() => {
    closeDocCommentsPanel();
    closeReaderHistoryPanel();
  });

  $effect(() => {
    if (editing) closeDocCommentsPanel();
  });

  $effect(() => {
    if (!browser || !commentsPanelOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeDocCommentsPanel();
        closeReaderHistoryPanel();
      }
    }
    /** Close when clicking outside the panel (same gesture must finish — use click, not pointerdown). */
    function onDocClick(e: MouseEvent) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest('#comments-panel')) return;
      if (t.closest('#reader-history-panel')) return;
      if (t.closest('[aria-controls="comments-panel"]')) return;
      if (t.closest('.bcb')) return;
      closeDocCommentsPanel();
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onDocClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onDocClick);
    };
  });

  /** Reader_Doc body.thread-focused: dim prose blocks; heading blocks + active block stay full contrast */
  $effect(() => {
    if (!browser) return;
    document.body.classList.toggle('comments-panel-open', commentsPanelOpen);
    return () => document.body.classList.remove('comments-panel-open');
  });

  $effect(() => {
    if (!browser || !readerHistoryOpen || isOwner) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeReaderHistoryPanel();
    }
    function onDocClick(e: MouseEvent) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest('#reader-history-panel')) return;
      if (t.closest('.more-wrap')) return;
      closeReaderHistoryPanel();
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onDocClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onDocClick);
    };
  });

  // Compute reading time from markdown
  let readTime = $derived.by(() => {
    if (!page.markdown) return '1 min';
    const wordCount = page.markdown
      .replace(/[#*_`~\[\]()>|]/g, '')
      .split(/\s+/)
      .filter(Boolean).length;
    const mins = Math.max(1, Math.ceil(wordCount / 250));
    return `${mins} min read`;
  });

  // Format date for byline
  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const months = [
      'jan',
      'feb',
      'mar',
      'apr',
      'may',
      'jun',
      'jul',
      'aug',
      'sep',
      'oct',
      'nov',
      'dec',
    ];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  }

  /** Comments panel — Reader-style card (design: black avatar / @handle / ago / serif body) */
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

  function commentTimeAgo(dateStr: string): string {
    const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  function isAgentComment(c: Comment): boolean {
    if (c.agent_published === 1) return true;
    const n = (c.display_name ?? '').trim().toLowerCase();
    return n === 'agent' || n === 'vibe agent';
  }

  const COMMENT_BODY_COLLAPSE_CHARS = 400;
  const COMMENT_BODY_COLLAPSE_NEWLINES = 8;

  function shouldCollapseCommentBody(text: string): boolean {
    if (!text) return false;
    if (text.length > COMMENT_BODY_COLLAPSE_CHARS) return true;
    return (text.match(/\n/g)?.length ?? 0) >= COMMENT_BODY_COLLAPSE_NEWLINES;
  }

  function blockReviseShouldCollapse(r: BlockReviseSuggestResponse): boolean {
    const pairsLen = r.pairs.reduce(
      (n, p) => n + (p.remove?.length ?? 0) + (p.add?.length ?? 0),
      0
    );
    const total = (r.summary?.length ?? 0) + pairsLen;
    return total > 480 || r.pairs.length >= 2;
  }

  async function persistBlockReviseSuggestionComment(
    r: BlockReviseSuggestResponse,
    blockIdForPersist: string
  ): Promise<boolean> {
    if (!browser || !isOwner) return false;
    const bodyText = serializeBlockReviseCommentBody(r);
    if (!bodyText.trim()) return false;
    try {
      const anchor = { type: 'block', block_id: blockIdForPersist };
      const res = await fetch(`/api/comment/${page.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: bodyText,
          anchor,
          anchor_hint: blockIdForPersist,
          display_name: 'agent',
          agent_published: true,
        }),
      });
      if (!res.ok) return false;
      const saved = (await res.json().catch(() => null)) as
        | (Partial<Comment> & { anchor?: unknown })
        | null;
      if (!saved || typeof saved.id !== 'string') return false;
      const anchorNorm =
        saved.anchor == null
          ? null
          : typeof saved.anchor === 'string'
            ? saved.anchor
            : JSON.stringify(saved.anchor);
      const row: Comment = {
        id: saved.id,
        page_id: saved.page_id ?? page.id,
        user_id: saved.user_id ?? null,
        display_name: saved.display_name ?? 'agent',
        anchor: anchorNorm,
        anchor_hint: saved.anchor_hint ?? blockIdForPersist,
        body: saved.body ?? bodyText,
        resolved: typeof saved.resolved === 'number' ? saved.resolved : 0,
        agent_published: typeof saved.agent_published === 'number' ? saved.agent_published : 1,
        created: typeof saved.created === 'string' ? saved.created : new Date().toISOString(),
      };
      localComments = [...localComments, row];
      return true;
    } catch {
      return false;
    }
  }

  function toggleCommentBodyExpanded(e: MouseEvent, id: string) {
    e.stopPropagation();
    commentBodyExpandedById = {
      ...commentBodyExpandedById,
      [id]: !commentBodyExpandedById[id],
    };
  }

  function onNavCommentCardActivate(comment: Comment) {
    void openThreadFromGlobalComment(comment);
  }

  function onNavCommentCardKeydown(e: KeyboardEvent, comment: Comment) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onNavCommentCardActivate(comment);
    }
  }

  /** Block thread title in panel head (design: serif context line under THREAD · RESOLVED) */
  let panelBlockThreadTitle = $derived.by(() => {
    const bid = panelBlockId;
    if (!bid) return '';
    const b = blocks.find((bl) => bl.id === bid);
    const raw = (b?.hint ?? b?.content ?? '').replace(/\s+/g, ' ').trim();
    if (!raw) return '';
    return raw.length > 80 ? `${raw.slice(0, 77)}…` : raw;
  });

  // Extract lede (first paragraph) from html for doc view header
  let lede = $derived.by(() => {
    if (page.view !== 'doc' && page.view !== undefined) return '';
    const src = !isOwner && page.view === 'doc' ? effectiveDocHtml : html;
    if (!src) return '';
    const match = src.match(/<p[^>]*>(.*?)<\/p>/s);
    if (!match) return '';
    return match[1].replace(/<[^>]*>/g, '').trim();
  });

  let description = $derived.by(() => {
    if (page.view === 'kanban') {
      const cols = data.kanbanData?.columns ?? [];
      const taskCount = cols.reduce((n: number, c: any) => n + (c.cards?.length ?? 0), 0);
      return `Kanban board with ${cols.length} columns and ${taskCount} tasks`;
    }
    if (page.view === 'changelog') {
      const releases = data.changelogData?.releases ?? [];
      return releases.length > 0
        ? `Changelog with ${releases.length} releases (latest: ${releases[0].version})`
        : 'Product changelog';
    }
    if (page.view === 'timeline') {
      const sections = data.timelineData?.sections ?? [];
      const eventCount = sections.reduce(
        (n: number, s: any) =>
          n + s.periods.reduce((m: number, p: any) => m + (p.events?.length ?? 0), 0),
        0
      );
      return sections.length > 0
        ? `Timeline with ${sections.length} sections and ${eventCount} events`
        : 'Timeline';
    }
    if (page.view === 'slides') {
      const slides = data.slidesData?.slides ?? [];
      return slides.length > 0 ? `Slide deck with ${slides.length} slides` : 'Slide deck';
    }
    if (page.view === 'dashboard') {
      const sections = data.dashboardData?.sections ?? [];
      return sections.length > 0
        ? `Dashboard with ${sections.length} sections`
        : 'Metrics dashboard';
    }
    if (html) {
      const text = stripHtml(html);
      if (text.length > 0) return text.slice(0, 160);
    }
    return 'A page on vibe.pub';
  });

  let pageTitle = $derived(page.title ?? page.id);
  let docHeroTitle = $derived.by(() => {
    if (
      !isOwner &&
      page.view === 'doc' &&
      readerHistorySelectedVersion !== null &&
      readerHistoryPreviewTitle != null &&
      readerHistoryPreviewTitle.trim()
    ) {
      return readerHistoryPreviewTitle.trim();
    }
    return pageTitle;
  });
  let docBylineDate = $derived.by(() => {
    if (
      !isOwner &&
      page.view === 'doc' &&
      readerHistorySelectedVersion !== null &&
      readerHistoryPreviewCreated
    ) {
      return formatDate(readerHistoryPreviewCreated);
    }
    return formatDate(page.updated);
  });
  let pageUrl = $derived($pageStore.url.href);

  // Scroll spy for TOC
  function setupScrollSpy(node: HTMLElement) {
    if (!browser) return;
    const headings = node.querySelectorAll('h2[id], h3[id]');
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting && e.target.id);
        if (visible.length === 0) return;
        if (visible.length === 1) {
          activeTocId = visible[0].target.id;
          return;
        }
        // Several headings can sit in the "intersection band" at once — pick the topmost in viewport
        const best = visible.reduce((a, e) =>
          e.boundingClientRect.top < a.boundingClientRect.top ? e : a
        );
        activeTocId = best.target.id;
      },
      { rootMargin: '-80px 0px -70% 0px' }
    );

    headings.forEach((h) => observer.observe(h));
    return {
      destroy() {
        observer.disconnect();
      },
    };
  }

  // Assign heading ids in document order (must match `finalizeOutlineHeadings` on the same HTML)
  function addHeadingIds(node: HTMLElement) {
    const headings = node.querySelectorAll('h2, h3');
    const used = new Set<string>();
    headings.forEach((h) => {
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
  }

  function docActions(node: HTMLElement, initialHtml: string) {
    let current = initialHtml;
    let spyGen = 0;
    let teardown: (() => void) | undefined;

    function run() {
      if (!browser) return;
      activeTocId = '';
      teardown?.();
      teardown = undefined;
      addHeadingIds(node);
      const spy = setupScrollSpy(node);
      if (spy && typeof spy.destroy === 'function') {
        teardown = () => spy.destroy();
      }
    }

    run();

    return {
      update(nextHtml: string) {
        if (nextHtml === current) return;
        current = nextHtml;
        const my = ++spyGen;
        void tick().then(() => {
          if (my !== spyGen) return;
          run();
        });
      },
      destroy() {
        spyGen++;
        teardown?.();
      },
    };
  }
</script>

<svelte:head>
  <title>{pageTitle} — vibe.pub</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={pageTitle} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content="article" />
  <meta property="og:url" content={pageUrl} />
  <meta property="og:site_name" content="vibe.pub" />
  <meta property="og:image" content={`${$pageStore.url.origin}/og${canonicalPath}`} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={pageTitle} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={`${$pageStore.url.origin}/og${canonicalPath}`} />
  <link
    rel="alternate"
    type="text/markdown"
    href={`${$pageStore.url.origin}${canonicalPath}.md`}
    title="Markdown source"
  />
</svelte:head>

<!--
  SEO / LLM fallback: server-rendered article body, visible to any parser
  that does not execute JS (search bots, LLM fetchers, readability cleaners).
  Hidden from real browsers via @media (scripting: enabled) below — no
  duplicate content for users, but indexers see the full body.

  Skipped for view='doc' since DocView already renders the same content.
-->
{#if page.view !== 'doc'}
  <main class="seo-main" id="main-content">
    <article class="seo-body prose" itemscope itemtype="https://schema.org/Article">
      <h1 itemprop="headline">{pageTitle}</h1>
      {#if description}
        <p itemprop="description"><em>{description}</em></p>
      {/if}
      <div itemprop="articleBody">
        {@html seoHtml}
      </div>
      <hr />
      <p>
        Source markdown: <a href={`${canonicalPath}.md`}>{canonicalPath}.md</a>
      </p>
    </article>
  </main>
{/if}

<div
  class="page-wrapper theme-{page.theme ?? 'default'}"
  class:dark={['terminal', 'midnight', 'raycast', 'monokai', 'dracula'].includes(page.theme)}
>
  {#if page.view === 'kanban'}
    <!-- ═══ KANBAN LAYOUT: full width ═══ -->
    <div class="kanban-layout">
      {#if canClaim}
        <div class="kanban-toolbar">
          <button class="toolbar-btn" onclick={claimPage} disabled={claiming}
            >{claiming ? 'Claiming...' : 'Claim this page'}</button
          >
          <span class="toolbar-hint">Claim to enable editing</span>
        </div>
      {/if}

      <div class="kanban-board-wrapper">
        <KanbanView
          markdown={page.markdown}
          pageId={page.id}
          {comments}
          initialColumns={data.kanbanData?.columns ?? []}
          initialLabels={data.kanbanData?.labels ?? {}}
          {isOwner}
        />
      </div>

      <footer class="page-footer">
        <span>Published on </span>
        <a href="/">vibe.pub</a>
        <span class="footer-sep"> — </span>
        <a href="/">Create yours</a>
      </footer>
    </div>
  {:else if page.view === 'changelog'}
    <!-- ═══ CHANGELOG LAYOUT ═══ -->
    <div class="changelog-layout">
      {#if isOwner}
        <div class="page-toolbar">
          {#if editing}
            <button class="toolbar-btn toolbar-save" onclick={saveEdit} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button class="toolbar-btn toolbar-cancel" onclick={cancelEdit}>Cancel</button>
            {#if saveError}<span class="toolbar-error" role="alert"
                >{saveError} <button class="toolbar-retry" onclick={saveEdit}>Retry</button></span
              >{/if}
          {:else}
            <button class="toolbar-btn" onclick={startEdit}>Edit</button>
          {/if}
        </div>
      {:else if canClaim}
        <div class="page-toolbar">
          <button class="toolbar-btn" onclick={claimPage} disabled={claiming}
            >{claiming ? 'Claiming...' : 'Claim this page'}</button
          >
          <span class="toolbar-hint">Claim to enable editing</span>
        </div>
      {/if}

      {#if editing}
        <div class="edit-card">
          <textarea class="edit-textarea" bind:value={editMarkdown} rows={20}></textarea>
        </div>
      {:else}
        <ChangelogView
          releases={data.changelogData?.releases ?? []}
          title={page.title}
          {isOwner}
          {comments}
          pageId={page.id}
        />
      {/if}

      <footer class="page-footer">
        <span>Published on </span>
        <a href="/">vibe.pub</a>
        <span class="footer-sep"> — </span>
        <a href="/">Create yours</a>
      </footer>
    </div>
  {:else if page.view === 'timeline'}
    <!-- ═══ TIMELINE LAYOUT ═══ -->
    <div class="timeline-layout">
      {#if isOwner}
        <div class="page-toolbar">
          {#if editing}
            <button class="toolbar-btn toolbar-save" onclick={saveEdit} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button class="toolbar-btn toolbar-cancel" onclick={cancelEdit}>Cancel</button>
            {#if saveError}<span class="toolbar-error" role="alert"
                >{saveError} <button class="toolbar-retry" onclick={saveEdit}>Retry</button></span
              >{/if}
          {:else}
            <button class="toolbar-btn" onclick={startEdit}>Edit</button>
          {/if}
        </div>
      {:else if canClaim}
        <div class="page-toolbar">
          <button class="toolbar-btn" onclick={claimPage} disabled={claiming}
            >{claiming ? 'Claiming...' : 'Claim this page'}</button
          >
          <span class="toolbar-hint">Claim to enable editing</span>
        </div>
      {/if}

      {#if editing}
        <div class="edit-card">
          <textarea class="edit-textarea" bind:value={editMarkdown} rows={20}></textarea>
        </div>
      {:else}
        <TimelineView
          sections={data.timelineData?.sections ?? []}
          title={page.title}
          {isOwner}
          {comments}
          pageId={page.id}
        />
      {/if}

      <footer class="page-footer">
        <span>Published on </span>
        <a href="/">vibe.pub</a>
        <span class="footer-sep"> — </span>
        <a href="/">Create yours</a>
      </footer>
    </div>
  {:else if page.view === 'slides'}
    <!-- ═══ SLIDES LAYOUT: full width, no doc card ═══ -->
    <div class="slides-layout">
      {#if isOwner}
        <div class="slides-toolbar">
          {#if editing}
            <button class="toolbar-btn toolbar-save" onclick={saveEdit} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button class="toolbar-btn toolbar-cancel" onclick={cancelEdit}>Cancel</button>
            {#if saveError}<span class="toolbar-error" role="alert"
                >{saveError} <button class="toolbar-retry" onclick={saveEdit}>Retry</button></span
              >{/if}
          {:else}
            <button class="toolbar-btn" onclick={startEdit}>Edit</button>
          {/if}
        </div>
      {:else if canClaim}
        <div class="page-toolbar">
          <button class="toolbar-btn" onclick={claimPage} disabled={claiming}
            >{claiming ? 'Claiming...' : 'Claim this page'}</button
          >
          <span class="toolbar-hint">Claim to enable editing</span>
        </div>
      {/if}

      {#if editing}
        <div class="edit-card slides-edit-card">
          <textarea class="edit-textarea" bind:value={editMarkdown} rows={20}></textarea>
        </div>
      {:else}
        <SlidesView
          slides={data.slidesData?.slides ?? []}
          title={page.title}
          {comments}
          pageId={page.id}
        />
      {/if}
    </div>
  {:else if page.view === 'dashboard'}
    <!-- ═══ DASHBOARD LAYOUT ═══ -->
    <div class="dashboard-layout">
      {#if isOwner}
        <div class="page-toolbar">
          {#if editing}
            <button class="toolbar-btn toolbar-save" onclick={saveEdit} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button class="toolbar-btn toolbar-cancel" onclick={cancelEdit}>Cancel</button>
            {#if saveError}<span class="toolbar-error" role="alert"
                >{saveError} <button class="toolbar-retry" onclick={saveEdit}>Retry</button></span
              >{/if}
          {:else}
            <button class="toolbar-btn" onclick={startEdit}>Edit</button>
          {/if}
        </div>
      {:else if canClaim}
        <div class="page-toolbar">
          <button class="toolbar-btn" onclick={claimPage} disabled={claiming}
            >{claiming ? 'Claiming...' : 'Claim this page'}</button
          >
          <span class="toolbar-hint">Claim to enable editing</span>
        </div>
      {/if}

      {#if editing}
        <div class="edit-card">
          <textarea class="edit-textarea" bind:value={editMarkdown} rows={20}></textarea>
        </div>
      {:else}
        <DashboardView
          sections={data.dashboardData?.sections ?? []}
          title={page.title}
          {comments}
          pageId={page.id}
        />
      {/if}

      <footer class="page-footer">
        <span>Published on </span>
        <a href="/">vibe.pub</a>
        <span class="footer-sep"> — </span>
        <a href="/">Create yours</a>
      </footer>
    </div>
  {:else}
    <!-- ═══ DOC LAYOUT ═══ -->
    <div class="doc-layout">
      <main class="doc-main">
        <!-- Doc actions (outline + print) -->
        <div class="doc-actions">
          {#if tocFromText.length > 0}
            <button
              class="outline-toggle"
              class:active={showToc}
              onclick={() => (showToc = !showToc)}
              title="Outline"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"><path d="M4 6h16M4 12h10M4 18h13" /></svg
              >
            </button>
          {/if}
        </div>

        <!-- Floating outline panel -->
        {#if showToc && tocFromText.length > 0}
          <div class="outline-panel">
            <div class="outline-header">
              <span class="outline-label">Outline</span>
              <button
                type="button"
                class="outline-close"
                onclick={() => (showToc = false)}
                aria-label="Close outline"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg
                >
              </button>
            </div>
            <nav class="outline-nav">
              {#each tocFromText as item (item.id)}
                <a
                  href="#{item.id}"
                  class="outline-link"
                  class:outline-h3={item.level === 3}
                  class:outline-active={activeTocId === item.id}>{item.text}</a
                >
              {/each}
            </nav>
          </div>
        {/if}
        {#if isOwner}
          <div class="page-toolbar">
            {#if editing}
              <button class="toolbar-btn toolbar-save" onclick={saveEdit} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button class="toolbar-btn toolbar-cancel" onclick={cancelEdit}>Cancel</button>
              {#if saveError}<span class="toolbar-error" role="alert"
                  >{saveError} <button class="toolbar-retry" onclick={saveEdit}>Retry</button></span
                >{/if}
            {:else}
              <button class="toolbar-btn" onclick={startEdit}>Edit</button>
            {/if}
          </div>
        {:else if canClaim}
          <div class="page-toolbar">
            <button class="toolbar-btn" onclick={claimPage} disabled={claiming}
              >{claiming ? 'Claiming...' : 'Claim this page'}</button
            >
            <span class="toolbar-hint">Claim to enable editing</span>
          </div>
        {/if}

        {#if editing}
          <div class="edit-card">
            <textarea class="edit-textarea" bind:value={editMarkdown} rows={20}></textarea>
          </div>
        {:else}
          <!-- Article header: URL meta (no view/access badges — Reader handoff) -->
          <header class="doc-header">
            <div class="doc-meta-url" aria-label="Page URL">
              {$pageStore.url.hostname}{$pageStore.url.pathname}
            </div>
            <h1 class="doc-hero-title">{docHeroTitle}</h1>
            {#if lede}
              <p class="doc-lede">{lede}</p>
            {/if}
            <div class="doc-byline">
              {#if page.user_id}
                <span class="doc-byline-author">@{data.pageUser?.username ?? 'anonymous'}</span>
                <span class="doc-byline-dot"></span>
              {/if}
              <span>{docBylineDate}</span>
              <span class="doc-byline-dot"></span>
              <span>{readTime}</span>
            </div>
          </header>

          <article
            class="doc-article"
            class:doc-article--version-pending={!isOwner && readerHistoryVersionLoading}
            use:docActions={effectiveDocHtml}
          >
            {#if !isOwner && readerHistoryVersionLoading}
              <div class="reader-version-loading" role="status">Loading snapshot…</div>
            {/if}
            {#if !isOwner && readerHistoryVersionLoadError}
              <div class="reader-version-error" role="alert">{readerHistoryVersionLoadError}</div>
            {/if}
            <DocView
              bind:comments={localComments}
              html={effectiveDocHtml}
              title={null}
              pageId={page.id}
            />
          </article>

          <!-- Reader_Doc.html colophon — page footer (outside article, same measure as .doc-main) -->
          <footer class="doc-footer" aria-label="Colophon">
            <hr class="doc-foot-rule" />
            <p class="doc-foot-thanks">
              Thanks to everyone who sent pages this quarter. Keep writing.
            </p>
            <div class="doc-foot-row">
              <a href="/" class="doc-brand-mini">vibe.<em>pub</em></a>
              <div class="doc-foot-cta">
                Enjoyed this? <a href="/">Start your own vibe.pub</a> — publish from the terminal.
              </div>
              <span class="doc-foot-license">CC BY 4.0</span>
            </div>
          </footer>
        {/if}
      </main>
    </div>

    {#if !editing}
      <aside
        class="comments-panel"
        class:open={commentsPanelOpen}
        class:comments-panel--thread-resolved={!!panelBlockId && panelBlockThreadAllResolved}
        id="comments-panel"
        aria-hidden={!commentsPanelOpen}
      >
        <div class="rail-head comments-panel-head">
          <div class="comments-panel-head-text">
            {#if panelBlockId && panelBlockThreadAllResolved}
              <span class="rail-h thread-kicker-resolved">THREAD · RESOLVED</span>
              <h3 class="thread-context-title">{panelBlockThreadTitle}</h3>
            {:else if panelBlockId}
              <div class="comments-panel-head-block-row">
                <span class="rail-h comments-panel-thread-kicker"
                  >thread · {panelCommentsFiltered.length}{panelCommentsFiltered.length === 1
                    ? ' reply'
                    : ' replies'}</span
                >
                {#if panelBlockHasOpenComment && isOwner && page.view === 'doc'}
                  <button
                    type="button"
                    class="comments-panel-suggest-btn"
                    class:comments-panel-suggest-btn--busy={blockReviseLoading}
                    disabled={blockReviseLoading}
                    onclick={() => void requestBlockReviseSuggestion()}
                  >
                    {blockReviseLoading ? '…' : 'Suggestion for revise'}
                  </button>
                {/if}
              </div>
            {:else}
              <span class="rail-h">open · {panelCommentsFiltered.length}</span>
            {/if}
          </div>
          <button
            type="button"
            class="comments-panel-close"
            aria-label="Close comments"
            onclick={() => closeDocCommentsPanel()}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg
            >
          </button>
        </div>
        <div class="comments-panel-scroll">
          {#if panelBlockId && panelCommentsFiltered.length === 0}
            <div class="empty-rail empty-rail--block">
              <div class="empty-rail-h">No comments on this block yet.</div>
              <div class="empty-rail-c">
                {#if docCommentsSnapshotReadonly}
                  Switch back to the <em>current</em> version to add a comment.
                {:else}
                  Write one below — the agent will read it.
                {/if}
              </div>
            </div>
          {:else if !panelBlockId && localComments.length === 0}
            <div class="empty-rail">
              <div class="empty-rail-h">No <em>comments</em> yet.</div>
              <div class="empty-rail-c">
                {#if docCommentsSnapshotReadonly}
                  Replies are turned off while you view an older version. Use the <em>current</em> version
                  to comment.
                {:else}
                  Click any block to leave a comment. The agent will read it.
                {/if}
              </div>
            </div>
          {:else if panelGlobalAllResolved}
            <div class="empty-rail">
              <div class="empty-rail-h">Everything’s <em>resolved</em>.</div>
              <div class="empty-rail-c">This view only lists open threads.</div>
            </div>
          {:else}
            <div class="cp-list">
              {#each panelCommentsFiltered as comment (comment.id)}
                {@const navBid = !panelBlockId ? parseBlockAnchorId(comment) : null}
                {@const brPayload = isAgentComment(comment)
                  ? parseBlockReviseCommentBody(comment.body)
                  : null}
                {@const bodyLong = brPayload
                  ? blockReviseShouldCollapse(brPayload)
                  : shouldCollapseCommentBody(comment.body)}
                <article class="cp-comment">
                  <!-- svelte-ignore a11y_no_noninteractive_tabindex: div acts as button via role + keyboard -->
                  <div
                    class="cp-comment-card"
                    class:cp-comment-card--agent={isAgentComment(comment)}
                    class:cp-comment-card--navigable={!!navBid}
                    role={navBid ? 'button' : undefined}
                    tabindex={navBid ? 0 : undefined}
                    aria-label={navBid
                      ? 'Go to this paragraph in the article and open discussion'
                      : undefined}
                    onclick={navBid
                      ? (e: MouseEvent) => {
                          const t = e.target;
                          if (
                            t instanceof Element &&
                            (t.closest('.cp-body-outer') || t.closest('.cp-block-revise-embed'))
                          )
                            return;
                          e.stopPropagation();
                          onNavCommentCardActivate(comment);
                        }
                      : undefined}
                    onkeydown={navBid ? (e) => onNavCommentCardKeydown(e, comment) : undefined}
                  >
                    <div class="cp-top">
                      <div
                        class="cp-avatar"
                        class:cp-avatar--agent={isAgentComment(comment)}
                        aria-hidden="true"
                      >
                        {#if isAgentComment(comment)}
                          <span class="cp-avatar-agent-mark">✦</span>
                        {:else}
                          {commentAvatarLetter(comment.display_name)}
                        {/if}
                      </div>
                      <header class="cp-comment-head">
                        <div class="cp-head-names">
                          <span class="cp-author">{commentHandle(comment.display_name)}</span>
                          {#if comment.resolved !== 0}
                            <span class="cp-status">Resolved</span>
                          {/if}
                        </div>
                        <span class="cp-time">{commentTimeAgo(comment.created)}</span>
                      </header>
                    </div>
                    {#if brPayload}
                      <div class="block-revise-card-body cp-block-revise-embed">
                        <div
                          class="block-revise-scroll"
                          class:block-revise-scroll--auto={!bodyLong}
                          class:block-revise-scroll--collapsed={bodyLong &&
                            !commentBodyExpandedById[comment.id]}
                          class:block-revise-scroll--expanded={bodyLong &&
                            !!commentBodyExpandedById[comment.id]}
                        >
                          {#if brPayload.summary}
                            <p class="block-revise-summary">{brPayload.summary}</p>
                          {/if}
                          {#each brPayload.pairs as pair, i (i)}
                            {#if pair.remove || pair.add}
                              <div class="block-revise-diff-wrap">
                                <div class="block-revise-diff-inner">
                                  {#if pair.remove}
                                    <div class="block-revise-line block-revise-remove">
                                      {pair.remove}
                                    </div>
                                  {/if}
                                  {#if pair.add}
                                    <div class="block-revise-line block-revise-add">{pair.add}</div>
                                  {/if}
                                </div>
                              </div>
                            {/if}
                          {/each}
                        </div>
                        {#if bodyLong}
                          <button
                            type="button"
                            class="cp-body-toggle block-revise-toggle"
                            onclick={(e) => toggleCommentBodyExpanded(e, comment.id)}
                          >
                            {commentBodyExpandedById[comment.id] ? 'Show less' : 'Show more'}
                          </button>
                        {/if}
                      </div>
                    {:else if bodyLong}
                      <div class="cp-body-outer">
                        <div
                          class="cp-body-scroll"
                          class:cp-body-scroll--collapsed={!commentBodyExpandedById[comment.id]}
                          class:cp-body-scroll--expanded={!!commentBodyExpandedById[comment.id]}
                        >
                          <p class="cp-body">{comment.body}</p>
                        </div>
                        <button
                          type="button"
                          class="cp-body-toggle"
                          onclick={(e) => toggleCommentBodyExpanded(e, comment.id)}
                        >
                          {commentBodyExpandedById[comment.id] ? 'Show less' : 'Show more'}
                        </button>
                      </div>
                    {:else}
                      <p class="cp-body">{comment.body}</p>
                    {/if}
                  </div>
                </article>
              {/each}
              {#if panelBlockId && panelBlockThreadAllResolved}
                <div class="thread-resolved-footer" role="status">✓ resolved · now</div>
              {/if}
            </div>
          {/if}
          {#if panelBlockId && isOwner && page.view === 'doc' && (blockReviseLoading || blockReviseError)}
            <div class="block-revise-slot" aria-live="polite">
              {#if blockReviseLoading}
                <p class="block-revise-loading">Generating revise suggestion...</p>
              {:else if blockReviseError}
                <p class="block-revise-error" role="alert">{blockReviseError}</p>
              {/if}
            </div>
          {/if}
        </div>
        {#if panelBlockId && !docCommentsSnapshotReadonly}
          <div class="cp-compose">
            <div class="cp-compose-row">
              <input
                type="text"
                class="cp-compose-input"
                placeholder="Reply, or leave a new note…"
                bind:value={panelNewBody}
                onkeydown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    postPanelBlockComment();
                  }
                }}
              />
              <button
                type="button"
                class="cp-compose-send"
                onclick={postPanelBlockComment}
                disabled={panelPosting || !panelNewBody.trim()}
              >
                {panelPosting ? '...' : 'Send'}
              </button>
            </div>
          </div>
        {/if}
      </aside>
    {/if}
  {/if}

  {#if !isOwner}
    <aside
      id="reader-history-panel"
      class="history-panel-reader"
      class:open={readerHistoryOpen}
      aria-hidden={!readerHistoryOpen}
    >
      <div class="history-panel-head rail-head">
        <div class="history-panel-head-l">
          <div class="history-kicker">version history</div>
          <h2 class="history-panel-title">Previous <em>versions</em></h2>
        </div>
        <button
          type="button"
          class="history-panel-close"
          aria-label="Close history"
          onclick={() => closeReaderHistoryPanel()}
        >
          ✕
        </button>
      </div>
      <div class="history-panel-body">
        {#if readerHistoryLoading}
          <p class="history-panel-status">Loading…</p>
        {:else if readerHistoryError}
          <p class="history-panel-status history-panel-status--error">{readerHistoryError}</p>
        {:else if readerVersions.length === 0}
          <p class="history-panel-status">No saved versions yet.</p>
        {:else}
          {#each readerVersions as row, i (row.version)}
            {@const historyAuthor = row.author_username ?? data.pageUser?.username ?? ''}
            <button
              type="button"
              class="history-entry"
              class:history-entry--selected={readerHistorySelectedVersion === null
                ? i === 0
                : readerHistorySelectedVersion === row.version}
              aria-current={(
                readerHistorySelectedVersion === null
                  ? i === 0
                  : readerHistorySelectedVersion === row.version
              )
                ? 'true'
                : undefined}
              onclick={() => selectReaderHistoryVersion(row, i)}
            >
              <div class="history-date">{formatHistoryDate(row.created)}</div>
              <div class="history-title">
                {row.title?.trim() || 'Untitled'}{#if i === 0}<span class="history-badge-current"
                    >current</span
                  >{/if}
              </div>
              <div class="history-summary">
                Snapshot · {row.lines} line{row.lines === 1 ? '' : 's'}
              </div>
              <div
                class="history-stats"
                aria-label="Lines changed vs previous snapshot, and who updated the page"
              >
                <span class="stat lines"><b>+{row.lines_added}</b> lines</span>
                <span class="stat lines"><b>−{row.lines_removed}</b> lines</span>
                {#if historyAuthor}
                  <span class="stat"><b>@{historyAuthor}</b></span>
                {/if}
              </div>
            </button>
          {/each}
        {/if}
      </div>
    </aside>
  {/if}
</div>

<style>
  /* ═══ SEO body (LLM fallback) ═══
     Server-rendered article kept fully visible in the DOM so any HTML
     parser — including JS-executing readability cleaners that strip
     display:none / visibility:hidden / off-screen content — sees the
     real article text. Real visitors don't see it because the
     view-specific UI (SlidesView, KanbanView, etc.) renders on top with
     position:fixed z-index, covering the viewport. The article still
     occupies the document below; that's fine, no user ever scrolls
     under a fixed-overlay UI. */
  .seo-main {
    max-width: 720px;
    margin: 2rem auto;
    padding: 1rem;
    color: var(--text-primary);
  }
  /* Hide from JS-enabled browsers — the view-specific UI takes over.
     Bots and most readability extractors don't process @media rules,
     so they still see the article. */
  @media (scripting: enabled) {
    .seo-main {
      display: none;
    }
  }
  .seo-body :global(h1),
  .seo-body :global(h2),
  .seo-body :global(h3) {
    margin: 1em 0 0.5em;
  }
  .seo-body :global(p) {
    margin: 0.5em 0;
  }

  /* ═══ Page wrapper ═══ */
  .page-wrapper {
    background: var(--bg);
    color: var(--text-primary);
    min-height: 100vh;
  }

  /* ═══ KANBAN LAYOUT ═══ */
  .kanban-layout {
    padding: 24px;
    max-width: 100%;
  }

  .kanban-toolbar {
    max-width: 1200px;
    margin: 0 auto 12px;
    display: flex;
    gap: 8px;
  }

  .kanban-board-wrapper {
    max-width: 100%;
    overflow-x: auto;
  }

  /* ═══ CHANGELOG LAYOUT ═══ */
  .changelog-layout {
    max-width: 720px;
    margin: 0 auto;
    padding: 32px 24px 80px;
  }

  /* ═══ TIMELINE LAYOUT ═══ */
  .timeline-layout {
    max-width: 720px;
    margin: 0 auto;
    padding: 32px 24px 80px;
  }

  /* ═══ DASHBOARD LAYOUT ═══ */
  .dashboard-layout {
    max-width: 900px;
    margin: 0 auto;
    padding: 32px 24px 80px;
  }

  /* ═══ SLIDES LAYOUT ═══ */
  .slides-layout {
    width: 100%;
    min-height: 100vh;
    position: relative;
  }

  .slides-toolbar {
    position: fixed;
    top: 56px;
    right: 16px;
    z-index: 30;
    display: flex;
    gap: 8px;
  }

  .slides-edit-card {
    max-width: 720px;
    margin: 80px auto 40px;
  }

  /* ═══ DOC LAYOUT (Reader: ~1080 shell, 680px prose, fixed left TOC) ═══ */
  .doc-layout {
    display: grid;
    grid-template-columns: 1fr;
    max-width: 1280px;
    margin: 0 auto;
    gap: 40px 48px;
    padding: 64px 32px 120px;
    position: relative;
    align-items: start;
  }

  /*
   * Fixed `.outline-panel` is anchored to the viewport (left: 24px, width: 220px),
   * while `.doc-main` is only centered in the grid — on many widths the prose
   * column starts left of the TOC and visually intrudes. Reserve that strip + gap.
   */
  @media (min-width: 1280px) {
    .doc-layout:has(.outline-panel) {
      padding: 64px 32px 120px calc(24px + 220px + 32px + 24px);
    }

    /* Outline 已在左侧占位；正文不要再在「剩余宽度」里居中，否则会整体偏右、与大纲间距过大（对齐设计稿）。 */
    .doc-layout:has(.outline-panel) .doc-main {
      margin-left: 0;
      margin-right: auto;
    }
  }

  /* ── Doc main column (Reader .article measure) ── */
  .doc-main {
    min-width: 0;
    width: 100%;
    max-width: 680px;
    margin: 0 auto;
    position: relative;
  }

  /* ── Article header (Reader_Doc.html: .meta-row + .title + .lede + .byline-min) ── */
  .doc-header {
    margin-bottom: 0;
    text-align: left;
  }

  .doc-meta-url {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-tertiary);
    margin-bottom: 28px;
    text-align: left;
    word-break: break-all;
  }

  .doc-hero-title {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: clamp(40px, 5vw, 56px);
    line-height: 1.04;
    letter-spacing: -0.028em;
    text-align: left;
    margin: 0 0 20px;
    color: var(--text-primary);
    text-wrap: balance;
  }

  .doc-hero-title :global(em) {
    font-style: italic;
  }

  .doc-byline {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-tertiary);
    margin: 0 0 48px;
    padding-bottom: 18px;
    border-bottom: 1px solid var(--border);
  }

  .doc-byline-author {
    color: var(--text-secondary);
    font-weight: 500;
  }

  .doc-byline > span:not(.doc-byline-dot) {
    white-space: nowrap;
  }

  .doc-byline-dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--text-tertiary);
    flex-shrink: 0;
    opacity: 0.4;
  }

  /* Reader_Doc `.lede`: prose body, larger secondary — not full-paragraph italic */
  .doc-lede {
    font-family: var(--font-prose);
    font-style: normal;
    font-size: 22px;
    line-height: 1.5;
    color: var(--text-secondary);
    text-align: left;
    margin: 0 0 32px;
    max-width: none;
    text-wrap: pretty;
  }

  .doc-lede :global(em) {
    font-style: italic;
  }

  /* ── Doc article (no card, direct on bg) ── */
  .doc-article {
    position: relative;
  }

  /*
   * Reader_Doc — thread focus: dim each top-level block except heading-only blocks and the active one.
   * Headings stay crisp; body copy / lists / code / etc. recede when the comment panel is open.
   */
  :global(body.comments-panel-open) .doc-article :global(.doc-view > .block-el:not(.block-active)) {
    opacity: 0.32;
    transition:
      opacity 0.25s ease,
      filter 0.25s ease;
  }

  :global(body.comments-panel-open) .doc-article :global(.doc-view > .block-el.block-active) {
    opacity: 1;
  }

  :global(body.comments-panel-open)
    .doc-article
    :global(.doc-view > .block-el:not(.block-active):is(:has(> h1), :has(> h2), :has(> h3))) {
    opacity: 1;
  }

  /* .dark lives on .page-wrapper, not body — chain must include it or this never matches */
  :global(body.comments-panel-open .page-wrapper.dark)
    .doc-article
    :global(.doc-view > .block-el:not(.block-active)) {
    opacity: 0.38;
  }

  :global(body.comments-panel-open .page-wrapper.dark)
    .doc-article
    :global(.doc-view > .block-el:not(.block-active):is(:has(> h1), :has(> h2), :has(> h3))) {
    opacity: 1;
  }

  /* Prose overrides for doc view to match L3 design */
  .doc-article :global(.doc-view) {
    font-family: var(--font-prose);
    font-size: 18px;
    line-height: 1.7;
    color: var(--text-primary);
  }

  .doc-article :global(.doc-view p) {
    margin: 0 0 22px;
  }

  .doc-article :global(.doc-view h2) {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: 32px;
    line-height: 1.15;
    letter-spacing: -0.015em;
    margin: 48px 0 16px;
    color: var(--text-primary);
  }

  .doc-article :global(.doc-view h3) {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: 24px;
    line-height: 1.2;
    letter-spacing: -0.01em;
    margin: 36px 0 12px;
    color: var(--text-primary);
  }

  .doc-article :global(.doc-view pre) {
    padding: 18px 22px;
    border-radius: 10px;
    font-family: var(--font-mono);
    font-size: 14px;
    line-height: 1.65;
    margin: 24px 0;
    overflow-x: auto;
    border: none;
    box-shadow: none;
  }

  .doc-article :global(.doc-view pre:not(.shiki)) {
    background: var(--text-primary);
    color: var(--bg);
  }

  .doc-article :global(.doc-view pre code) {
    background: transparent;
    color: inherit;
  }

  .doc-article :global(.doc-view code:not(pre code)) {
    font-family: var(--font-mono);
    font-size: 0.88em;
    background: rgba(0, 0, 0, 0.05);
    padding: 2px 6px;
    border-radius: 4px;
  }

  /* ── Outline toggle (Reader meta-outline-btn — narrow only; wide uses fixed TOC) ── */
  .doc-actions {
    position: fixed;
    left: 12px;
    bottom: 24px;
    top: auto;
    transform: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 39;
  }

  .outline-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    opacity: 0.3;
    transition:
      opacity 140ms ease,
      background 140ms ease,
      color 140ms ease;
  }

  .outline-toggle svg {
    width: 15px;
    height: 15px;
  }

  .outline-toggle:hover {
    opacity: 1;
    color: var(--text-primary);
    background: rgba(0, 0, 0, 0.04);
  }

  :global(.dark) .outline-toggle:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .outline-toggle.active {
    opacity: 1;
    color: var(--text-primary);
  }

  /* ── Outline rail (Reader #toc) ── */
  .outline-panel {
    position: fixed;
    left: 24px;
    top: 88px;
    width: 220px;
    max-height: calc(100vh - 120px);
    overflow-y: auto;
    overflow-x: hidden;
    z-index: 42;
    padding: 12px 8px 14px;
    border-radius: 10px;
    background: transparent;
    border: none;
    box-shadow: none;
    text-align: left;
    font-family: var(--font-sans);
    isolation: isolate;
    scrollbar-width: thin;
  }

  .outline-panel::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: color-mix(in srgb, var(--bg) 50%, transparent);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    z-index: -1;
    opacity: 0.7;
  }

  .outline-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 8px 8px;
  }

  .outline-label {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-tertiary);
    opacity: 0.7;
  }

  .outline-nav {
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .outline-link {
    display: block;
    font-size: 13px;
    line-height: 1.45;
    color: var(--text-secondary);
    text-decoration: none;
    padding: 6px 10px;
    border-radius: 6px;
    transition: all 0.12s;
    text-wrap: pretty;
  }

  .outline-link:hover {
    color: var(--text-primary);
    background: rgba(0, 0, 0, 0.035);
  }

  :global(.dark) .outline-link:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .outline-link.outline-active {
    color: var(--text-primary);
    background: rgba(0, 0, 0, 0.05);
    font-weight: 500;
  }

  :global(.dark) .outline-link.outline-active {
    background: rgba(255, 255, 255, 0.06);
  }

  .outline-link.outline-h3 {
    padding-left: 22px;
    font-size: 12px;
    color: var(--text-tertiary);
  }

  .outline-link.outline-h3.outline-active {
    color: var(--text-primary);
  }

  /* Reader_Doc.html — .thread-panel (no full-page backdrop — doc stays full contrast) */
  .comments-panel {
    position: fixed;
    top: 56px;
    right: 0;
    bottom: 0;
    width: min(380px, 100vw);
    z-index: 45;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    border-left: 1px solid var(--border);
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.04);
    transform: translateX(100%);
    transition: transform 240ms cubic-bezier(0.2, 0, 0.2, 1);
    overflow: hidden;
    padding: 0;
    box-sizing: border-box;
    pointer-events: none;
  }

  :global(.dark) .comments-panel {
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.35);
  }

  .comments-panel.open {
    transform: translateX(0);
    pointer-events: auto;
  }

  /* Reader_Doc.html — .history-panel (non-owner version rail) */
  .history-panel-reader {
    position: fixed;
    top: 56px;
    right: 0;
    bottom: 0;
    width: min(380px, 100vw);
    z-index: 44;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    border-left: 1px solid var(--border);
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.04);
    transform: translateX(100%);
    transition: transform 240ms cubic-bezier(0.2, 0, 0.2, 1);
    overflow: hidden;
    padding: 0;
    box-sizing: border-box;
    pointer-events: none;
  }

  :global(.dark) .history-panel-reader {
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.35);
  }

  .history-panel-reader.open {
    transform: translateX(0);
    pointer-events: auto;
  }

  .history-panel-head {
    position: sticky;
    top: 0;
    flex-shrink: 0;
    margin: 0;
    padding: 20px 24px 14px;
    background: var(--bg);
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    border-bottom: 1px solid var(--border);
  }

  .history-panel-head-l {
    min-width: 0;
  }

  .history-kicker {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-tertiary);
    margin: 0 0 4px;
  }

  .history-panel-title {
    font-family: var(--font-serif);
    font-size: 20px;
    font-weight: 400;
    letter-spacing: -0.01em;
    margin: 0;
    color: var(--text-primary);
    line-height: 1.2;
  }

  .history-panel-title em {
    font-style: italic;
  }

  .history-panel-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    flex-shrink: 0;
    transition:
      color 0.12s ease,
      background 0.12s ease;
  }

  .history-panel-close:hover {
    color: var(--text-primary);
    background: rgba(0, 0, 0, 0.05);
  }

  :global(.dark) .history-panel-close:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .history-panel-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 12px 0;
  }

  .history-panel-status {
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--text-secondary);
    padding: 24px;
    margin: 0;
    line-height: 1.5;
  }

  .history-panel-status--error {
    color: var(--error, #ef4444);
  }

  .history-entry {
    display: block;
    width: 100%;
    margin: 0;
    text-align: left;
    font: inherit;
    color: inherit;
    padding: 14px 24px;
    cursor: pointer;
    border: none;
    border-left: 3px solid transparent;
    background: transparent;
    transition: background 0.15s ease;
  }

  .history-entry:hover {
    background: rgba(0, 0, 0, 0.025);
  }

  :global(.dark) .history-entry:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .history-entry--selected {
    border-left-color: var(--text-primary);
    background: rgba(0, 0, 0, 0.02);
  }

  :global(.dark) .history-entry--selected {
    background: rgba(255, 255, 255, 0.03);
  }

  .doc-article--version-pending :global(.doc-view) {
    opacity: 0.45;
    pointer-events: none;
    transition: opacity 0.15s ease;
  }

  .reader-version-loading {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 2.5rem;
    font-family: var(--font-sans);
    font-size: 14px;
    color: var(--text-secondary);
    pointer-events: none;
  }

  .reader-version-error {
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--error, #ef4444);
    padding: 0 0 12px;
    margin: 0;
  }

  .history-date {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
    margin-bottom: 4px;
  }

  .history-title {
    font-family: var(--font-serif);
    font-size: 15px;
    font-weight: 400;
    color: var(--text-primary);
    margin-bottom: 4px;
    letter-spacing: -0.005em;
    line-height: 1.35;
  }

  .history-title em {
    font-style: italic;
  }

  .history-badge-current {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #15803d;
    display: inline-block;
    margin-left: 6px;
    vertical-align: middle;
  }

  :global(.dark) .history-badge-current {
    color: #86efac;
  }

  .history-summary {
    font-family: var(--font-sans);
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  /* Reader_Doc.html — .history-stats / .stat.lines / author @handle */
  .history-stats {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 8px;
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-tertiary);
  }

  .history-stats .stat {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .history-stats .stat b {
    color: var(--text-secondary);
    font-weight: 600;
  }

  .history-stats .stat.lines b {
    color: var(--text-secondary);
  }

  .comments-panel-head.rail-head {
    align-items: center;
  }

  /* Reader — .thread-head (fixed strip above the scroll column) */
  .comments-panel-head {
    flex-shrink: 0;
    margin: 0;
    padding: 20px 24px 14px;
    background: var(--bg);
    z-index: 1;
  }

  .comments-panel-head.rail-head {
    margin-bottom: 0;
    align-items: flex-start;
  }

  .comments-panel-head-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
    padding-right: 10px;
  }

  .comments-panel-head-block-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    min-width: 0;
  }

  .comments-panel-thread-kicker {
    flex: 1;
    min-width: 0;
  }

  .comments-panel-suggest-btn {
    flex-shrink: 0;
    max-width: 55%;
    padding: 4px 10px;
    font-family: var(--font-sans);
    font-size: 11px;
    font-weight: 500;
    line-height: 1.25;
    text-align: center;
    color: var(--text-secondary);
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 999px;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      color 0.15s ease,
      background 0.15s ease;
  }

  .comments-panel-suggest-btn:hover {
    border-color: var(--text-tertiary);
    color: var(--text-primary);
    background: rgba(0, 0, 0, 0.03);
  }

  :global(.dark) .comments-panel-suggest-btn:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .comments-panel-suggest-btn--busy {
    cursor: wait;
    opacity: 0.65;
  }

  .comments-panel-suggest-btn:disabled {
    cursor: wait;
  }

  /* Gemini block revision: loading/error slot + diff body inside agent comment cards */
  .block-revise-slot {
    flex-shrink: 0;
    margin-top: 16px;
    padding: 0 0 8px;
    border-top: 1px solid transparent;
  }

  .block-revise-loading,
  .block-revise-error {
    margin: 0;
    font-family: var(--font-sans);
    font-size: 13px;
    line-height: 1.45;
    color: var(--text-secondary);
  }

  .block-revise-error {
    color: #b91c1c;
  }

  :global(.dark) .block-revise-error {
    color: #fca5a5;
  }

  .block-revise-summary {
    margin: 0 0 12px;
    font-family: var(--font-serif);
    font-size: 15px;
    line-height: 1.45;
    color: #fafaf9;
  }

  .block-revise-diff-wrap + .block-revise-diff-wrap {
    margin-top: 10px;
  }

  .block-revise-diff-inner {
    border-radius: 8px;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.35);
    font-family:
      ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
      monospace;
    font-size: 13px;
    line-height: 1.45;
  }

  .block-revise-line {
    white-space: pre-wrap;
    word-break: break-word;
  }

  .block-revise-remove {
    color: #a8a29e;
    text-decoration: line-through;
    text-decoration-color: #b45309;
    text-decoration-thickness: 1px;
  }

  .block-revise-add {
    margin-top: 6px;
    color: #4ade80;
  }

  .block-revise-card-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  .cp-block-revise-embed {
    margin-top: 6px;
  }

  .block-revise-scroll {
    min-width: 0;
  }

  .block-revise-scroll--auto {
    max-height: none;
    overflow: visible;
  }

  .block-revise-scroll--collapsed {
    max-height: 15rem;
    overflow: hidden;
  }

  .block-revise-scroll--expanded {
    max-height: min(70vh, 32rem);
    overflow-y: auto;
    overscroll-behavior: auto;
    -webkit-overflow-scrolling: touch;
  }

  .cp-body-outer {
    margin-top: 6px;
    min-width: 0;
  }

  .cp-body-scroll {
    min-width: 0;
  }

  .cp-body-scroll--collapsed {
    max-height: 10.5rem;
    overflow: hidden;
  }

  .cp-body-scroll--expanded {
    max-height: min(70vh, 28rem);
    overflow-y: auto;
    overscroll-behavior: auto;
    -webkit-overflow-scrolling: touch;
  }

  .cp-body-toggle {
    align-self: flex-start;
    margin-top: 2px;
    padding: 4px 10px;
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 500;
    line-height: 1.25;
    color: var(--text-secondary);
    background: color-mix(in srgb, var(--bg) 90%, var(--text-primary) 3%);
    border: 1px solid var(--border);
    border-radius: 999px;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      background 0.15s ease,
      color 0.15s ease;
  }

  .cp-body-toggle:hover {
    border-color: var(--text-tertiary);
    color: var(--text-primary);
  }

  .block-revise-toggle {
    color: #e7e5e4;
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.18);
  }

  .block-revise-toggle:hover {
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.28);
  }

  .thread-kicker-resolved {
    letter-spacing: 0.14em;
  }

  .thread-context-title {
    font-family: var(--font-serif);
    font-size: 18px;
    font-weight: 400;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    margin: 4px 0 0;
    line-height: 1.28;
  }

  /* Reader — .thread-body: scrolls list + Gemini card + composer as one column */
  .comments-panel-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    padding: 16px 24px 20px;
  }

  /* Reader_Doc.html — .thread-resolved footer under message list */
  .thread-resolved-footer {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    color: #15803d;
    text-align: center;
    padding: 14px 8px 4px;
    margin-top: 4px;
    line-height: 1.4;
  }

  :global(.dark) .thread-resolved-footer {
    color: #86efac;
  }

  /* Resolved block thread: white user cards, hide per-msg “Resolved” pill (design mock) */
  .comments-panel--thread-resolved .cp-status {
    display: none;
  }

  .comments-panel--thread-resolved .cp-comment-card:not(.cp-comment-card--agent) {
    background: #ffffff;
    border: 1px solid rgba(15, 23, 42, 0.08);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  :global(.dark) .comments-panel--thread-resolved .cp-comment-card:not(.cp-comment-card--agent) {
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: none;
  }

  /* Agent message — black card (design mock) */
  .cp-comment-card.cp-comment-card--agent {
    background: #0f0f0f;
    border: none;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.2);
  }

  :global(.dark) .cp-comment-card.cp-comment-card--agent {
    background: #141414;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
  }

  .cp-comment-card.cp-comment-card--agent .cp-author {
    color: #fafaf9;
  }

  .cp-comment-card.cp-comment-card--agent .cp-time {
    color: rgba(250, 250, 249, 0.45);
  }

  .cp-comment-card.cp-comment-card--agent .cp-body {
    color: #fafaf9;
  }

  .cp-avatar.cp-avatar--agent {
    background: #fafaf9;
    color: #0f0f0f;
  }

  .cp-avatar-agent-mark {
    display: block;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
  }

  /* Reader — .icon-btn */
  .comments-panel-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    transition:
      color 0.12s ease,
      background 0.12s ease;
  }

  .comments-panel-close:hover {
    color: var(--text-primary);
    background: rgba(0, 0, 0, 0.05);
  }

  :global(.dark) .comments-panel-close:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .rail-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 18px;
  }

  /* Reader — .kicker (thread head meta) */
  .rail-h {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }

  .empty-rail {
    padding: 40px 20px;
    text-align: center;
  }

  .empty-rail-h {
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 19px;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .empty-rail-h :global(em) {
    font-style: italic;
  }

  .empty-rail-c {
    font-family: var(--font-prose);
    font-size: 13px;
    line-height: 1.55;
    color: var(--text-tertiary);
    max-width: 240px;
    margin: 0 auto;
  }

  .empty-rail--block {
    padding: 28px 16px;
  }

  /* Reader_Doc.html — .thread-reply */
  .cp-compose {
    flex-shrink: 0;
    border-top: 1px solid var(--border);
    padding: 14px 24px max(20px, env(safe-area-inset-bottom, 0px));
    background: var(--bg);
    z-index: 2;
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

  /* Reader_Doc.html — .msg list */
  .cp-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .cp-comment {
    margin: 0;
  }

  .cp-comment-card {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    --cp-meta-size: 12px;
    --cp-time-size: 10px;
    --cp-body-size: 14px;
    --cp-avatar-size: 20px;
    font-size: var(--cp-meta-size);
    background: var(--surface);
    border-radius: 10px;
    padding: 12px 14px;
    box-shadow: var(--shadow-card);
  }

  .cp-comment-card.cp-comment-card--navigable {
    font: inherit;
    cursor: pointer;
    outline: none;
    text-align: left;
    width: 100%;
    margin: 0;
    box-sizing: border-box;
    transition:
      background 0.12s ease,
      box-shadow 0.12s ease;
  }

  .cp-comment-card.cp-comment-card--navigable:hover {
    background: color-mix(in srgb, var(--text-primary) 5%, var(--surface));
  }

  .cp-comment-card.cp-comment-card--navigable:focus-visible {
    box-shadow:
      var(--shadow-card),
      0 0 0 2px color-mix(in srgb, var(--text-primary) 35%, transparent);
  }

  :global(.dark) .cp-comment-card.cp-comment-card--navigable:hover {
    background: color-mix(in srgb, var(--text-primary) 10%, var(--surface));
  }

  /* Reader — .msg-head row + .msg-av gap */
  .cp-top {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  :global(.dark) .cp-comment-card {
    box-shadow: var(--shadow-card);
  }

  /* Reader — .msg-av */
  .cp-avatar {
    flex-shrink: 0;
    width: var(--cp-avatar-size);
    height: var(--cp-avatar-size);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-sans);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0;
    line-height: 1;
    color: var(--bg);
    background: var(--text-primary);
    border: none;
  }

  :global(.dark) .cp-avatar {
    background: #f5f5f4;
    color: #1a1a18;
  }

  .cp-comment-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-family: var(--font-sans);
    font-size: inherit;
    line-height: 1.35;
    min-width: 0;
    flex: 1;
  }

  .cp-head-names {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 8px;
    min-width: 0;
  }

  /* Reader — .msg-name */
  .cp-author {
    font-size: var(--cp-meta-size);
    font-weight: 600;
    color: var(--text-primary);
  }

  .cp-status {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-tertiary);
    padding: 2px 7px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--bg) 60%, transparent);
  }

  /* Reader — .msg-time */
  .cp-time {
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: var(--cp-time-size);
    font-weight: 400;
    color: var(--text-tertiary);
  }

  /* Reader — .msg-body */
  .cp-body {
    font-family: var(--font-prose);
    font-size: var(--cp-body-size);
    line-height: 1.55;
    color: var(--text-primary);
    margin: 6px 0 0;
    padding: 0;
    width: 100%;
    box-sizing: border-box;
    border: none;
    text-wrap: pretty;
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* ═══ Responsive ═══ */
  @media (max-width: 959px) {
    .doc-layout {
      grid-template-columns: 1fr;
      max-width: 680px;
      padding: 48px 24px 80px;
    }
  }

  @media (max-width: 639px) {
    .doc-layout {
      padding: 24px 20px 80px;
    }
    .changelog-layout {
      padding: 16px 16px 80px;
    }
    .timeline-layout {
      padding: 16px 16px 80px;
    }
    .dashboard-layout {
      padding: 16px 16px 80px;
    }
    .doc-hero-title {
      font-size: 36px;
    }
    .doc-lede {
      font-size: 18px;
    }
    .doc-byline {
      flex-wrap: wrap;
      justify-content: flex-start;
    }
  }

  @media (min-width: 640px) and (max-width: 959px) {
    .doc-hero-title {
      font-size: 48px;
    }
    .doc-lede {
      font-size: 20px;
    }
  }

  @media (min-width: 1280px) {
    .doc-actions {
      display: none;
    }

    .outline-toggle {
      display: none;
    }

    .outline-close {
      display: none !important;
    }

    .outline-header {
      border-bottom: none;
      padding-bottom: 10px;
      margin-bottom: 2px;
    }
  }

  @media (max-width: 1279px) {
    .outline-header {
      margin-bottom: 6px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }

    .outline-close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
    }

    .outline-close:hover {
      background: rgba(0, 0, 0, 0.05);
      color: var(--text-primary);
    }

    :global(.dark) .outline-close:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    /* Overlay TOC: same glass as wide, slightly inset */
    .outline-panel {
      left: 12px;
      top: 72px;
      width: min(220px, calc(100vw - 24px));
      padding: 12px 8px 14px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
    }
  }

  /* ═══ Shared: toolbar, edit, footer ═══ */
  .page-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .toolbar-btn {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 500;
    padding: 7px 14px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 150ms;
  }

  .toolbar-btn:hover {
    border-color: var(--border-hover);
    color: var(--text-primary);
    background: var(--surface-hover);
  }

  .toolbar-save {
    background: var(--accent);
    color: var(--bg);
    border-color: var(--accent);
  }

  .toolbar-save:hover {
    background: var(--accent-hover);
  }

  .toolbar-error {
    font-size: 12px;
    color: #ef4444;
  }

  .toolbar-hint {
    font-size: 12px;
    color: var(--text-tertiary);
    font-family: var(--font-mono);
  }

  .toolbar-retry {
    font-family: var(--font-mono);
    font-size: 11px;
    color: #ef4444;
    background: transparent;
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: var(--radius-pill);
    padding: 3px 10px;
    cursor: pointer;
    margin-left: 4px;
  }

  .toolbar-retry:hover {
    background: rgba(239, 68, 68, 0.06);
  }

  .edit-card {
    background: var(--surface);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-elevated);
    padding: 16px;
  }

  .edit-textarea {
    width: 100%;
    min-height: 400px;
    font-family: var(--font-mono);
    font-size: 14px;
    line-height: 1.75;
    background: transparent;
    border: none;
    outline: none;
    padding: 24px;
    resize: vertical;
    color: var(--text-primary);
    box-sizing: border-box;
  }

  .page-footer {
    text-align: center;
    margin-top: 44px;
    font-size: 12.5px;
    font-family: var(--font-mono, monospace);
    color: var(--text-tertiary, #999);
    letter-spacing: 0.01em;
  }

  .page-footer a {
    color: var(--text-tertiary, #999);
    text-decoration: none;
    transition: color 0.15s ease;
  }

  .page-footer a:hover {
    color: var(--text-secondary, #666);
  }

  .page-footer a:first-of-type {
    font-weight: 500;
  }

  .footer-sep {
    opacity: 0.5;
  }

  /* Reader_Doc.html — doc page footer (below .doc-article, not inside prose) */
  .doc-footer {
    width: 100%;
    margin-top: 0;
  }

  .doc-footer hr.doc-foot-rule {
    border: none;
    border-top: 1px solid var(--border);
    margin: 3.5rem 0;
  }

  .doc-footer .doc-foot-thanks {
    margin: 0;
    text-align: center;
    font-family: var(--font-serif);
    font-size: 1.0625rem;
    font-style: italic;
    font-weight: 400;
    color: var(--text-secondary);
    line-height: 1.55;
    max-width: 36em;
    margin-left: auto;
    margin-right: auto;
  }

  .doc-footer .doc-foot-row {
    margin-top: 5rem;
    padding-top: 2rem;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px 20px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-tertiary);
  }

  .doc-footer .doc-foot-cta {
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 14px;
    color: var(--text-secondary);
    text-align: center;
    flex: 1;
    min-width: min(100%, 16rem);
  }

  .doc-footer .doc-foot-cta a {
    color: var(--text-primary);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .doc-footer .doc-brand-mini {
    font-family: var(--font-display);
    font-size: 14px;
    letter-spacing: -0.02em;
    color: var(--text-secondary);
    text-decoration: none;
  }

  .doc-footer .doc-brand-mini:hover {
    color: var(--text-primary);
  }

  .doc-footer .doc-brand-mini em {
    font-style: italic;
  }

  .doc-footer .doc-foot-license {
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 11px;
    font-weight: 500;
  }

  /* ═══ Print ═══ */
  @media print {
    .page-wrapper {
      background: white !important;
      color: #111 !important;
      padding: 0 !important;
      min-height: auto !important;
    }

    .doc-layout {
      max-width: none;
      padding: 0;
    }

    .doc-article {
      box-shadow: none;
      border-radius: 0;
      padding: 0;
      background: none;
    }

    .doc-meta-url {
      color: #666;
    }
    .doc-hero-title {
      font-size: 36px;
    }
    .doc-layout {
      grid-template-columns: 1fr;
    }
    .doc-byline {
      color: #666;
    }

    .doc-actions,
    .outline-panel,
    .comments-panel,
    .history-panel-reader,
    .kanban-toolbar,
    .page-toolbar,
    .page-footer,
    .edit-card {
      display: none !important;
    }

    .doc-footer hr.doc-foot-rule {
      border-top-color: #ccc;
    }
    .doc-footer .doc-foot-thanks {
      color: #555;
    }
    .doc-footer .doc-foot-row {
      border-top-color: #ccc;
      color: #666;
    }
    .doc-footer .doc-foot-cta,
    .doc-footer .doc-brand-mini {
      color: #444;
    }
    .doc-footer .doc-foot-cta a {
      color: #111;
    }

    @page {
      margin: 0;
      size: A4;
    }
  }
</style>
