<script lang="ts">
  import DocView from '$lib/components/DocView.svelte';
  import KanbanView from '$lib/components/KanbanView.svelte';
  import Comments from '$lib/components/Comments.svelte';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }
  let { data }: Props = $props();

  let { page, html, comments } = $derived(data);
</script>

<svelte:head>
  <title>{page.title ?? page.slug} — vibe.pub</title>
</svelte:head>

<main class="max-w-[680px] mx-auto px-6 py-12">
  {#if page.view === 'kanban'}
    <KanbanView markdown={page.markdown} />
  {:else}
    <DocView {html} title={page.title} />
  {/if}

  <div style="margin-top: 64px; padding-top: 32px; border-top: 1px solid var(--border);">
    <Comments {comments} pageId={page.id} />
  </div>
</main>
