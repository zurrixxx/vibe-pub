<script lang="ts">
  import { page } from '$app/stores';
  import Reader from '$lib/templates/collection/Reader.svelte';
  import { readerReadingMode, readerThemeIsDark, readerThemePreview } from '$lib/components/topbar';
  import type { PageTheme } from '$lib/types';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let effectiveTheme = $derived(
    ($readerThemePreview ?? data.collection.theme ?? 'default') as PageTheme
  );
  let themeWrapperDark = $derived(readerThemeIsDark(effectiveTheme));
  const searchQuery = $derived($page.url.searchParams.get('q') ?? '');
</script>

<svelte:head>
  <title
    >{data.showCover ? data.collection.title : (data.activePage?.title ?? data.collection.title)} — vibe.pub</title
  >
  <meta property="og:title" content={data.collection.title} />
  <meta
    property="og:description"
    content={data.collection.description ?? 'A collection on vibe.pub'}
  />
  <meta property="og:site_name" content="vibe.pub" />
</svelte:head>

<div
  class="c-reader-root theme-{effectiveTheme}"
  class:dark={themeWrapperDark}
  class:reading-scroll={$readerReadingMode === 'scroll'}
  class:has-search-result-bar={!data.showCover && !!searchQuery.trim()}
>
  <Reader {data} />
</div>
