<script lang="ts">
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }
  let { data }: Props = $props();

  let { profileUser, pages, collections, isOwner, commentCounts } = $derived(data);

  // New collection form state
  let showNewCollection = $state(false);
  let newCollTitle = $state('');
  let newCollSlug = $state('');
  let newCollCreating = $state(false);

  // Sidebar filter state
  let activeFilter = $state<'all' | 'live' | 'drafts' | 'archived'>('all');
  let sourceFilter = $state<'all' | 'agent' | 'manual'>('all');

  function autoSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40);
  }

  async function createCollection() {
    if (!newCollTitle.trim()) return;
    newCollCreating = true;
    const slug = newCollSlug.trim() || autoSlug(newCollTitle);
    try {
      const res = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newCollTitle.trim(), slug, page_slugs: [] }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch {}
    newCollCreating = false;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function relativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(dateStr);
  }

  // Determine if a page was likely agent-published (heuristic: no title usually means CLI/agent)
  // In reality this should come from a `source` column; for now use a simple heuristic
  function isAgentPublished(page: (typeof pages)[0]): boolean {
    // Pages created via CLI/MCP typically have workspace_id set or specific patterns
    // For now, treat pages with workspace_id as agent-published
    return page.workspace_id !== null;
  }

  function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function getDateLabel(): string {
    const now = new Date();
    const month = now.toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
    const day = now.getDate();
    const liveCount = pages.filter((p) => p.access === 'public').length;
    return `${month} ${day} · ${liveCount} page${liveCount !== 1 ? 's' : ''} live`;
  }

  // Computed counts
  let counts = $derived({
    all: pages.length,
    live: pages.filter((p) => p.access === 'public').length,
    drafts: pages.filter((p) => p.access === 'private').length,
    archived: 0, // no archive status yet, placeholder
    agent: pages.filter((p) => isAgentPublished(p)).length,
    manual: pages.filter((p) => !isAgentPublished(p)).length,
  });

  // Filtered pages
  let filteredPages = $derived.by(() => {
    let result = pages;

    // Status filter
    if (activeFilter === 'live') {
      result = result.filter((p) => p.access === 'public');
    } else if (activeFilter === 'drafts') {
      result = result.filter((p) => p.access === 'private');
    }
    // 'archived' and 'all' show everything for now

    // Source filter
    if (sourceFilter === 'agent') {
      result = result.filter((p) => isAgentPublished(p));
    } else if (sourceFilter === 'manual') {
      result = result.filter((p) => !isAgentPublished(p));
    }

    return result;
  });

  // Aggregate stats
  let totalComments = $derived(
    Object.values(commentCounts ?? {}).reduce((sum, c) => sum + c.unresolved, 0)
  );
  let agentPublishCount = $derived(counts.agent);

  const viewBadgeStyle: Record<string, { bg: string; color: string }> = {
    doc: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa' },
    kanban: { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa' },
    changelog: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24' },
  };

  const accessBadgeStyle: Record<string, { bg: string; color: string }> = {
    public: { bg: 'rgba(34,197,94,0.12)', color: '#4ade80' },
    unlisted: { bg: 'var(--surface-hover)', color: 'var(--text-tertiary)' },
    private: { bg: 'rgba(239,68,68,0.12)', color: '#f87171' },
  };

  function getStatusLabel(access: string): string {
    if (access === 'public') return 'live';
    if (access === 'unlisted') return 'unlisted';
    return 'draft';
  }

  function getStatusClass(access: string): string {
    if (access === 'public') return 'live';
    return '';
  }
</script>

<svelte:head>
  <title>@{profileUser.username} — vibe.pub</title>
</svelte:head>

{#if isOwner}
  <!-- ═══ OWNER DASHBOARD (two-column layout) ═══ -->
  <div class="dash animate-fade-in-up">
    <!-- LEFT SIDEBAR -->
    <aside class="nav">
      <h1 class="nav-greet">
        {getGreeting()},<br /><span class="nav-greet-user">@{profileUser.username}</span>
      </h1>
      <div class="nav-sub">{getDateLabel()}</div>

      <a href="/new" class="nav-new">
        <span>+</span> New page <span class="kbd">N</span>
      </a>

      <div class="nav-h">Pages</div>
      <button
        class="nav-item"
        class:active={activeFilter === 'all'}
        onclick={() => (activeFilter = 'all')}>All <span class="n">{counts.all}</span></button
      >
      <button
        class="nav-item"
        class:active={activeFilter === 'live'}
        onclick={() => (activeFilter = 'live')}>Live <span class="n">{counts.live}</span></button
      >
      <button
        class="nav-item"
        class:active={activeFilter === 'drafts'}
        onclick={() => (activeFilter = 'drafts')}
        >Drafts <span class="n">{counts.drafts}</span></button
      >
      <button
        class="nav-item"
        class:active={activeFilter === 'archived'}
        onclick={() => (activeFilter = 'archived')}
        >Archived <span class="n">{counts.archived}</span></button
      >

      <div class="nav-h">By source</div>
      <button
        class="nav-item"
        class:active={sourceFilter === 'agent'}
        onclick={() => (sourceFilter = sourceFilter === 'agent' ? 'all' : 'agent')}
        >&#x2726; Agent-published <span class="n">{counts.agent}</span></button
      >
      <button
        class="nav-item"
        class:active={sourceFilter === 'manual'}
        onclick={() => (sourceFilter = sourceFilter === 'manual' ? 'all' : 'manual')}
        >&#x25C7; Manual <span class="n">{counts.manual}</span></button
      >

      <div class="nav-h">Tools</div>
      <button class="nav-item" onclick={() => (showNewCollection = !showNewCollection)}
        >+ Collection</button
      >
    </aside>

    <!-- MAIN COLUMN -->
    <main class="main-col">
      <div class="main-head">
        <h1 class="main-h1">Your <em>pages</em></h1>
        <span class="main-meta">@{profileUser.username}</span>
      </div>

      <!-- Stats strip -->
      <div class="stats">
        <div class="stat">
          <div class="stat-n">{counts.all}</div>
          <div class="stat-lbl">Total pages</div>
        </div>
        <div class="stat">
          <div class="stat-n">{counts.live}</div>
          <div class="stat-lbl">Live</div>
        </div>
        <div class="stat">
          <div class="stat-n">{totalComments}</div>
          <div class="stat-lbl">Open threads</div>
        </div>
        <div class="stat">
          <div class="stat-n">{agentPublishCount}</div>
          <div class="stat-lbl">Agent publishes</div>
        </div>
      </div>

      <!-- New collection form (inline) -->
      {#if showNewCollection}
        <div class="new-coll-form">
          <input
            class="new-coll-input"
            type="text"
            placeholder="Collection title"
            bind:value={newCollTitle}
            oninput={() => (newCollSlug = autoSlug(newCollTitle))}
            onkeydown={(e) => {
              if (e.key === 'Enter') createCollection();
              if (e.key === 'Escape') showNewCollection = false;
            }}
          />
          <span class="new-coll-slug">/{newCollSlug || '...'}</span>
          <div class="new-coll-actions">
            <button
              class="btn-create"
              type="button"
              onclick={createCollection}
              disabled={newCollCreating || !newCollTitle.trim()}
            >
              {newCollCreating ? 'Creating...' : 'Create'}
            </button>
            <button class="btn-cancel" type="button" onclick={() => (showNewCollection = false)}
              >Cancel</button
            >
          </div>
        </div>
      {/if}

      <!-- Collections section -->
      {#if collections.length > 0}
        <h3 class="sec-h">Collections</h3>
        <div class="collections-list">
          {#each collections as coll}
            <a href={`/c/${coll.slug}`} class="coll-row">
              <span class="coll-title">{coll.title}</span>
              <span class="coll-slug">/{coll.slug}</span>
              <span class="coll-access badge-{coll.access}">{coll.access}</span>
            </a>
          {/each}
        </div>
      {/if}

      <!-- Pages list -->
      {#if filteredPages.length > 0}
        <h3 class="sec-h">
          {#if activeFilter === 'all'}Recent pages{:else if activeFilter === 'live'}Live pages{:else if activeFilter === 'drafts'}Drafts{:else}Archived{/if}
          {#if filteredPages.length !== pages.length}
            <span class="sec-h-count">{filteredPages.length} of {pages.length}</span>
          {/if}
        </h3>
        <div class="pages">
          {#each filteredPages as page}
            {@const cc = commentCounts?.[page.id]}
            {@const isAgent = isAgentPublished(page)}
            <a href={`/@${profileUser.username}/${page.slug}`} class="page-row">
              <span
                class="src"
                class:agent={isAgent}
                title={isAgent ? 'Agent-published' : 'Manual'}
              >
                {isAgent ? '\u2726' : '\u25C7'}
              </span>
              <div class="title-col">
                <h4>{page.title || page.slug}</h4>
                <span class="slug"
                  >vibe.pub/@{profileUser.username}/{page.slug}<span class="open">&nearr;</span
                  ></span
                >
              </div>
              <span class="meta-col">{relativeTime(page.updated)}</span>
              <span class="num-col" class:has-new={cc && cc.unresolved > 0}>
                {#if cc && cc.total > 0}
                  {cc.unresolved > 0 ? `${cc.unresolved} new` : `${cc.total} threads`}
                {:else}
                  &mdash;
                {/if}
              </span>
              <span class="status-col" class:live={page.access === 'public'}>
                {#if page.access === 'public'}&#x25CF; live{:else}{getStatusLabel(page.access)}{/if}
              </span>
            </a>
          {/each}
        </div>
      {:else}
        <div class="empty-state">
          <p class="empty-title">
            {#if activeFilter !== 'all' || sourceFilter !== 'all'}
              No pages match this filter
            {:else}
              No pages yet
            {/if}
          </p>
          {#if activeFilter === 'all' && sourceFilter === 'all'}
            <a href="/new" class="empty-cta">Publish your first page &rarr;</a>
          {:else}
            <button
              class="empty-cta"
              onclick={() => {
                activeFilter = 'all';
                sourceFilter = 'all';
              }}
            >
              Clear filters
            </button>
          {/if}
        </div>
      {/if}
    </main>
  </div>
{:else}
  <!-- ═══ PUBLIC PROFILE (non-owner view) ═══ -->
  <main class="public-profile animate-fade-in-up">
    <div class="public-header">
      <h1 class="public-username">@{profileUser.username}</h1>
      <span class="public-count">{pages.length} page{pages.length !== 1 ? 's' : ''}</span>
    </div>

    <!-- Collections -->
    {#if collections.length > 0}
      <div class="section-label">Collections</div>
      <div class="public-grid">
        {#each collections as coll}
          <a href={`/c/${coll.slug}`} class="pub-card">
            <span class="pub-card-title">{coll.title}</span>
            <span class="pub-card-slug">/{coll.slug}</span>
          </a>
        {/each}
      </div>
    {/if}

    <!-- Pages -->
    {#if pages.length > 0}
      {#if collections.length > 0}<div class="section-label">Pages</div>{/if}
      <div class="public-grid">
        {#each pages as page}
          {@const vs = viewBadgeStyle[page.view] ?? {
            bg: 'var(--surface-hover)',
            color: 'var(--text-secondary)',
          }}
          <a href={`/@${profileUser.username}/${page.slug}`} class="pub-card">
            <div class="pub-card-top">
              <span class="pub-card-title">{page.title || page.slug}</span>
              <span class="badge" style="background: {vs.bg}; color: {vs.color};">{page.view}</span>
            </div>
            <div class="pub-card-bottom">
              <span class="pub-card-slug">{page.slug}</span>
              <span class="pub-card-date">{formatDate(page.updated)}</span>
            </div>
          </a>
        {/each}
      </div>
    {/if}

    {#if pages.length === 0 && collections.length === 0}
      <div class="empty-state">
        <p class="empty-title">No public pages yet</p>
      </div>
    {/if}
  </main>
{/if}

<style>
  /* ════════════════════════════════════════════════════
     OWNER DASHBOARD — Two-column layout
     ════════════════════════════════════════════════════ */
  .dash {
    max-width: 1200px;
    margin: 0 auto;
    padding: 48px 40px 120px;
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 48px;
  }

  /* ── Sidebar ── */
  .nav {
    position: sticky;
    top: 100px;
    align-self: start;
  }

  .nav-greet {
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 26px;
    line-height: 1.1;
    letter-spacing: -0.01em;
    margin: 0 0 6px;
    color: var(--text-primary);
  }

  .nav-greet-user {
    font-style: normal;
  }

  .nav-sub {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
    margin-bottom: 32px;
    letter-spacing: 0.04em;
  }

  .nav-h {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    color: var(--text-tertiary);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin: 24px 0 10px;
    padding-left: 2px;
  }

  .nav-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 7px 10px;
    margin: 0 -10px;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    border-radius: 6px;
    cursor: pointer;
    border: none;
    background: none;
    width: calc(100% + 20px);
    text-align: left;
    transition:
      background var(--ease-fast),
      color var(--ease-fast);
  }

  .nav-item.active {
    background: var(--text-primary);
    color: var(--bg);
  }

  .nav-item:hover:not(.active) {
    background: rgba(0, 0, 0, 0.03);
    color: var(--text-primary);
  }

  .nav-item .n {
    font-family: var(--font-mono);
    font-size: 11px;
    opacity: 0.5;
    font-weight: 400;
  }

  .nav-item.active .n {
    opacity: 0.7;
  }

  .nav-new {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    margin: 8px -10px 0;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 600;
    background: var(--text-primary);
    color: var(--bg);
    border-radius: 8px;
    text-decoration: none;
    cursor: pointer;
    box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.25);
    transition: background var(--ease-fast);
  }

  .nav-new:hover {
    background: var(--accent-hover);
  }

  .nav-new .kbd {
    margin-left: auto;
    font-family: var(--font-mono);
    font-size: 10px;
    background: rgba(237, 234, 229, 0.12);
    padding: 2px 6px;
    border-radius: 4px;
    opacity: 0.8;
  }

  /* ── Main column ── */
  .main-col {
    min-width: 0;
  }

  .main-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding-bottom: 18px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 6px;
  }

  .main-h1 {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: 36px;
    letter-spacing: -0.02em;
    margin: 0;
    color: var(--text-primary);
  }

  .main-h1 em {
    font-style: italic;
  }

  .main-meta {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  /* ── Stats strip ── */
  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    padding: 28px 0;
    border-bottom: 1px solid var(--border);
    margin-bottom: 32px;
  }

  .stat {
    padding-right: 24px;
    border-right: 1px solid var(--border);
  }

  .stat:last-child {
    border-right: none;
  }

  .stat-n {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: 40px;
    line-height: 1;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    margin-bottom: 6px;
  }

  .stat-lbl {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    color: var(--text-tertiary);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  /* ── Section header ── */
  .sec-h {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    color: var(--text-tertiary);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin: 0 0 14px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .sec-h-count {
    font-weight: 400;
    letter-spacing: 0.04em;
    text-transform: none;
  }

  /* ── Collections list ── */
  .collections-list {
    border-top: 1px solid var(--border);
    margin-bottom: 32px;
  }

  .coll-row {
    display: grid;
    grid-template-columns: 1fr 160px 80px;
    gap: 16px;
    align-items: baseline;
    padding: 14px 8px;
    border-bottom: 1px solid var(--border);
    text-decoration: none;
    transition: background var(--ease-fast);
  }

  .coll-row:hover {
    background: rgba(0, 0, 0, 0.015);
  }

  .coll-title {
    font-family: var(--font-serif);
    font-size: 17px;
    color: var(--text-primary);
  }

  .coll-slug {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .coll-row .badge-public {
    font-family: var(--font-mono);
    font-size: 10px;
    text-align: right;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #1a7a3a;
  }

  .coll-row .badge-unlisted {
    font-family: var(--font-mono);
    font-size: 10px;
    text-align: right;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }

  .coll-row .badge-private {
    font-family: var(--font-mono);
    font-size: 10px;
    text-align: right;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }

  /* ── Pages list ── */
  .pages {
    border-top: 1px solid var(--border);
    margin-bottom: 48px;
  }

  .page-row {
    display: grid;
    grid-template-columns: 20px 1fr 140px 100px 80px;
    gap: 16px;
    align-items: baseline;
    padding: 18px 8px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    transition: background var(--ease-fast);
    text-decoration: none;
    color: inherit;
  }

  .page-row:hover {
    background: rgba(0, 0, 0, 0.015);
  }

  .page-row .src {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-tertiary);
    text-align: center;
  }

  .page-row .src.agent {
    color: var(--text-primary);
    font-weight: 600;
  }

  .page-row .title-col h4 {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: 19px;
    line-height: 1.25;
    letter-spacing: -0.01em;
    margin: 0 0 4px;
    color: var(--text-primary);
  }

  .page-row .slug {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .page-row .slug .open {
    opacity: 0;
    transition: opacity var(--ease-fast);
    margin-left: 6px;
  }

  .page-row:hover .slug .open {
    opacity: 1;
  }

  .page-row .meta-col {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .page-row .num-col {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-secondary);
    text-align: right;
  }

  .page-row .num-col.has-new {
    color: var(--text-primary);
    font-weight: 600;
  }

  .page-row .num-col.has-new::before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ef4444;
    margin-right: 6px;
    vertical-align: middle;
  }

  .page-row .status-col {
    font-family: var(--font-mono);
    font-size: 10px;
    text-align: right;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }

  .page-row .status-col.live {
    color: #1a7a3a;
  }

  /* ── New collection form ── */
  .new-coll-form {
    background: var(--surface);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    padding: 20px;
    margin-bottom: 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .new-coll-input {
    font-size: 15px;
    font-family: var(--font-sans);
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-input);
    background: var(--bg);
    color: var(--text-primary);
    outline: none;
    transition:
      border-color var(--ease-fast),
      box-shadow var(--ease-fast);
  }

  .new-coll-input:focus {
    border-color: var(--border-hover);
    box-shadow: var(--focus-ring);
  }

  .new-coll-slug {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-tertiary);
  }

  .new-coll-actions {
    display: flex;
    gap: 8px;
  }

  .btn-create {
    font-size: 12px;
    font-weight: 500;
    padding: 6px 16px;
    background: var(--accent);
    color: var(--bg);
    border: none;
    border-radius: var(--radius-button);
    cursor: pointer;
    transition: background var(--ease-fast);
  }

  .btn-create:hover {
    background: var(--accent-hover);
  }

  .btn-create:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .btn-cancel {
    font-size: 12px;
    padding: 6px 12px;
    background: none;
    color: var(--text-tertiary);
    border: 1px solid var(--border);
    border-radius: var(--radius-button);
    cursor: pointer;
    transition:
      color var(--ease-fast),
      border-color var(--ease-fast);
  }

  .btn-cancel:hover {
    color: var(--text-primary);
    border-color: var(--border-hover);
  }

  /* ── Empty state ── */
  .empty-state {
    padding: 48px 0;
    text-align: center;
  }

  .empty-title {
    font-size: 15px;
    color: var(--text-secondary);
    margin: 0 0 12px 0;
  }

  .empty-cta {
    font-size: 14px;
    color: var(--text-primary);
    text-decoration: none;
    border: none;
    background: none;
    border-bottom: 1px solid var(--border);
    padding-bottom: 1px;
    cursor: pointer;
    transition: border-color var(--ease-fast);
  }

  .empty-cta:hover {
    border-color: var(--text-primary);
  }

  /* ── Responsive: stack on narrow screens ── */
  @media (max-width: 639px) {
    .dash {
      grid-template-columns: 1fr;
      padding: 24px 20px 80px;
      gap: 32px;
    }

    .nav {
      position: static;
    }

    .stats {
      grid-template-columns: repeat(2, 1fr);
      row-gap: 20px;
    }

    .stat:nth-child(2) {
      border-right: none;
    }

    .page-row {
      grid-template-columns: 20px 1fr 80px;
    }

    .page-row .meta-col,
    .page-row .num-col {
      display: none;
    }

    .coll-row {
      grid-template-columns: 1fr 80px;
    }

    .coll-slug {
      display: none;
    }
  }

  /* ════════════════════════════════════════════════════
     PUBLIC PROFILE — Non-owner view
     ════════════════════════════════════════════════════ */
  .public-profile {
    max-width: 1080px;
    margin: 0 auto;
    padding: 48px 40px 120px;
  }

  .public-header {
    margin-bottom: 40px;
  }

  .public-username {
    font-family: var(--font-serif);
    font-size: 36px;
    font-weight: 400;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    margin: 0 0 4px 0;
  }

  .public-count {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-tertiary);
    letter-spacing: 0.04em;
  }

  .section-label {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-tertiary);
    margin: 32px 0 12px;
  }

  .public-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }

  .pub-card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 12px;
    padding: 20px 22px;
    background: var(--surface);
    box-shadow: var(--shadow-card);
    border-radius: var(--radius-card);
    text-decoration: none;
    transition:
      box-shadow var(--ease-fast),
      border-color var(--ease-fast);
    border: 1px solid transparent;
    min-height: 96px;
  }

  .pub-card:hover {
    box-shadow: var(--shadow-elevated);
    border-color: var(--border);
  }

  .pub-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .pub-card-title {
    font-size: 15px;
    font-weight: 500;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .badge {
    font-size: 11px;
    font-weight: 500;
    padding: 2px 7px;
    border-radius: 9999px;
  }

  .pub-card-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .pub-card-slug {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-tertiary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .pub-card-date {
    font-size: 12px;
    color: var(--text-tertiary);
    flex-shrink: 0;
    margin-left: 8px;
  }

  @media (max-width: 639px) {
    .public-profile {
      padding: 24px 20px 80px;
    }
  }
</style>
