<script lang="ts">
  import { browser } from '$app/environment';
  import DocView from '$lib/templates/doc/DocView.svelte';
  import KanbanView from '$lib/templates/kanban/KanbanView.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let isDoc = $derived(data.activePage.view !== 'kanban');

  let showDropdown = $state(false);
  let showOutline = $state(false);
  let activeTitle = $derived(data.pages.find((p) => p.active)?.title ?? '');
  let currentHeadings = $derived(
    data.allHeadings
      ?.find((p) => p.slug === data.activePage.slug)
      ?.headings?.filter((h) => h.level <= 3) ?? []
  );

  // Global header hidden by layout via URL check (/c/ prefix)

  // TOC
  interface TocItem {
    id: string;
    text: string;
    level: number;
  }
  let toc = $derived.by((): TocItem[] => {
    if (!isDoc || !data.activePage.html) return [];
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
  <title>{data.activePage.title ?? data.collection.title} — vibe.pub</title>
  <meta property="og:title" content={data.collection.title} />
  <meta
    property="og:description"
    content={data.collection.description ?? 'A collection on vibe.pub'}
  />
  <meta property="og:site_name" content="vibe.pub" />
</svelte:head>

<!-- Combined header: logo + collection tabs + sign in -->
<header class="c-header">
  <div class="c-header-inner">
    <!-- Home -->
    <a href="/" class="c-home" title="vibe.pub">
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        ><path d="M3 12l9-9 9 9" /><path d="M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10" /></svg
      >
    </a>

    <!-- Collection title + page dropdown -->
    <div class="c-nav">
      <span class="c-coll-name">{data.collection.title}</span>
      <span class="c-nav-slash">/</span>
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
          <div class="c-drop-bg" onclick={() => (showDropdown = false)} onkeydown={() => {}}></div>
          <div class="c-drop">
            {#each data.pages as page}
              <a
                href="/c/{data.collection.slug}?page={page.slug}"
                class="c-drop-item"
                class:active={page.active}
                data-sveltekit-noscroll
                onclick={() => (showDropdown = false)}>{page.title}</a
              >
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Right: sign in -->
    <div class="c-right">
      {#if data.user}
        <a href={`/@${data.user.username}`} class="c-link">@{data.user.username}</a>
      {:else}
        <a href="/auth/login" class="c-link">Sign in</a>
      {/if}
    </div>
  </div>
</header>

<!-- Outline (current page only) -->
{#if currentHeadings.length > 0 && data.activePage.view !== 'kanban'}
  {#if showOutline}
    <nav class="c-outline">
      {#each currentHeadings as h}
        <a href="#{h.id}" class="c-ol-link" class:h3={h.level === 3}>{h.text}</a>
      {/each}
    </nav>
  {/if}
  <button
    class="c-ol-toggle"
    class:active={showOutline}
    onclick={() => (showOutline = !showOutline)}
    title="Outline"
  >
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"><path d="M4 6h16M4 12h10M4 18h13" /></svg
    >
  </button>
{/if}

<!-- Page content -->
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
    <div class="doc-layout">
      <main class="doc-main">
        <article class="doc-card" use:docActions>
          <DocView
            html={data.activePage.html}
            title={data.activePage.title}
            comments={data.activePage.comments}
            pageId={data.activePage.id}
          />
        </article>
        <footer class="page-footer">
          <span>Published on </span><a href="/">vibe.pub</a><span class="sep"> — </span><a href="/"
            >Create yours</a
          >
        </footer>
      </main>
    </div>
  {/if}
</div>

<style>
  /* ═══ Combined header ═══ */
  .c-header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
    height: 48px;
  }

  .c-header-inner {
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 16px;
    gap: 0;
  }

  .c-home {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    color: var(--text-tertiary);
    text-decoration: none;
    flex-shrink: 0;
    margin-right: 4px;
    transition:
      color 150ms,
      background 150ms;
  }

  .c-home:hover {
    color: var(--text-primary);
    background: var(--surface);
  }

  /* Nav: collection / page */
  .c-nav {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    overflow: hidden;
  }

  .c-coll-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 1;
  }

  .c-nav-slash {
    font-size: 13px;
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
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition:
      background 150ms,
      color 150ms;
    white-space: nowrap;
  }

  .c-page-btn:hover {
    background: var(--surface);
    color: var(--text-primary);
  }

  /* Dropdown */
  .c-drop-bg {
    position: fixed;
    inset: 0;
    z-index: 99;
  }

  .c-drop {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    padding: 4px;
    min-width: 200px;
    max-height: 320px;
    overflow-y: auto;
    z-index: 100;
  }

  .c-drop-item {
    display: block;
    padding: 7px 12px;
    border-radius: 5px;
    text-decoration: none;
    font-size: 13px;
    color: var(--text-secondary);
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

  /* Right */
  .c-right {
    margin-left: auto;
    flex-shrink: 0;
    padding-left: 12px;
  }

  .c-link {
    font-size: 12px;
    color: var(--text-tertiary);
    text-decoration: none;
    transition: color 150ms;
  }

  .c-link:hover {
    color: var(--text-primary);
  }

  /* ═══ Page content ═══ */
  .collection-page {
    background: var(--bg);
    color: var(--text-primary);
    min-height: calc(100vh - 48px);
  }

  .kanban-layout {
    padding: 24px;
  }

  /* ═══ Outline ═══ */
  .c-ol-toggle {
    position: fixed;
    left: calc(50% - 390px);
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: none;
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    z-index: 30;
    opacity: 0.45;
    transition:
      opacity 150ms,
      color 150ms;
  }

  .c-ol-toggle:hover {
    opacity: 0.8;
    color: var(--text-primary);
  }
  .c-ol-toggle.active {
    opacity: 0.6;
    color: var(--text-secondary);
  }

  .c-outline {
    position: fixed;
    right: calc(50% + 380px);
    top: 50%;
    transform: translateY(-50%);
    width: 180px;
    max-height: calc(100vh - 130px);
    overflow-y: auto;
    z-index: 29;
    padding: 4px 0;
  }

  .c-ol-link {
    display: block;
    font-size: 12px;
    color: var(--text-tertiary);
    text-decoration: none;
    padding: 3px 8px;
    line-height: 1.4;
    transition: color 150ms;
  }

  .c-ol-link:hover {
    color: var(--text-secondary);
  }
  .c-ol-link.h3 {
    padding-left: 18px;
    font-size: 11px;
  }

  @media (max-width: 1100px) {
    .c-ol-toggle,
    .c-outline {
      display: none;
    }
  }

  .doc-layout {
    max-width: 720px;
    margin: 0 auto;
    padding: 32px 24px 80px;
  }

  .doc-main {
    min-width: 0;
  }

  .doc-card {
    background: var(--surface);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-elevated);
    padding: 40px 48px;
  }

  .page-footer {
    text-align: center;
    margin-top: 40px;
    font-size: 12px;
    font-family: var(--font-mono);
    color: var(--text-tertiary);
  }

  .page-footer a {
    color: var(--text-tertiary);
    text-decoration: none;
  }
  .page-footer a:hover {
    color: var(--text-secondary);
  }
  .page-footer a:first-of-type {
    font-weight: 500;
  }
  .sep {
    opacity: 0.5;
  }

  @media (max-width: 820px) {
    .doc-card {
      padding: 28px 24px;
    }
  }

  @media (max-width: 500px) {
    .c-header-inner {
      padding: 0 12px;
    }
  }
</style>
