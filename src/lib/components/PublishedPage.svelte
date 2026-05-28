<script lang="ts">
  import { tick } from 'svelte';
  import { page as pageStore } from '$app/stores';
  import { afterNavigate } from '$app/navigation';
  import { browser } from '$app/environment';
  import DocView from '$lib/templates/doc/DocView.svelte';
  import KanbanView from '$lib/templates/kanban/KanbanView.svelte';
  import KanbanReaderHead from '$lib/templates/kanban/KanbanReaderHead.svelte';
  import ChangelogView from '$lib/templates/changelog/ChangelogView.svelte';
  import TimelineView from '$lib/templates/timeline/TimelineView.svelte';
  import SlidesView from '$lib/templates/slides/SlidesView.svelte';
  import DashboardView from '$lib/templates/dashboard/DashboardView.svelte';
  import type { PublishedPageData, Comment, PageTheme } from '$lib/types';
  import { marked } from 'marked';
  import { get } from 'svelte/store';
  import {
    closeDocCommentsPanel,
    closeReaderHistoryPanel,
    docCommentsPanelPageId,
    readerHistoryPanelOpen,
  } from '$lib/stores';
  import Panel from '$lib/components/comment/Panel.svelte';
  import AppearancePanel from '$lib/components/topbar/AppearancePanel.svelte';
  import {
    closeReaderAppearancePanel,
    kanbanReaderBoardFullwidth,
    readerThemePreview,
  } from '$lib/components/topbar';

  interface Props {
    data: PublishedPageData;
  }
  let { data }: Props = $props();

  let {
    page,
    canonicalPath,
    html,
    seoHtml,
    blocks,
    comments,
    frontmatter,
    isOwner,
    canEdit,
    canClaim,
  } = $derived(data);

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
  /** Snapshot source for Kanban when a history row is selected (doc HTML uses `readerHistoryPreviewHtml`). */
  let readerHistoryPreviewMarkdown = $state('');
  let readerHistoryPreviewTitle = $state<string | null>(null);
  let readerHistoryPreviewCreated = $state<string | null>(null);
  let readerHistoryVersionLoading = $state(false);
  let readerHistoryVersionLoadError = $state('');
  let historyRestoreLoading = $state(false);

  /** History rail: live tip selected (`null`) vs a numbered snapshot. */
  let readerHistoryIsLatestSelected = $derived(readerHistorySelectedVersion === null);

  let effectiveDocHtml = $derived.by(() => {
    if (page.view !== 'doc') return html;
    if (readerHistorySelectedVersion === null) return html;
    return readerHistoryPreviewHtml || html;
  });

  /** Kanban reader + doc “open as kanban”: live `page.markdown`, or selected version snapshot. */
  let effectiveKanbanMarkdown = $derived(
    readerHistorySelectedVersion !== null && readerHistoryPreviewMarkdown.length > 0
      ? readerHistoryPreviewMarkdown
      : page.markdown
  );

  /** Viewing a non-current snapshot: comments rail is read-only (owner and reader). */
  let docCommentsSnapshotReadonly = $derived(readerHistorySelectedVersion !== null);

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
      readerHistoryPreviewMarkdown = '';
      readerHistoryPreviewTitle = null;
      readerHistoryPreviewCreated = null;
      readerHistoryVersionLoading = false;
      return;
    }
    readerHistoryVersionLoading = true;
    readerHistorySelectedVersion = row.version;
    /* Keep prior snapshot (or live) in place until fetch completes — avoids main-column height snap. */
    try {
      const res = await fetch(`/api/pub/${page.id}/versions/${row.version}`);
      if (!res.ok) {
        readerHistoryVersionLoadError =
          res.status === 404 ? 'Snapshot not found.' : 'Could not load this snapshot.';
        readerHistorySelectedVersion = null;
        readerHistoryPreviewMarkdown = '';
        return;
      }
      const v = (await res.json()) as { markdown: string; title: string | null; created: string };
      readerHistoryPreviewMarkdown = v.markdown;
      const parsed = marked.parse(v.markdown);
      readerHistoryPreviewHtml = typeof parsed === 'string' ? parsed : await parsed;
      readerHistoryPreviewTitle = v.title ?? null;
      readerHistoryPreviewCreated = v.created ?? null;
    } catch {
      readerHistoryVersionLoadError = 'Could not load this snapshot.';
      readerHistorySelectedVersion = null;
      readerHistoryPreviewHtml = '';
      readerHistoryPreviewMarkdown = '';
    } finally {
      readerHistoryVersionLoading = false;
    }
  }

  /** Owner: persist selected snapshot as the live page (new version row). */
  async function restoreHistoryVersion() {
    if (!browser || !isOwner || readerHistorySelectedVersion === null) return;
    const md = readerHistoryPreviewMarkdown.trim();
    if (!md) return;
    const ok = window.confirm(
      'Replace the live page with this snapshot? You can open History again afterward if needed.'
    );
    if (!ok) return;
    historyRestoreLoading = true;
    try {
      const res = await fetch(`/api/pub/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: md }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const detail = await res.text().catch(() => '');
        window.alert(`Could not restore (${res.status})${detail ? ': ' + detail : ''}`);
      }
    } catch {
      window.alert('Network error — try again.');
    }
    historyRestoreLoading = false;
  }

  $effect(() => {
    if (!browser || !readerHistoryOpen) return;
    void page.id;
    void loadReaderVersions();
  });

  /** New published page — drop history list + in-article snapshot (closing the rail alone keeps the snapshot). */
  $effect(() => {
    void page.id;
    readerHistorySelectedVersion = null;
    readerHistoryPreviewHtml = '';
    readerHistoryPreviewMarkdown = '';
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
  let saveAsDocLoading = $state(false);
  let saveAsDocError = $state('');
  let saveAsKanbanLoading = $state(false);
  let saveAsKanbanError = $state('');

  let claiming = $state(false);
  let kanbanBoardFullwidth = $state(true);

  let effectiveTheme = $derived(($readerThemePreview ?? page.theme ?? 'default') as PageTheme);
  let themeWrapperDark = $derived(
    ['terminal', 'midnight', 'raycast', 'monokai', 'dracula'].includes(effectiveTheme)
  );

  let kanbanDocPeek = $derived(
    page.view === 'kanban' && $pageStore.url.searchParams.get('doc') === '1'
  );

  /** Doc reader: `?kanban=1` shows board parsed from the same markdown (Header “Open as kanban”). */
  let docKanbanPeek = $derived(
    page.view === 'doc' && $pageStore.url.searchParams.get('kanban') === '1'
  );

  let readerKanbanChrome = $derived(page.view === 'kanban' || docKanbanPeek);

  $effect(() => {
    if (!readerKanbanChrome) return;
    const unsub = kanbanReaderBoardFullwidth.subscribe((v) => {
      if (kanbanBoardFullwidth !== v) kanbanBoardFullwidth = v;
    });
    return unsub;
  });

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

  /** Kanban “Open as doc” preview: persist as doc view (same markdown). */
  async function saveAsDoc() {
    saveAsDocLoading = true;
    saveAsDocError = '';
    try {
      const res = await fetch(`/api/pub/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view: 'doc' }),
      });
      if (res.ok) {
        window.location.href = canonicalPath;
      } else {
        const detail = await res.text().catch(() => '');
        saveAsDocError = `Could not save (${res.status})${detail ? ': ' + detail : ''}`;
      }
    } catch {
      saveAsDocError = 'Network error — try again';
    }
    saveAsDocLoading = false;
  }

  /** Doc “Open as kanban” preview: persist as kanban view (same markdown). */
  async function saveAsKanban() {
    saveAsKanbanLoading = true;
    saveAsKanbanError = '';
    try {
      const res = await fetch(`/api/pub/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view: 'kanban' }),
      });
      if (res.ok) {
        window.location.href = canonicalPath;
      } else {
        const detail = await res.text().catch(() => '');
        saveAsKanbanError = `Could not save (${res.status})${detail ? ': ' + detail : ''}`;
      }
    } catch {
      saveAsKanbanError = 'Network error — try again';
    }
    saveAsKanbanLoading = false;
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

  const OUTLINE_VISIBLE_KEY = 'vibe-reader-outline-visible';
  const OUTLINE_WIDE_MQ = '(min-width: 1280px)';

  function readOutlineVisiblePref(): boolean {
    if (!browser) return true;
    const v = localStorage.getItem(OUTLINE_VISIBLE_KEY);
    return v !== '0' && v !== 'false';
  }

  /** Wide viewport: fixed left rail on/off (persisted). */
  let outlineEnabledWide = $state(true);
  /** Narrow viewport: overlay open only after user toggles (never auto-shown). */
  let outlineOpenNarrow = $state(false);
  let viewportWide = $state(false);

  $effect(() => {
    if (!browser) return;
    const mq = window.matchMedia(OUTLINE_WIDE_MQ);
    const sync = () => {
      const wide = mq.matches;
      if (viewportWide && !wide) {
        outlineOpenNarrow = false;
      }
      if (!viewportWide && wide) {
        outlineEnabledWide = readOutlineVisiblePref();
      }
      viewportWide = wide;
    };
    outlineEnabledWide = readOutlineVisiblePref();
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  });

  function setOutlineVisible(visible: boolean) {
    if (viewportWide) {
      outlineEnabledWide = visible;
      if (browser) localStorage.setItem(OUTLINE_VISIBLE_KEY, visible ? '1' : '0');
    } else {
      outlineOpenNarrow = visible;
    }
  }

  function toggleOutlineVisible() {
    if (viewportWide) {
      setOutlineVisible(!outlineEnabledWide);
    } else {
      outlineOpenNarrow = !outlineOpenNarrow;
    }
  }

  let outlineToggleActive = $derived(viewportWide ? outlineEnabledWide : outlineOpenNarrow);

  let showOutlinePanel = $derived(
    tocFromText.length > 0 && (viewportWide ? outlineEnabledWide : outlineOpenNarrow)
  );

  /** Local copy so posting from the panel updates DocView gutter counts without reload */
  let localComments = $state<Comment[]>([]);
  $effect(() => {
    localComments = [...(data.comments ?? [])];
  });

  $effect(() => {
    docCommentsPanelPageId.set(page.id);
  });

  afterNavigate(() => {
    closeDocCommentsPanel();
    closeReaderHistoryPanel();
  });

  $effect(() => {
    if (editing) closeDocCommentsPanel();
  });

  $effect(() => {
    if (!browser || !readerHistoryOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeReaderHistoryPanel();
        closeReaderAppearancePanel();
      }
    }
    function onDocClick(e: MouseEvent) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest('#reader-history-panel')) return;
      if (t.closest('.appearance-panel')) return;
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

  // Extract lede (first paragraph) from html for doc view header
  let lede = $derived.by(() => {
    if (page.view !== 'doc' && page.view !== undefined) return '';
    const src = page.view === 'doc' ? effectiveDocHtml : html;
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
      page.view === 'doc' &&
      readerHistorySelectedVersion !== null &&
      readerHistoryPreviewCreated
    ) {
      return formatDate(readerHistoryPreviewCreated);
    }
    return formatDate(page.updated);
  });
  let pageUrl = $derived($pageStore.url.href);

  /** Kanban reader hero (Reader_Kanban `page-head` + stats row) */
  let kanbanKickerText = $derived.by(() => {
    if (!readerKanbanChrome) return '';
    const k = frontmatter.kicker;
    if (typeof k === 'string' && k.trim()) return k.trim();
    const d = new Date(page.updated);
    if (Number.isNaN(d.getTime())) return 'kanban board';
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `roadmap · q${q} ${d.getFullYear()}`;
  });

  let kanbanTitleEmphasis = $derived(
    typeof frontmatter.title_emphasis === 'string' && frontmatter.title_emphasis.trim()
      ? frontmatter.title_emphasis.trim()
      : null
  );

  let kanbanLedeText = $derived.by(() => {
    if (!readerKanbanChrome) return '';
    const l = frontmatter.lede;
    const s = frontmatter.subtitle;
    if (typeof l === 'string' && l.trim()) return l.trim();
    if (typeof s === 'string' && s.trim()) return s.trim();
    const cols = data.kanbanData?.columns ?? [];
    const n = cols.reduce((a, c) => a + (c.cards?.length ?? 0), 0);
    return `The board in ${n} cards across ${cols.length} column${cols.length === 1 ? '' : 's'}. Readable by anyone — this page is the markdown.`;
  });

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

<div class="page-wrapper theme-{effectiveTheme}" class:dark={themeWrapperDark}>
  {#if page.view === 'kanban'}
    {#if kanbanDocPeek}
      <div class="kanban-doc-peek kanban-doc-peek--full-doc">
        <nav class="kanban-doc-peek-nav">
          <a class="kanban-doc-peek-back" href={canonicalPath}>← Back to board</a>
          {#if isOwner}
            <div class="kanban-doc-peek-nav-actions">
              <button
                type="button"
                class="toolbar-btn toolbar-save"
                onclick={saveAsDoc}
                disabled={saveAsDocLoading}
              >
                {saveAsDocLoading ? 'Saving…' : 'Save as doc'}
              </button>
              {#if saveAsDocError}
                <span class="kanban-doc-peek-save-error" role="alert">{saveAsDocError}</span>
              {/if}
            </div>
          {/if}
        </nav>
        <main class="kanban-doc-peek-main">
          <div class="kanban-doc-peek-body">
            <article class="prose kanban-doc-peek-article max-w-none">
              {@html seoHtml}
            </article>
          </div>
        </main>
        <footer class="kanban-article-foot" aria-label="Colophon">
          <p class="kanban-foot-inner">
            <a href="/" class="kanban-foot-brand">vibe.<em>pub</em></a>
            <span class="kanban-foot-lead">This is a live markdown file.</span>
            <a class="kanban-foot-source" href={`${canonicalPath}.md`}>See the source →</a>
            <span class="kanban-foot-meta">published · no login required</span>
          </p>
        </footer>
      </div>
    {:else}
      <!-- ═══ KANBAN LAYOUT: full width ═══ -->
      <div class="kanban-layout" class:board-fullwidth={kanbanBoardFullwidth}>
        {#if canClaim}
          <div class="kanban-toolbar">
            <button class="toolbar-btn" onclick={claimPage} disabled={claiming}
              >{claiming ? 'Claiming...' : 'Claim this page'}</button
            >
            <span class="toolbar-hint">Claim to enable editing</span>
          </div>
        {/if}

        <KanbanReaderHead
          boardFullwidth={kanbanBoardFullwidth}
          kicker={kanbanKickerText}
          title={pageTitle}
          titleEmphasis={kanbanTitleEmphasis}
          lede={kanbanLedeText}
        />

        <div class="kanban-board-wrapper">
          <KanbanView
            boardFullwidth={kanbanBoardFullwidth}
            markdown={effectiveKanbanMarkdown}
            pageId={page.id}
            {comments}
            initialColumns={data.kanbanData?.columns ?? []}
            initialLabels={data.kanbanData?.labels ?? {}}
            {isOwner}
          />
        </div>

        <footer class="kanban-article-foot" aria-label="Colophon">
          <p class="kanban-foot-inner">
            <a href="/" class="kanban-foot-brand">vibe.<em>pub</em></a>
            <span class="kanban-foot-lead">This is a live markdown file.</span>
            <a class="kanban-foot-source" href={`${canonicalPath}.md`}>See the source →</a>
            <span class="kanban-foot-meta">published · no login required</span>
          </p>
        </footer>
      </div>
    {/if}
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
  {:else if docKanbanPeek}
    <div class="kanban-doc-peek kanban-doc-peek--full-board">
      <nav class="kanban-doc-peek-nav">
        <a class="kanban-doc-peek-back" href={canonicalPath}>← Back to doc</a>
        {#if isOwner}
          <div class="kanban-doc-peek-nav-actions">
            <button
              type="button"
              class="toolbar-btn toolbar-save"
              onclick={saveAsKanban}
              disabled={saveAsKanbanLoading}
            >
              {saveAsKanbanLoading ? 'Saving…' : 'Save as kanban'}
            </button>
            {#if saveAsKanbanError}
              <span class="kanban-doc-peek-save-error" role="alert">{saveAsKanbanError}</span>
            {/if}
          </div>
        {/if}
      </nav>
      <div class="kanban-layout" class:board-fullwidth={kanbanBoardFullwidth}>
        {#if canClaim}
          <div class="kanban-toolbar">
            <button class="toolbar-btn" onclick={claimPage} disabled={claiming}
              >{claiming ? 'Claiming...' : 'Claim this page'}</button
            >
            <span class="toolbar-hint">Claim to enable editing</span>
          </div>
        {/if}

        <KanbanReaderHead
          boardFullwidth={kanbanBoardFullwidth}
          kicker={kanbanKickerText}
          title={pageTitle}
          titleEmphasis={kanbanTitleEmphasis}
          lede={kanbanLedeText}
        />

        <div class="kanban-board-wrapper">
          <KanbanView
            boardFullwidth={kanbanBoardFullwidth}
            markdown={effectiveKanbanMarkdown}
            pageId={page.id}
            {comments}
            initialColumns={data.kanbanData?.columns ?? []}
            initialLabels={data.kanbanData?.labels ?? {}}
            {isOwner}
          />
        </div>

        <footer class="kanban-article-foot" aria-label="Colophon">
          <p class="kanban-foot-inner">
            <a href="/" class="kanban-foot-brand">vibe.<em>pub</em></a>
            <span class="kanban-foot-lead">This is a live markdown file.</span>
            <a class="kanban-foot-source" href={`${canonicalPath}.md`}>See the source →</a>
            <span class="kanban-foot-meta">published · no login required</span>
          </p>
        </footer>
      </div>
    </div>
  {:else}
    <!-- ═══ DOC LAYOUT ═══ -->
    <div class="doc-layout">
      <main class="doc-main">
        <!-- Floating outline panel -->
        {#if showOutlinePanel}
          <div class="outline-panel">
            <div class="outline-header">
              <span class="outline-label">Outline</span>
              <button
                type="button"
                class="outline-close"
                onclick={() => setOutlineVisible(false)}
                aria-label="Hide outline"
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
        {#if canEdit}
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
              {#if tocFromText.length > 0}
                <span class="doc-byline-dot"></span>
                <button
                  type="button"
                  class="meta-outline-btn"
                  class:active={outlineToggleActive}
                  onclick={toggleOutlineVisible}
                  aria-pressed={outlineToggleActive}
                  aria-label={outlineToggleActive ? 'Hide outline' : 'Show outline'}
                  title={outlineToggleActive ? 'Hide outline' : 'Show outline'}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    aria-hidden="true"><path d="M4 6h16M4 12h10M4 18h13" /></svg
                  >
                  <span class="meta-outline-btn-text"
                    >{outlineToggleActive ? 'Hide outline' : 'Show outline'}</span
                  >
                </button>
              {/if}
            </div>
          </header>

          <article class="doc-article" use:docActions={effectiveDocHtml}>
            {#if readerHistoryVersionLoadError}
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

    <Panel
      pageId={page.id}
      docHtml={effectiveDocHtml}
      bind:comments={localComments}
      slugifyHeading={slugifyHeadingText}
      enableBlockRevise={canEdit}
      snapshotReadonly={docCommentsSnapshotReadonly}
      hidden={editing}
    />
  {/if}

  <aside
    id="reader-history-panel"
    class="history-panel-reader"
    class:open={readerHistoryOpen}
    aria-hidden={!readerHistoryOpen}
  >
    <div class="history-panel-head rail-head">
      <div class="history-kicker">version history</div>
      <div class="history-panel-head-row2">
        <h2 class="history-panel-title">Previous <em>versions</em></h2>
        <div class="history-panel-head-r">
          {#if isOwner}
            {@const historyRestoreReady =
              !readerHistoryIsLatestSelected &&
              !readerHistoryVersionLoading &&
              readerHistoryPreviewMarkdown.trim().length > 0}
            <button
              type="button"
              class="history-panel-restore"
              class:history-panel-restore--latest={readerHistoryIsLatestSelected}
              disabled={!historyRestoreReady ||
                historyRestoreLoading ||
                readerVersions.length === 0}
              onclick={() => void restoreHistoryVersion()}
            >
              {#if readerHistoryIsLatestSelected}
                the latest version
              {:else}
                restore this version
              {/if}
            </button>
          {/if}
          <button
            type="button"
            class="history-panel-close"
            aria-label="Close history"
            onclick={() => closeReaderHistoryPanel()}
          >
            ✕
          </button>
        </div>
      </div>
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

  <AppearancePanel publishedTheme={page.theme} />
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

  /* ═══ KANBAN LAYOUT ═══
     Matches Reader_Kanban: flex column fills viewport; board scrolls inside. */
  .kanban-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    padding: 0;
    max-width: 100%;
  }

  .kanban-toolbar {
    max-width: none;
    margin: 0;
    padding: 16px 22px 0;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  @media (min-width: 901px) {
    .kanban-toolbar {
      padding-left: 32px;
      padding-right: 32px;
    }
  }

  .kanban-board-wrapper {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    width: 100%;
    overflow: hidden;
  }

  .kanban-layout.board-fullwidth .kanban-board-wrapper {
    max-width: none;
  }

  /* Kanban: “Open as doc” — prose preview of same markdown (seo body) */
  .kanban-doc-peek {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    max-width: 720px;
    margin: 0 auto;
    padding: 0 24px 80px;
    box-sizing: border-box;
  }

  .kanban-doc-peek-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px 16px;
    padding: 16px 0 8px;
    flex-shrink: 0;
  }

  .kanban-doc-peek-nav-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 12px;
  }

  .kanban-doc-peek-save-error {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--danger, #b91c1c);
    max-width: 280px;
  }

  :global(.dark) .kanban-doc-peek-save-error {
    color: var(--danger, #fca5a5);
  }

  .kanban-doc-peek-back {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-secondary);
    text-decoration: none;
  }

  .kanban-doc-peek-back:hover {
    color: var(--text-primary);
    text-decoration: underline;
  }

  .kanban-doc-peek-main {
    flex: 1 1 auto;
  }

  .kanban-doc-peek-article {
    padding-bottom: 32px;
  }

  .kanban-doc-peek-article :global(th) {
    color: var(--text-secondary);
  }

  .kanban-doc-peek-article :global(td),
  .kanban-doc-peek-article :global(p),
  .kanban-doc-peek-article :global(li) {
    color: var(--text-primary);
  }

  /* Doc “Open as kanban”: full-width board (same as native kanban). */
  .kanban-doc-peek--full-board {
    max-width: none;
    width: 100%;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  .kanban-doc-peek--full-board .kanban-doc-peek-nav {
    padding-left: 22px;
    padding-right: 22px;
  }

  @media (min-width: 901px) {
    .kanban-doc-peek--full-board .kanban-doc-peek-nav {
      padding-left: 32px;
      padding-right: 32px;
    }
  }

  /* Kanban “Open as doc”: full-width shell + 680px prose column (same measure as Reader `.doc-main`). */
  .kanban-doc-peek--full-doc {
    max-width: none;
    width: 100%;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  .kanban-doc-peek--full-doc .kanban-doc-peek-nav {
    padding-left: 22px;
    padding-right: 22px;
  }

  @media (min-width: 901px) {
    .kanban-doc-peek--full-doc .kanban-doc-peek-nav {
      padding-left: 32px;
      padding-right: 32px;
    }
  }

  .kanban-doc-peek--full-doc .kanban-doc-peek-main {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 32px 120px;
    box-sizing: border-box;
  }

  @media (max-width: 900px) {
    .kanban-doc-peek--full-doc .kanban-doc-peek-main {
      padding-left: 22px;
      padding-right: 22px;
    }
  }

  .kanban-doc-peek--full-doc .kanban-doc-peek-body {
    max-width: 680px;
    margin-left: auto;
    margin-right: auto;
  }

  .kanban-doc-peek--full-doc .kanban-article-foot {
    max-width: 1280px;
    margin-left: auto;
    margin-right: auto;
    padding-left: 32px;
    padding-right: 32px;
    box-sizing: border-box;
  }

  @media (max-width: 900px) {
    .kanban-doc-peek--full-doc .kanban-article-foot {
      padding-left: 22px;
      padding-right: 22px;
    }
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

  /* Reader_Doc.html — .meta-outline-btn in byline */
  .meta-outline-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    padding: 4px 8px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-tertiary);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.02em;
    cursor: pointer;
    opacity: 0.65;
    transition:
      opacity 140ms ease,
      background 140ms ease,
      color 140ms ease;
  }

  .meta-outline-btn svg {
    flex-shrink: 0;
  }

  .meta-outline-btn:hover {
    opacity: 1;
    color: var(--text-primary);
    background: rgba(0, 0, 0, 0.04);
  }

  :global(.dark) .meta-outline-btn:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .meta-outline-btn.active {
    opacity: 1;
    color: var(--text-primary);
  }

  .meta-outline-btn-text {
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
    font-size: var(--reader-lede-size);
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

  /* Unlayered: same cascade reason as DocView — paragraph rule above would otherwise keep 22px bottom on `blockquote > p`. */
  .doc-article :global(.doc-view blockquote > *) {
    margin: 0;
  }

  .doc-article :global(.doc-view blockquote > * + *) {
    margin-top: 0.65em;
  }

  .doc-article :global(.doc-view pre) {
    padding: 18px 22px;
    border-radius: 10px;
    font-family: var(--font-mono);
    font-size: 13.5px;
    line-height: 1.7;
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
      font-size: 17px;
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
      font-size: 18px;
    }
  }

  @media (min-width: 1280px) {
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
