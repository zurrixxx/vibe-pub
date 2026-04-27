<script lang="ts">
  import { page as pageStore } from '$app/stores';
  import { browser } from '$app/environment';
  import DocView from '$lib/templates/doc/DocView.svelte';
  import KanbanView from '$lib/templates/kanban/KanbanView.svelte';
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

  let isOwner = $derived(!!page.user_id && page.user_id === data.user?.id);

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
        saveError = 'Failed to save';
      }
    } catch {
      saveError = 'Network error';
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
    if (page.view === 'kanban' || !html) return [];
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
    if (toc.length > 0 || page.view === 'kanban' || !html) return toc;
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

  let description = $derived.by(() => {
    if (page.view === 'kanban') {
      const cols = data.kanbanData?.columns ?? [];
      const taskCount = cols.reduce((n: number, c: any) => n + (c.cards?.length ?? 0), 0);
      return `Kanban board with ${cols.length} columns and ${taskCount} tasks`;
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
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content={pageTitle} />
  <meta name="twitter:description" content={description} />
</svelte:head>

<div
  class="page-wrapper theme-{page.theme ?? 'default'}"
  class:dark={['terminal', 'midnight', 'raycast', 'monokai', 'dracula'].includes(page.theme)}
>
  {#if page.view === 'kanban'}
    <!-- ═══ KANBAN LAYOUT: full width ═══ -->
    <div class="kanban-layout">
      {#if isOwner}
        <div class="kanban-toolbar">
          {#if editing}
            <button class="toolbar-btn toolbar-save" onclick={saveEdit} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button class="toolbar-btn toolbar-cancel" onclick={cancelEdit}>Cancel</button>
            {#if saveError}<span class="toolbar-error">{saveError}</span>{/if}
          {:else}
            <button class="toolbar-btn" onclick={startEdit}>Edit</button>
          {/if}
        </div>
      {/if}

      {#if editing}
        <div class="edit-card">
          <textarea class="edit-textarea" bind:value={editMarkdown} rows={20}></textarea>
        </div>
      {:else}
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
              {#if saveError}<span class="toolbar-error">{saveError}</span>{/if}
            {:else}
              <button class="toolbar-btn" onclick={startEdit}>Edit</button>
            {/if}
          </div>
        {/if}

        {#if editing}
          <div class="edit-card">
            <textarea class="edit-textarea" bind:value={editMarkdown} rows={20}></textarea>
          </div>
        {:else}
          <article class="doc-card" use:docActions>
            <DocView {html} title={page.title} {comments} pageId={page.id} />
          </article>
        {/if}

        <footer class="page-footer">
          <span>Published on </span>
          <a href="/">vibe.pub</a>
          <span class="footer-sep"> — </span>
          <a href="/">Create yours</a>
        </footer>
      </main>
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

  /* ═══ DOC LAYOUT ═══ */
  .doc-layout {
    max-width: 720px;
    margin: 0 auto;
    padding: 32px 24px 80px;
    position: relative;
  }

  /* ── Doc main column ── */
  .doc-main {
    min-width: 0;
  }

  .doc-card {
    background: var(--surface);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-elevated);
    padding: 40px 48px;
  }

  /* ── Comments sidebar ── */
  .comments-sidebar {
    position: sticky;
    top: 80px;
    padding-left: 32px;
    max-height: calc(100vh - 120px);
    overflow-y: auto;
  }

  .sidebar-comments-inner {
    width: 260px;
    background: var(--surface);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    padding: 20px;
  }

  /* ── Doc actions ── */
  .doc-actions {
    position: fixed;
    left: calc(50% - 390px);
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 30;
  }

  .print-link {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    color: var(--text-tertiary);
    opacity: 0.45;
    transition:
      opacity 150ms,
      color 150ms;
  }

  .print-link:hover {
    opacity: 0.8;
    color: var(--text-primary);
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
    right: calc(50% + 380px);
    top: 50%;
    transform: translateY(-50%);
    width: 180px;
    max-height: calc(100vh - 140px);
    overflow-y: auto;
    z-index: 29;
    padding: 4px 0;
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

  /* ═══ Responsive ═══ */
  @media (max-width: 820px) {
    .doc-layout {
      padding: 16px 16px 80px;
    }
    .doc-card {
      padding: 28px 24px;
    }
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
    padding: 5px 14px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 150ms;
  }

  .toolbar-btn:hover {
    border-color: var(--text-tertiary);
    color: var(--text-primary);
  }

  .toolbar-save {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }

  .toolbar-error {
    font-size: 12px;
    color: #ef4444;
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

    .doc-card {
      box-shadow: none;
      border-radius: 0;
      padding: 0;
      background: none;
    }

    .doc-actions,
    .outline-panel,
    .kanban-toolbar,
    .page-toolbar,
    .page-footer,
    .edit-card {
      display: none !important;
    }

    @page {
      margin: 0;
      size: A4;
    }
  }
</style>
