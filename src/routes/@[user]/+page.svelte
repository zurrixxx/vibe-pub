<script lang="ts">
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }
  let { data }: Props = $props();

  let { profileUser, pages, isOwner } = $derived(data);

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const viewBadgeStyle: Record<string, { bg: string; color: string }> = {
    doc:    { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa' },
    kanban: { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa' }
  };

  const accessBadgeStyle: Record<string, { bg: string; color: string }> = {
    public:   { bg: 'rgba(34,197,94,0.12)', color: '#4ade80' },
    unlisted: { bg: 'var(--surface-hover)',   color: 'var(--text-tertiary)' },
    private:  { bg: 'rgba(239,68,68,0.12)',   color: '#f87171' }
  };

  function previewSnippet(title: string | null, slug: string): string {
    return title ?? slug;
  }
</script>

<svelte:head>
  <title>@{profileUser.username} — vibe.pub</title>
</svelte:head>

<main class="max-w-[1080px] mx-auto px-6 py-12 animate-fade-in-up">

  <!-- Workspace header -->
  <div class="workspace-header">
    <div>
      <h1 class="workspace-username">@{profileUser.username}</h1>
      {#if isOwner}
        <p class="workspace-sub">Your workspace</p>
      {/if}
    </div>
    {#if isOwner}
      <a href="/" class="new-page-btn">
        + New page
      </a>
    {/if}
  </div>

  {#if pages.length === 0}
    <div class="empty-state">
      <p class="empty-title">No pages yet</p>
      {#if isOwner}
        <a href="/" class="empty-cta">Publish your first page →</a>
      {/if}
    </div>
  {:else}
    <div class="pages-grid">
      {#each pages as page}
        {@const vs = viewBadgeStyle[page.view] ?? { bg: 'var(--surface-hover)', color: 'var(--text-secondary)' }}
        {@const as_ = accessBadgeStyle[page.access] ?? { bg: 'var(--surface-hover)', color: 'var(--text-secondary)' }}
        <a
          href={`/@${profileUser.username}/${page.slug}`}
          class="page-card"
        >
          <div class="page-card-top">
            <span class="page-title">{previewSnippet(page.title, page.slug)}</span>
            <div class="page-badges">
              <span class="badge" style="background: {vs.bg}; color: {vs.color};">{page.view}</span>
              {#if isOwner}
                <span class="badge" style="background: {as_.bg}; color: {as_.color};">{page.access}</span>
              {/if}
            </div>
          </div>
          <div class="page-card-bottom">
            <span class="page-slug">{page.slug}</span>
            <span class="page-date">{formatDate(page.updated)}</span>
          </div>
        </a>
      {/each}
    </div>
  {/if}

</main>

<style>
  .workspace-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 32px;
    gap: 16px;
  }

  .workspace-username {
    font-family: var(--font-mono);
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.4px;
    color: var(--text-primary);
    margin: 0 0 4px 0;
  }

  .workspace-sub {
    font-size: 13px;
    color: var(--text-tertiary);
    margin: 0;
  }

  .new-page-btn {
    flex-shrink: 0;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    padding: 7px 14px;
    border-radius: 7px;
    border: 1px solid var(--border);
    transition: color 150ms, border-color 150ms, background 150ms;
  }

  .new-page-btn:hover {
    color: var(--text-primary);
    border-color: var(--border-hover);
    background: var(--surface-hover);
  }

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
    border-bottom: 1px solid var(--border);
    padding-bottom: 1px;
    transition: border-color 150ms;
  }

  .empty-cta:hover {
    border-color: var(--text-primary);
  }

  .pages-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }

  .page-card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 12px;
    padding: 18px 20px;
    background: var(--surface);
    box-shadow: var(--shadow-card);
    border-radius: 10px;
    text-decoration: none;
    transition: box-shadow 150ms, transform 150ms, border-color 150ms;
    border: 1px solid transparent;
    min-height: 96px;
  }

  .page-card:hover {
    box-shadow: var(--shadow-elevated);
    transform: translateY(-1px);
    border-color: var(--border);
  }

  .page-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .page-title {
    font-size: 15px;
    font-weight: 500;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .page-badges {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .badge {
    font-size: 11px;
    font-weight: 500;
    padding: 2px 7px;
    border-radius: 9999px;
  }

  .page-card-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .page-slug {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-tertiary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .page-date {
    font-size: 12px;
    color: var(--text-tertiary);
    flex-shrink: 0;
    margin-left: 8px;
  }
</style>
