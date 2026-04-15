<script lang="ts">
  import { page as pageStore } from '$app/stores';
  import DocView from '$lib/templates/doc/DocView.svelte';
  import KanbanView from '$lib/templates/kanban/KanbanView.svelte';
  import Comments from '$lib/components/Comments.svelte';
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
    return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

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
  class="theme-{page.theme ?? 'default'}"
  class:dark={['terminal', 'midnight', 'raycast', 'monokai', 'dracula'].includes(page.theme)}
  style="background: var(--bg); color: var(--text-primary); min-height: 100vh; padding: 32px 24px 80px;"
>
  <div style="max-width: {page.view === 'kanban' ? '1200px' : '720px'}; margin: 0 auto;">
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
      <div style="background: var(--surface); border-radius: var(--radius-card); box-shadow: var(--shadow-elevated); padding: 16px;">
        <textarea
          class="edit-textarea"
          bind:value={editMarkdown}
          rows={20}
        ></textarea>
      </div>
    {:else}
    <div style="background: var(--surface); border-radius: var(--radius-card); box-shadow: var(--shadow-elevated); padding: 40px 48px; {page.view === 'kanban' ? 'overflow-x: auto;' : ''}">
      {#if page.view === 'kanban'}
        <KanbanView markdown={page.markdown} pageId={page.id} {comments} initialColumns={data.kanbanData?.columns ?? []} initialLabels={data.kanbanData?.labels ?? {}} isOwner={isOwner} />
      {:else}
        <DocView {html} title={page.title} {comments} pageId={page.id} />
      {/if}
    </div>
    {/if}

    {#if page.view !== 'kanban'}
      <div style="margin-top: 32px; background: var(--surface); border-radius: var(--radius-card); box-shadow: var(--shadow-card); padding: 28px 32px;">
        <Comments {comments} pageId={page.id} />
      </div>
    {/if}
  </div>
</div>

<style>
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
</style>
