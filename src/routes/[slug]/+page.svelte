<script lang="ts">
  import { page as pageStore } from '$app/stores';
  import { afterNavigate } from '$app/navigation';
  import { browser } from '$app/environment';
  import DocView from '$lib/templates/doc/DocView.svelte';
  import KanbanView from '$lib/templates/kanban/KanbanView.svelte';
  import ChangelogView from '$lib/templates/changelog/ChangelogView.svelte';
  import TimelineView from '$lib/templates/timeline/TimelineView.svelte';
  import SlidesView from '$lib/templates/slides/SlidesView.svelte';
  import DashboardView from '$lib/templates/dashboard/DashboardView.svelte';
  import type { PageData } from './$types';
  import type { Comment } from '$lib/types';
  import {
    docCommentsPanelBlockId,
    docCommentsPanelOpen,
    closeDocCommentsPanel,
  } from '$lib/stores';

  interface Props {
    data: PageData;
  }
  let { data }: Props = $props();

  let { page, html, seoHtml, blocks, comments, frontmatter } = $derived(data);

  // Edit state
  let editing = $state(false);
  let editMarkdown = $state('');
  let saving = $state(false);
  let saveError = $state('');

  // Owner: only the authenticated creator can edit. Anonymous pages are read-only (login to claim).
  let isOwner = $derived(!!page.user_id && page.user_id === data.user?.id);
  // Logged-in user viewing an anonymous (unclaimed) page
  let canClaim = $derived(!page.user_id && !!data.user);
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

  let toc = $derived.by((): TocItem[] => {
    if (
      page.view === 'kanban' ||
      page.view === 'changelog' ||
      page.view === 'timeline' ||
      page.view === 'slides' ||
      page.view === 'dashboard' ||
      !html
    )
      return [];
    const items: TocItem[] = [];
    const regex = /<h([2-3])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h[2-3]>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      items.push({
        level: parseInt(match[1]),
        id: match[2],
        text: match[3].replace(/<[^>]*>/g, ''),
      });
    }
    return items;
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
      !html
    )
      return toc;
    const items: TocItem[] = [];
    const regex = /<h([2-3])[^>]*>(.*?)<\/h[2-3]>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const text = match[2].replace(/<[^>]*>/g, '');
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      items.push({ level: parseInt(match[1]), id, text });
    }
    return items;
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

  $effect(() => {
    if (!commentsPanelOpen) panelNewBody = '';
  });

  let panelCommentsFiltered = $derived.by((): Comment[] => {
    const bid = panelBlockId;
    if (!bid) return localComments;
    return localComments.filter((c) => commentAnchoredToBlock(c, bid));
  });

  function commentAnchoredToBlock(c: Comment, blockId: string): boolean {
    if (!c.anchor) return false;
    try {
      const a = typeof c.anchor === 'string' ? JSON.parse(c.anchor) : c.anchor;
      return a?.type === 'block' && a?.block_id === blockId;
    } catch {
      return false;
    }
  }

  async function postPanelBlockComment() {
    if (!panelBlockId || !panelNewBody.trim()) return;
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
        const saved = await res.json().catch(() => null);
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

  afterNavigate(() => {
    closeDocCommentsPanel();
  });

  $effect(() => {
    if (editing) closeDocCommentsPanel();
  });

  $effect(() => {
    if (!browser || !commentsPanelOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDocCommentsPanel();
    }
    /** Close when clicking outside the panel (same gesture must finish — use click, not pointerdown). */
    function onDocClick(e: MouseEvent) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest('#comments-panel')) return;
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

  // Extract lede (first paragraph) from html for doc view header
  let lede = $derived.by(() => {
    if (page.view !== 'doc' && page.view !== undefined) return '';
    if (!html) return '';
    const match = html.match(/<p[^>]*>(.*?)<\/p>/s);
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

  let pageTitle = $derived(page.title ?? page.slug);
  let pageUrl = $derived($pageStore.url.href);

  // Scroll spy for TOC
  function setupScrollSpy(node: HTMLElement) {
    if (!browser) return;
    const headings = node.querySelectorAll('h2[id], h3[id]');
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeTocId = entry.target.id;
          }
        }
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

  // Add IDs to headings if they don't have them
  function addHeadingIds(node: HTMLElement) {
    const headings = node.querySelectorAll('h2, h3');
    headings.forEach((h) => {
      if (!h.id) {
        h.id = (h.textContent ?? '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
    });
  }

  function docActions(node: HTMLElement) {
    addHeadingIds(node);
    return setupScrollSpy(node) ?? { destroy() {} };
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
  <meta property="og:image" content={`${$pageStore.url.origin}/og/${page.slug}`} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={pageTitle} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={`${$pageStore.url.origin}/og/${page.slug}`} />
  <link
    rel="alternate"
    type="text/markdown"
    href={`${$pageStore.url.origin}/${page.slug}.md`}
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
        Source markdown: <a href={`/${page.slug}.md`}>/{page.slug}.md</a>
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
              {#each tocFromText as item}
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
            <h1 class="doc-hero-title">{pageTitle}</h1>
            <div class="doc-byline">
              {#if page.user_id}
                <b>@{data.pageUser?.username ?? 'anonymous'}</b>
                <span class="doc-byline-dot"></span>
              {/if}
              <span>{formatDate(page.updated)}</span>
              <span class="doc-byline-dot"></span>
              <span>{readTime}</span>
            </div>
            {#if lede}
              <p class="doc-lede">{lede}</p>
            {/if}
          </header>

          <article class="doc-article" use:docActions>
            <DocView bind:comments={localComments} {html} title={null} pageId={page.id} />
          </article>
        {/if}

        <footer class="doc-footer">
          <a href="/" class="footer-wordmark">vibe.<em>pub</em></a>
          <span class="footer-desc">publish from the command line</span>
        </footer>
      </main>
    </div>

    {#if !editing}
      <aside
        class="comments-panel"
        class:open={commentsPanelOpen}
        id="comments-panel"
        aria-hidden={!commentsPanelOpen}
      >
        <div class="rail-head comments-panel-head">
          <span class="rail-h">
            {#if panelBlockId}
              thread · {panelCommentsFiltered.length}{panelCommentsFiltered.length === 1
                ? ' reply'
                : ' replies'}
            {:else}
              comments · {localComments.length}
            {/if}
          </span>
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
              <div class="empty-rail-c">Write one below — the agent will read it.</div>
            </div>
          {:else if !panelBlockId && localComments.length === 0}
            <div class="empty-rail">
              <div class="empty-rail-h">No <em>comments</em> yet.</div>
              <div class="empty-rail-c">
                Click any block to leave a comment. The agent will read it.
              </div>
            </div>
          {:else}
            <div class="cp-list">
              {#each panelCommentsFiltered as comment (comment.id)}
                <article class="cp-comment">
                  <div class="cp-comment-card">
                    <div class="cp-top">
                      <div class="cp-avatar" aria-hidden="true">
                        {commentAvatarLetter(comment.display_name)}
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
                    <p class="cp-body">{comment.body}</p>
                  </div>
                </article>
              {/each}
            </div>
          {/if}
        </div>
        {#if panelBlockId}
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

  /* ── Article header ── */
  .doc-header {
    margin-bottom: 48px;
  }

  .doc-meta-url {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 20px;
    text-align: center;
    word-break: break-all;
  }

  .doc-hero-title {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: clamp(42px, 5vw, 64px);
    line-height: 1.02;
    letter-spacing: -0.035em;
    text-align: center;
    margin: 0 0 20px;
    color: var(--text-primary);
    text-wrap: balance;
  }

  .doc-byline {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-tertiary);
    margin-bottom: 48px;
    flex-wrap: nowrap;
  }

  .doc-byline > * {
    white-space: nowrap;
  }

  .doc-byline-dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--text-tertiary);
    flex-shrink: 0;
  }

  .doc-lede {
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 22px;
    line-height: 1.45;
    color: var(--text-secondary);
    text-align: center;
    margin: 0 auto 48px;
    max-width: 520px;
    text-wrap: pretty;
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
    background: var(--text-primary);
    color: var(--bg);
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

  .doc-article :global(.doc-view pre code) {
    background: transparent;
    color: inherit;
  }

  .doc-article :global(.doc-view blockquote) {
    margin: 24px 0;
    padding: 8px 0 8px 24px;
    border-left: 2px solid var(--text-primary);
    font-style: italic;
    color: var(--text-secondary);
    font-family: var(--font-serif);
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

  .comments-panel-head.rail-head {
    align-items: center;
  }

  /* Reader — .thread-head */
  .comments-panel-head {
    position: sticky;
    top: 0;
    flex-shrink: 0;
    margin: 0;
    padding: 20px 24px 14px;
    background: var(--bg);
    z-index: 1;
  }

  .comments-panel-head.rail-head {
    margin-bottom: 0;
  }

  /* Reader — .thread-body */
  .comments-panel-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 16px 24px 20px;
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
    padding: 14px 24px 20px;
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
      justify-content: center;
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

  /* Doc view footer (L3 design: wordmark + description) */
  .doc-footer {
    text-align: center;
    margin-top: 64px;
    padding-top: 32px;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .doc-footer a {
    text-decoration: none;
    transition: color 0.15s ease;
  }

  .footer-wordmark {
    font-family: var(--font-display);
    font-size: 18px;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    font-weight: 400;
  }

  .footer-wordmark :global(em) {
    font-style: italic;
  }

  .footer-desc {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
    letter-spacing: 0.02em;
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
    .kanban-toolbar,
    .page-toolbar,
    .page-footer,
    .doc-footer,
    .edit-card {
      display: none !important;
    }

    @page {
      margin: 0;
      size: A4;
    }
  }
</style>
