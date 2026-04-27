<script lang="ts">
  import { browser } from '$app/environment';
  import { goto, invalidateAll } from '$app/navigation';
  import DocView from '$lib/templates/doc/DocView.svelte';
  import KanbanView from '$lib/templates/kanban/KanbanView.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let isDoc = $derived(data.activePage?.view !== 'kanban');

  let showDropdown = $state(false);
  let showOutline = $state(false);
  let activeTitle = $derived(data.pages.find((p) => p.active)?.title ?? '');
  let currentHeadings = $derived(
    data.allHeadings
      ?.find((p) => p.slug === data.activePage?.slug)
      ?.headings?.filter((h) => h.level <= 3) ?? []
  );

  // TOC
  interface TocItem {
    id: string;
    text: string;
    level: number;
  }
  let toc = $derived.by((): TocItem[] => {
    if (!isDoc || !data.activePage?.html) return [];
    const items: TocItem[] = [];
    const regex = /<h([2-3])[^>]*>(.*?)<\/h[2-3]>/gi;
    let match;
    while ((match = regex.exec(data.activePage.html)) !== null) {
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

  function docActions(node: HTMLElement) {
    node.querySelectorAll('h2, h3').forEach((h) => {
      if (!h.id)
        h.id = (h.textContent ?? '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
    });
    if (!browser) return { destroy() {} };
    const headings = node.querySelectorAll('h2[id], h3[id]');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) activeTocId = e.target.id;
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
</script>

<svelte:head>
  <title>{data.activePage?.title ?? data.collection.title} — vibe.pub</title>
  <meta property="og:title" content={data.collection.title} />
  <meta
    property="og:description"
    content={data.collection.description ?? 'A collection on vibe.pub'}
  />
  <meta property="og:site_name" content="vibe.pub" />
</svelte:head>

<!-- Header: matches global header style -->
<header class="c-header">
  <nav>
    <div class="nav-left">
      <a href="/" class="wordmark">vibe.<em>pub</em></a>
      <span class="nav-sep"></span>
      <div class="c-breadcrumb">
        <span class="c-coll-name">{data.collection.title}</span>
        {#if data.pages.length > 0}
          <span class="c-slash">/</span>
          <div class="c-page-wrap">
            <button class="c-page-btn" onclick={() => (showDropdown = !showDropdown)}>
              <span>{activeTitle}</span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"><path d="M6 9l6 6 6-6" /></svg
              >
            </button>
            {#if showDropdown}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="c-drop-bg"
                onclick={() => (showDropdown = false)}
                onkeydown={() => {}}
              ></div>
              <div class="c-drop">
                {#each data.pages as page}
                  <button
                    type="button"
                    class="c-drop-item"
                    class:active={page.active}
                    onclick={() => {
                      showDropdown = false;
                      window.location.href = `/c/${data.collection.slug}?page=${page.slug}`;
                    }}>{page.title}</button
                  >
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
    <div class="nav-right">
      {#if data.user}
        <a href={`/@${data.user.username}`} class="tb-btn">@{data.user.username}</a>
      {:else}
        <a href="/auth/login" class="tb-btn primary">sign in</a>
      {/if}
    </div>
  </nav>
</header>

{#if data.activePage}
  <div class="collection-page theme-{data.collection.theme ?? 'default'}">
    {#if data.activePage.view === 'kanban'}
      <div class="kanban-layout">
        <KanbanView
          markdown={data.activePage.markdown}
          pageId={data.activePage.id}
          comments={data.activePage.comments}
          initialColumns={data.activePage.kanbanData?.columns ?? []}
          initialLabels={data.activePage.kanbanData?.labels ?? {}}
        />
      </div>
    {:else}
      <!-- Same layout as single page doc view -->
      <div class="doc-layout">
        <main class="doc-main">
          <article use:docActions>
            <DocView
              html={data.activePage.html}
              title={data.activePage.title}
              comments={data.activePage.comments}
              pageId={data.activePage.id}
            />
          </article>
        </main>

        <!-- Comment rail -->
        <aside class="doc-rail">
          <div class="rail-head">
            <span class="rail-h">Threads · {data.activePage.comments?.length ?? 0}</span>
          </div>
          {#if !data.activePage.comments?.length}
            <div class="empty-rail">
              <div class="empty-rail-h">No <em>comments</em> yet.</div>
              <div class="empty-rail-c">Click any block to leave a comment.</div>
            </div>
          {:else}
            {#each data.activePage.comments as comment}
              <div class="rail-thread">
                <div class="rail-thread-meta">
                  {comment.resolved ? '✓ resolved' : '● open'} · {comment.display_name ||
                    'anonymous'}
                </div>
                <div class="rail-thread-body">
                  {comment.body.slice(0, 80)}{comment.body.length > 80 ? '…' : ''}
                </div>
              </div>
            {/each}
          {/if}
        </aside>
      </div>

      <footer class="page-footer">
        <a href="/" class="footer-wordmark">vibe.<em>pub</em></a>
        <span class="footer-desc">publish from the command line</span>
      </footer>
    {/if}
  </div>
{:else}
  <!-- Empty collection -->
  <div class="empty-collection">
    <div class="empty-glyph"><em>v</em></div>
    <h2 class="empty-title">No pages yet</h2>
    <p class="empty-sub">Add pages to this collection via CLI or API.</p>
    <code class="empty-cmd">vibe-pub collection add {data.collection.slug} &lt;page-slug&gt;</code>
  </div>
{/if}

<style>
  /* ═══ Header — matches global header ═══ */
  .c-header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
  }

  nav {
    padding: 0 40px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .nav-left {
    display: flex;
    align-items: baseline;
    gap: 14px;
    min-width: 0;
  }

  .wordmark {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 400;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    text-decoration: none;
    flex-shrink: 0;
    transition: opacity 150ms;
    line-height: 1;
  }

  .wordmark :global(em) {
    font-style: italic;
  }
  .wordmark:hover {
    opacity: 0.6;
  }

  .nav-sep {
    width: 1px;
    height: 18px;
    background: var(--border);
    flex-shrink: 0;
    align-self: center;
  }

  .c-breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .c-coll-name {
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .c-slash {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-tertiary);
  }

  .c-page-wrap {
    position: relative;
  }

  .c-page-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    margin: -4px -8px;
    border-radius: 6px;
    transition: background 150ms;
    white-space: nowrap;
  }

  .c-page-btn:hover {
    background: var(--surface-hover);
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .tb-btn {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 500;
    padding: 7px 14px;
    border-radius: 9999px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 150ms;
    text-decoration: none;
  }

  .tb-btn:hover {
    color: var(--text-primary);
    border-color: var(--border-hover);
    background: var(--surface-hover);
  }

  .tb-btn.primary {
    background: var(--text-primary);
    color: var(--bg);
    border-color: var(--text-primary);
  }

  .tb-btn.primary:hover {
    background: var(--accent-hover);
  }

  /* Dropdown */
  .c-drop-bg {
    position: fixed;
    inset: 0;
    z-index: 99;
  }

  .c-drop {
    position: absolute;
    top: calc(100% + 10px);
    left: -8px;
    background: var(--surface);
    border-radius: var(--radius-input);
    box-shadow: var(--shadow-elevated);
    padding: 4px;
    min-width: 220px;
    max-height: 320px;
    overflow-y: auto;
    z-index: 100;
  }

  .c-drop-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    border: none;
    background: none;
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      background 150ms,
      color 150ms;
  }

  .c-drop-item:hover {
    background: var(--bg);
    color: var(--text-primary);
  }
  .c-drop-item.active {
    color: var(--text-primary);
    font-weight: 500;
    background: var(--bg);
  }

  /* ═══ Page content — matches single page doc view ═══ */
  .collection-page {
    background: var(--bg);
    color: var(--text-primary);
    min-height: calc(100vh - 56px);
  }

  .kanban-layout {
    padding: 24px;
  }

  .doc-layout {
    display: grid;
    grid-template-columns: 1fr minmax(auto, 320px);
    max-width: 1200px;
    margin: 0 auto;
    gap: 40px;
    padding: 48px 40px 40px;
  }

  .doc-main {
    min-width: 0;
    width: 100%;
    max-width: 640px;
    margin: 0 auto;
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

  /* ── Footer — matches single page ── */
  .page-footer {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 40px 60px;
    display: flex;
    align-items: baseline;
    gap: 12px;
    border-top: 1px solid var(--border);
  }

  .footer-wordmark {
    font-family: var(--font-display);
    font-size: 14px;
    letter-spacing: -0.02em;
    color: var(--text-tertiary);
    text-decoration: none;
  }

  .footer-wordmark :global(em) {
    font-style: italic;
  }
  .footer-wordmark:hover {
    color: var(--text-primary);
  }

  .footer-desc {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
  }

  /* ═══ Responsive ═══ */
  @media (max-width: 959px) {
    .doc-layout {
      grid-template-columns: 1fr;
      max-width: 640px;
      padding: 32px 24px 40px;
    }
    .doc-rail {
      display: none;
    }
    .page-footer {
      padding: 32px 24px 48px;
    }
  }

  @media (max-width: 639px) {
    nav {
      padding: 0 20px;
      height: 48px;
    }
    .wordmark {
      font-size: 18px;
    }
    .doc-layout {
      padding: 24px 20px 40px;
    }
    .page-footer {
      padding: 24px 20px 40px;
    }
  }

  /* ── Empty collection ── */
  .empty-collection {
    padding: 80px 24px;
    text-align: center;
  }

  .empty-glyph {
    font-family: var(--font-display);
    font-size: 48px;
    color: var(--text-tertiary);
    margin-bottom: 16px;
  }

  .empty-glyph :global(em) {
    font-style: italic;
  }

  .empty-title {
    font-family: var(--font-serif);
    font-size: 20px;
    font-weight: 400;
    color: var(--text-primary);
    margin: 0 0 8px;
  }

  .empty-sub {
    font-family: var(--font-prose);
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0 0 20px;
  }

  .empty-cmd {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-secondary);
    background: var(--surface);
    padding: 8px 16px;
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-card);
  }
</style>
