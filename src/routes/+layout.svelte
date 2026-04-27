<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import Header from '$lib/components/Header.svelte';
  import { hideGlobalHeader } from '$lib/stores';

  interface Props {
    data: { user: { id: string; email: string; username: string } | null };
    children: import('svelte').Snippet;
  }
  let { data, children }: Props = $props();

  let pageTitle = $derived(($page.data as any)?.page?.title ?? null);
  // Hide header on collection pages (they render their own)
  let isCollectionPage = $derived($page.url.pathname.startsWith('/c/'));
</script>

<div
  class="min-h-screen"
  style="background: var(--bg); color: var(--text-primary); position: relative;"
>
  <div style="position: relative; z-index: 1;">
    {#if !$hideGlobalHeader && !isCollectionPage}
      <Header user={data.user} {pageTitle} />
    {/if}
    {@render children()}
  </div>
</div>
