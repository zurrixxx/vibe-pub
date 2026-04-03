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

  const viewBadge: Record<string, string> = {
    doc: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    kanban: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
  };

  const accessBadge: Record<string, string> = {
    public: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    unlisted: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    private: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };
</script>

<svelte:head>
  <title>@{profileUser.username} — vibe.pub</title>
</svelte:head>

<main class="max-w-3xl mx-auto px-6 py-12">
  <div class="mb-8">
    <h1 class="font-mono text-2xl font-bold">@{profileUser.username}</h1>
    {#if isOwner}
      <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Your workspace</p>
    {/if}
  </div>

  {#if pages.length === 0}
    <p class="text-zinc-500 dark:text-zinc-400 text-sm">No pages yet.</p>
  {:else}
    <div class="flex flex-col gap-3">
      {#each pages as page}
        <a
          href={`/@${profileUser.username}/${page.slug}`}
          class="group flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
        >
          <div class="min-w-0 flex-1">
            <span class="font-medium text-zinc-900 dark:text-zinc-100 group-hover:underline truncate block">
              {page.title ?? page.slug}
            </span>
            <span class="font-mono text-xs text-zinc-400 mt-0.5 block">{page.slug}</span>
          </div>
          <div class="flex items-center gap-2 ml-4 flex-shrink-0">
            <span class="text-xs px-2 py-0.5 rounded-full font-medium {viewBadge[page.view] ?? ''}">
              {page.view}
            </span>
            {#if isOwner}
              <span class="text-xs px-2 py-0.5 rounded-full font-medium {accessBadge[page.access] ?? ''}">
                {page.access}
              </span>
            {/if}
            <span class="text-xs text-zinc-400 hidden sm:block">{formatDate(page.updated)}</span>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</main>
