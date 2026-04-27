<script lang="ts">
  import { page as pageStore } from '$app/stores';
  import { browser } from '$app/environment';
  import DocView from '$lib/templates/doc/DocView.svelte';
  import KanbanView from '$lib/templates/kanban/KanbanView.svelte';
  import ChangelogView from '$lib/templates/changelog/ChangelogView.svelte';
  import TimelineView from '$lib/templates/timeline/TimelineView.svelte';
  import SlidesView from '$lib/templates/slides/SlidesView.svelte';
  import DashboardView from '$lib/templates/dashboard/DashboardView.svelte';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }
  let { data }: Props = $props();

  let { page, html, blocks, comments, frontmatter } = $derived(data);

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

  // Outline panel
  let showToc = $state(false);

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
</svelte:head>

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
              <span>Outline</span>
              <button class="outline-close" onclick={() => (showToc = false)}>
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
          <!-- Article header: kicker, title, byline, lede -->
          <header class="doc-header">
            <div class="doc-kicker">
              <span>{(page.view ?? 'doc').toUpperCase()}</span>
              <span
                >{new Date(page.created)
                  .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                  .toUpperCase()}</span
              >
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
            <DocView {html} title={null} {comments} pageId={page.id} />
          </article>
        {/if}

        <footer class="doc-footer">
          <a href="/" class="footer-wordmark">vibe.<em>pub</em></a>
          <span class="footer-desc">publish from the command line</span>
        </footer>
      </main>

      <!-- Comment rail -->
      <aside class="doc-rail">
        <div class="rail-head">
          <span class="rail-h">Threads · {comments.length}</span>
        </div>
        {#if comments.length === 0}
          <div class="empty-rail">
            <div class="empty-rail-h">No <em>comments</em> yet.</div>
            <div class="empty-rail-c">
              Click any block to leave a comment. The agent will read it.
            </div>
          </div>
        {:else}
          {#each comments as comment}
            <div class="rail-thread">
              <div class="rail-thread-meta">
                {comment.resolved ? '✓ resolved' : '● open'} · {comment.display_name || 'anonymous'}
              </div>
              <div class="rail-thread-body">
                {comment.body.slice(0, 80)}{comment.body.length > 80 ? '...' : ''}
              </div>
            </div>
          {/each}
        {/if}
      </aside>
    </div>
  {/if}
</div>

<style>
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

  /* ═══ DOC LAYOUT ═══ */
  .doc-layout {
    display: grid;
    grid-template-columns: 1fr minmax(auto, 320px);
    max-width: 1200px;
    margin: 0 auto;
    gap: 40px;
    padding: 48px 40px 120px;
    position: relative;
  }

  /* ── Doc main column ── */
  .doc-main {
    min-width: 0;
    width: 100%;
    max-width: 640px;
    margin: 0 auto;
  }

  /* ── Article header ── */
  .doc-header {
    margin-bottom: 48px;
  }

  .doc-kicker {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-tertiary);
    text-align: center;
    margin-bottom: 20px;
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .doc-kicker span {
    display: inline-block;
  }

  .doc-kicker span + span::before {
    content: '\00b7';
    margin-right: 8px;
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

  /* ── Doc actions ── */
  .doc-actions {
    position: fixed;
    left: max(16px, calc(50% - 580px));
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 30;
  }

  /* ── Outline ── */
  .outline-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    opacity: 0.45;
    transition:
      opacity 150ms,
      color 150ms;
  }

  .outline-toggle:hover {
    opacity: 0.8;
    color: var(--text-primary);
  }
  .outline-toggle.active {
    opacity: 0.6;
    color: var(--text-secondary);
  }

  .outline-panel {
    position: fixed;
    right: calc(50% + 580px);
    top: 50%;
    transform: translateY(-50%);
    width: 180px;
    max-height: calc(100vh - 140px);
    overflow-y: auto;
    z-index: 29;
    padding: 4px 0;
    text-align: right;
  }

  .outline-header {
    display: none;
  }
  .outline-close {
    display: none;
  }
  .outline-nav {
    padding: 0;
  }

  .outline-link {
    display: block;
    font-size: 12px;
    color: var(--text-tertiary);
    text-decoration: none;
    padding: 3px 8px;
    line-height: 1.4;
    transition: color 150ms;
  }

  .outline-link:hover {
    color: var(--text-secondary);
  }
  .outline-link.outline-active {
    color: var(--text-primary);
  }
  .outline-link.outline-h3 {
    padding-left: 18px;
    font-size: 11px;
  }

  /* ── Comment rail ── */
  .doc-rail {
    position: sticky;
    top: 96px;
    align-self: start;
    max-height: calc(100vh - 140px);
    overflow-y: auto;
  }

  .rail-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 18px;
  }

  .rail-h {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
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

  .rail-thread {
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
  }

  .rail-thread-meta {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-tertiary);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .rail-thread-body {
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 13px;
    line-height: 1.4;
    color: var(--text-secondary);
  }

  /* ═══ Responsive ═══ */
  @media (max-width: 959px) {
    .doc-layout {
      grid-template-columns: 1fr;
      max-width: 640px;
      padding: 24px 20px 80px;
    }
    .doc-rail {
      display: none;
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
    .doc-actions {
      display: none;
    }
    .outline-panel {
      display: none;
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

  @media (max-width: 1279px) {
    .doc-actions {
      display: none;
    }
    .outline-panel {
      display: none;
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

  .toolbar-cancel {
    /* uses base .toolbar-btn styles */
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

    .doc-kicker {
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
    .doc-rail,
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
