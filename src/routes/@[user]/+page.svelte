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

  const viewBadgeColor: Record<string, string> = {
    doc: '#3b82f6',
    kanban: '#8b5cf6'
  };

  const accessBadgeColor: Record<string, string> = {
    public: '#22c55e',
    unlisted: 'var(--text-tertiary)',
    private: '#ef4444'
  };
</script>

<svelte:head>
  <title>@{profileUser.username} — vibe.pub</title>
</svelte:head>

<main class="max-w-[1080px] mx-auto px-6 py-12">
  <div style="margin-bottom: 32px;">
    <h1 style="font-family: var(--font-mono); font-size: 24px; font-weight: 600; letter-spacing: -0.48px; color: var(--text-primary); margin: 0 0 6px 0;">
      @{profileUser.username}
    </h1>
    {#if isOwner}
      <p style="font-size: 13px; color: var(--text-tertiary); margin: 0;">Your workspace</p>
    {/if}
  </div>

  {#if pages.length === 0}
    <p style="font-size: 14px; color: var(--text-secondary);">No pages yet.</p>
  {:else}
    <div class="flex flex-col gap-2">
      {#each pages as page}
        <a
          href={`/@${profileUser.username}/${page.slug}`}
          style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: var(--surface); box-shadow: var(--shadow-card); border-radius: 8px; text-decoration: none; transition: box-shadow 150ms;"
          onmouseenter={(e) => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-elevated)'}
          onmouseleave={(e) => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)'}
        >
          <div style="min-width: 0; flex: 1;">
            <span style="font-size: 15px; font-weight: 500; color: var(--text-primary); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              {page.title ?? page.slug}
            </span>
            <span style="font-family: var(--font-mono); font-size: 12px; color: var(--text-tertiary); margin-top: 2px; display: block;">
              {page.slug}
            </span>
          </div>
          <div class="flex items-center gap-2" style="margin-left: 16px; flex-shrink: 0;">
            <span style="font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 9999px; background: {viewBadgeColor[page.view] ? viewBadgeColor[page.view] + '18' : 'var(--surface-hover)'}; color: {viewBadgeColor[page.view] ?? 'var(--text-secondary)'};">
              {page.view}
            </span>
            {#if isOwner}
              <span style="font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 9999px; background: {accessBadgeColor[page.access] ? accessBadgeColor[page.access] + '18' : 'var(--surface-hover)'}; color: {accessBadgeColor[page.access] ?? 'var(--text-secondary)'};">
                {page.access}
              </span>
            {/if}
            <span style="font-size: 12px; color: var(--text-tertiary);" class="hidden sm:block">{formatDate(page.updated)}</span>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</main>
