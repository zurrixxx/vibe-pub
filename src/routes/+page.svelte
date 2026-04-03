<script lang="ts">
  import { enhance } from '$app/forms';

  interface Props {
    form: { url?: string; slug?: string; error?: string } | null;
  }
  let { form }: Props = $props();

  let view = $state<'doc' | 'kanban'>('doc');
  let showViewMenu = $state(false);
</script>

<svelte:head>
  <title>vibe.pub — paste markdown, get a link</title>
</svelte:head>

<main class="max-w-3xl mx-auto px-6 py-16">
  <div class="mb-10">
    <p class="font-mono text-zinc-500 dark:text-zinc-400 text-sm">Paste markdown. Get a link.</p>
  </div>

  {#if form?.url}
    <div class="mb-8 p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded font-mono text-sm">
      <span class="text-zinc-500 dark:text-zinc-400">published → </span>
      <a
        href={`/${form.slug}`}
        class="text-zinc-900 dark:text-zinc-100 underline underline-offset-2 hover:opacity-70 break-all"
      >
        {form.url}
      </a>
    </div>
  {/if}

  {#if form?.error}
    <div class="mb-4 text-sm text-red-600 dark:text-red-400 font-mono">{form.error}</div>
  {/if}

  <form method="POST" action="?/publish" use:enhance>
    <textarea
      name="markdown"
      placeholder="# Your title&#10;&#10;Start writing..."
      rows={14}
      class="w-full font-mono text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded p-4 resize-y focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 placeholder-zinc-400 dark:placeholder-zinc-600 text-zinc-900 dark:text-zinc-100"
    ></textarea>

    <input type="hidden" name="view" value={view} />

    <div class="mt-3 flex items-center gap-4">
      <button
        type="submit"
        class="font-mono text-sm px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded hover:opacity-80 transition-opacity"
      >
        Publish
      </button>

      <div class="relative">
        <button
          type="button"
          onclick={() => (showViewMenu = !showViewMenu)}
          class="font-mono text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          view: {view} ▾
        </button>
        {#if showViewMenu}
          <div class="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded shadow-sm z-10">
            {#each ['doc', 'kanban'] as v}
              <button
                type="button"
                onclick={() => { view = v as 'doc' | 'kanban'; showViewMenu = false; }}
                class="block w-full text-left font-mono text-sm px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                {v}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </form>

  <div class="mt-10 border-t border-zinc-100 dark:border-zinc-800 pt-8">
    <p class="font-mono text-xs text-zinc-400 dark:text-zinc-600 mb-2">— or —</p>
    <pre class="font-mono text-xs text-zinc-500 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-900 rounded p-3 overflow-x-auto">curl -X POST vibe.pub/api/pub \
  -d @file.md</pre>
  </div>
</main>
