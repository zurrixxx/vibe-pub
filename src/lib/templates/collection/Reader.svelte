<script lang="ts">
  import AppearancePanel from '$lib/components/topbar/AppearancePanel.svelte';
  import Panel from '$lib/components/comment/Panel.svelte';
  import { buildCanonicalPath } from '$lib/slug-path';
  import { readerReadingMode, readerThemeIsDark, readerThemePreview } from '$lib/components/topbar';
  import { closeDocCommentsPanel } from '$lib/stores';
  import type { PageFrontmatter, PageTheme } from '$lib/types';
  import type { Comment } from '$lib/types';
  import { page } from '$app/state';
  import DocChapter from './chapter/Doc.svelte';
  import KanbanChapter from './chapter/Kanban.svelte';
  import ScrollReader from './chapter/Scroll.svelte';
  import Cover from './Cover.svelte';
  import SearchBar from './search/Bar.svelte';
  import SearchPanel from './search/Panel.svelte';
  import SettingsPanel from './settings/Panel.svelte';
  import Spine from './Spine.svelte';
  import Topbar from './Topbar.svelte';
  import { chapterLede } from './chapter/index';
  import './reader.css';
  import type { PageData } from '../../../routes/c/[slug]/$types';

  let { data }: { data: PageData } = $props();

  let spineOpen = $state(false);
  let scrollActivePageId = $state('');
  let continuousMode = $derived($readerReadingMode === 'scroll');

  $effect(() => {
    const active = data.pages.find((p) => p.active);
    if (active) scrollActivePageId = active.id;
  });

  let spinePages = $derived(
    continuousMode && !data.showCover
      ? data.pages.map((p) => ({ ...p, active: p.id === scrollActivePageId }))
      : data.pages
  );

  let chapterCrumb = $derived(
    data.showCover
      ? 'cover'
      : (data.pages.find((p) => (continuousMode ? p.id === scrollActivePageId : p.active))?.title ??
          'chapter')
  );
  let hasPartStructure = $derived(data.parts.length > 0);
  let showSidebarNav = $derived(data.pages.length > 0 || hasPartStructure);
  const coverHref = $derived(`/c/${data.collection.slug}`);

  function pageHref(pageId: string) {
    return `/c/${data.collection.slug}?page=${pageId}`;
  }

  let chapterLedeText = $derived.by(() => {
    const ap = data.activePage;
    if (!ap) return null;
    return chapterLede({
      view: ap.view,
      frontmatter: ap.frontmatter as PageFrontmatter & Record<string, unknown>,
      html: ap.html,
      kanbanColumns: ap.kanbanData?.columns,
    });
  });

  let effectiveTheme = $derived(
    ($readerThemePreview ?? data.collection.theme ?? 'default') as PageTheme
  );
  let themeWrapperDark = $derived(readerThemeIsDark(effectiveTheme));

  let chapterProps = $derived.by(() => {
    const ap = data.activePage;
    const ch = data.chapter;
    if (!ap || !ch) return null;
    return {
      title: ap.title ?? ap.slug ?? 'Untitled',
      lede: chapterLedeText,
      partEyebrow: ch.partEyebrow,
      chapterNum: ch.num,
      totalChapters: ch.total,
      authorUsername: data.owner?.username ?? null,
      updated: ap.updated,
      pageHref: buildCanonicalPath({
        id: ap.id,
        slug: ap.slug ?? null,
        title: ap.title ?? null,
      }),
      prev: ch.prev,
      next: ch.next,
    };
  });

  let entryPageId = $derived(data.pages.find((p) => p.active)?.id ?? '');
  const searchQuery = $derived(page.url.searchParams.get('q') ?? '');

  let isKanbanChapter = $derived.by(() => {
    if (data.showCover) return false;
    if (continuousMode) {
      const id = scrollActivePageId || data.pages.find((p) => p.active)?.id;
      return data.pages.find((p) => p.id === id)?.view === 'kanban';
    }
    return data.activePage?.view === 'kanban';
  });

  let chapterComments = $state<Comment[]>([]);
  let chapterDocHtml = $state('');
  let lastDocChapterPageId = $state('');
  const commentsPanelTopPx = $derived(!data.showCover && searchQuery.trim() ? 96 : 56);

  $effect(() => {
    const ap = data.activePage;
    if (!ap || ap.view === 'kanban') {
      chapterComments = [];
      chapterDocHtml = '';
      return;
    }
    chapterComments = [...(ap.comments ?? [])];
    chapterDocHtml = ap.html ?? '';
  });

  $effect(() => {
    const id = data.activePage?.id ?? '';
    if (!id) return;
    if (lastDocChapterPageId && id !== lastDocChapterPageId) closeDocCommentsPanel();
    lastDocChapterPageId = id;
  });
</script>

