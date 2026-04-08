<script lang="ts">
  import DocView from '$lib/templates/doc/DocView.svelte';
  import KanbanView from '$lib/templates/kanban/KanbanView.svelte';
  import Comments from '$lib/components/Comments.svelte';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }
  let { data }: Props = $props();

  let { page, html, blocks, comments, frontmatter } = $derived(data);
</script>

<svelte:head>
  <title>{page.title ?? page.slug} -- vibe.pub</title>
</svelte:head>

<div
  class="theme-{page.theme ?? 'default'}"
  class:dark={['terminal', 'midnight', 'raycast', 'monokai', 'dracula'].includes(page.theme)}
  style="background: var(--bg); color: var(--text-primary); min-height: 100vh; padding: 32px 24px 80px;"
>
  <div style="max-width: {page.view === 'kanban' ? '1200px' : '720px'}; margin: 0 auto;">
    <div style="background: var(--surface); border-radius: var(--radius-card); box-shadow: var(--shadow-elevated); padding: 40px 48px; {page.view === 'kanban' ? 'overflow-x: auto;' : ''}">
      {#if page.view === 'kanban'}
        <KanbanView markdown={page.markdown} pageId={page.id} {comments} />
      {:else}
        <DocView {html} title={page.title} />
      {/if}
    </div>

    {#if page.view !== 'kanban'}
      <div style="margin-top: 32px; background: var(--surface); border-radius: var(--radius-card); box-shadow: var(--shadow-card); padding: 28px 32px;">
        <Comments {comments} pageId={page.id} />
      </div>
    {/if}
  </div>
</div>