<AppearancePanel
  showLineLength
  showReadingMode
  showKanbanBoardWidth={isKanbanChapter}
  publishedTheme={(data.collection.theme ?? 'default') as PageTheme}
/>

{#if data.pages.length > 0}
  <SearchPanel collectionSlug={data.collection.slug} />
{/if}

{#if data.isCollectionOwner && data.settingsChapters.length > 0}
  <SettingsPanel
    collectionSlug={data.collection.slug}
    collectionTitle={data.collection.title}
    chapters={data.settingsChapters}
    parts={data.settingsParts}
  />
{/if}

{#if !data.showCover}
  <Panel
    pageId={data.activePage?.id ?? ''}
    docHtml={chapterDocHtml}
    bind:comments={chapterComments}
    topPx={commentsPanelTopPx}
    scrollHeaderOffsetPx={commentsPanelTopPx + 74}
    enableBlockRevise={data.isCollectionOwner}
  />
{/if}

<Topbar
  user={data.user}
  collectionSlug={data.collection.slug}
  ownerUsername={data.owner?.username ?? null}
  chapterLabel={chapterCrumb}
  showSpineToggle={showSidebarNav}
  showSearch={data.pages.length > 0}
  isCollectionOwner={data.isCollectionOwner}
  onSpineToggle={() => (spineOpen = !spineOpen)}
/>

{#if !data.showCover && searchQuery.trim()}
  <SearchBar {searchQuery} pathname={page.url.pathname} search={page.url.search} />
{/if}

<div class="c-body" class:has-nav={showSidebarNav}>
  {#if showSidebarNav && spineOpen}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <button
      type="button"
      class="c-spine-backdrop"
      aria-label="Close contents"
      onclick={() => (spineOpen = false)}
    ></button>
  {/if}
  {#if showSidebarNav}
    <Spine
      mobileOpen={spineOpen}
      collectionTitle={data.collection.title}
      ownerUsername={data.owner?.username}
      parts={data.parts}
      ungroupedPages={data.ungroupedPages}
      {hasPartStructure}
      pages={spinePages}
      {pageHref}
      {coverHref}
      coverActive={data.showCover}
    />
  {/if}

  <div class="c-main">
    {#if data.showCover}
      <Cover
        title={data.collection.title}
        description={data.collection.description}
        readersGuide={data.collection.readers_guide}
        whatItsAbout={data.collection.what_its_about}
        whoItsFor={data.collection.who_its_for}
        howToReadIt={data.collection.how_to_read_it}
        ownerUsername={data.owner?.username ?? null}
        updated={data.collection.updated ?? null}
        parts={data.coverParts}
        pageCount={data.pages.length}
        ownerProfileHref={data.owner ? `/@${data.owner.username}` : null}
      />
    {:else if data.activePage && chapterProps}
      <div class="collection-page">
        {#if continuousMode && entryPageId && data.pages.length > 0}
          <ScrollReader
            collectionSlug={data.collection.slug}
            {entryPageId}
            {searchQuery}
            onChapterInView={(id) => {
              scrollActivePageId = id;
            }}
          />
        {:else if data.activePage.view === 'kanban'}
          <KanbanChapter
            {...chapterProps}
            pageId={data.activePage.id}
            markdown={data.activePage.markdown}
            comments={data.activePage.comments}
            initialColumns={data.activePage.kanbanData?.columns ?? []}
            initialLabels={data.activePage.kanbanData?.labels ?? {}}
            {searchQuery}
          />
        {:else}
          <DocChapter
            title={chapterProps.title}
            html={data.activePage.html}
            lede={chapterProps.lede}
            partEyebrow={chapterProps.partEyebrow}
            chapterNum={chapterProps.chapterNum}
            totalChapters={chapterProps.totalChapters}
            authorUsername={chapterProps.authorUsername}
            updated={chapterProps.updated}
            bind:comments={chapterComments}
            pageId={data.activePage.id}
            pageHref={chapterProps.pageHref}
            prev={chapterProps.prev}
            next={chapterProps.next}
            {searchQuery}
          />
        {/if}
      </div>
    {:else}
      <div class="empty-collection">
        <div class="empty-glyph"><em>v</em></div>
        {#if hasPartStructure}
          <h2 class="empty-title">No pages in this collection yet</h2>
          <p class="empty-sub">Parts are set up — add pages to each section.</p>
          <ul class="empty-parts-list">
            {#each data.parts as part}
              <li>
                <strong>{part.title}</strong>{part.pages.length
                  ? ` · ${part.pages.length} page(s)`
                  : ''}
              </li>
            {/each}
          </ul>
        {:else}
          <h2 class="empty-title">No pages yet</h2>
          <p class="empty-sub">Add pages to this collection via CLI or API.</p>
        {/if}
        <code class="empty-cmd"
          >vibe-pub collection add {data.collection.slug} &lt;page-slug&gt;</code
        >
      </div>
    {/if}
  </div>
</div>
