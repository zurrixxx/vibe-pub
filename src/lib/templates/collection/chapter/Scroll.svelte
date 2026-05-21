<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { tick } from 'svelte';
  import Board from './Board.svelte';
  import Head from './Head.svelte';
  import Layout from './Layout.svelte';
  import { getContinuousChaptersCache, setContinuousChaptersCache } from './scroll-cache';
  import type { ReaderChapterPayload } from '$lib/templates/collection/server/reader-chapter';
  import { searchHighlight } from '../search/highlight';
  import { kanbanReaderBoardFullwidth } from '$lib/components/topbar';
  import DocView from '$lib/templates/doc/DocView.svelte';

  interface Props {
    collectionSlug: string;
    /** Server-active page — spine navigation scrolls here; scroll sync does not. */
    entryPageId: string;
    searchQuery?: string | null;
    onChapterInView?: (id: string, title: string) => void;
  }

  let { collectionSlug, entryPageId, searchQuery = null, onChapterInView }: Props = $props();

  function highlightForChapter(chapterId: string) {
    const q = searchQuery?.trim();
    if (!q || chapterId !== entryPageId) return null;
    return { query: q, defer: true, scroll: true };
  }

  let chapters = $state<ReaderChapterPayload[]>([]);
  let ready = $state(false);
  let loading = $state(true);
  let loadError = $state('');
  let rootEl = $state<HTMLElement | null>(null);
  let lastEntryPageId = $state('');

  function bodyHtml(html: string) {
    return html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, '');
  }

  function scrollToChapter(id: string, behavior: ScrollBehavior = 'instant') {
    if (!browser || !rootEl) return;
    const el = rootEl.querySelector<HTMLElement>(`[data-chapter-id="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior, block: 'start' });
  }

  function syncChapterUrl(id: string) {
    if (!browser) return;
    const url = new URL(`/c/${collectionSlug}`, window.location.origin);
    url.searchParams.set('page', id);
    const q = searchQuery?.trim();
    if (q) url.searchParams.set('q', q);
    const target = `${url.pathname}${url.search}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === target) return;
    goto(target, { replaceState: true, noScroll: true, keepFocus: true });
  }

  async function loadAllChapters() {
    loading = true;
    loadError = '';
    ready = false;
    try {
      const cached = getContinuousChaptersCache(collectionSlug);
      if (cached?.length) {
        chapters = cached;
      } else {
        const res = await fetch(`/c/${collectionSlug}/chapters`);
        if (!res.ok) throw new Error('Failed to load collection');
        const data = (await res.json()) as { chapters: ReaderChapterPayload[] };
        chapters = data.chapters;
        setContinuousChaptersCache(collectionSlug, chapters);
      }
      ready = true;
      await tick();
      scrollToChapter(entryPageId, 'instant');
      lastEntryPageId = entryPageId;
    } catch (e) {
      loadError = e instanceof Error ? e.message : 'Failed to load';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (!browser) return;
    void loadAllChapters();
  });

  $effect(() => {
    if (!ready || !entryPageId || entryPageId === lastEntryPageId) return;
    lastEntryPageId = entryPageId;
    scrollToChapter(entryPageId, 'smooth');
  });

  $effect(() => {
    if (!browser || !rootEl || !ready) return;
    const sections = () => rootEl!.querySelectorAll<HTMLElement>('[data-chapter-id]');
    let visibleId: string | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        let best: { id: string; ratio: number } | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).dataset.chapterId;
          if (!id) continue;
          const ratio = entry.intersectionRatio;
          if (!best || ratio > best.ratio) best = { id, ratio };
        }
        if (!best) return;
        if (best.id === visibleId) return;
        visibleId = best.id;
        const ch = chapters.find((c) => c.id === best!.id);
        if (ch) {
          syncChapterUrl(ch.id);
          onChapterInView?.(ch.id, ch.title);
        }
      },
      { rootMargin: '-72px 0px -62% 0px', threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    );

    const observeAll = () => {
      observer.disconnect();
      for (const el of sections()) observer.observe(el);
    };
    observeAll();

    const mo = new MutationObserver(observeAll);
    mo.observe(rootEl, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mo.disconnect();
    };
  });
</script>

{#if loading}
  <div class="c-continuous-loading-wrap" aria-live="polite">
    <p class="c-continuous-loading">Loading collection…</p>
  </div>
{:else if loadError}
  <div class="c-continuous-loading-wrap" role="alert">
    <p class="c-continuous-loading">{loadError}</p>
  </div>
{:else}
  <div class="c-continuous" bind:this={rootEl}>
    {#each chapters as chapter, i (chapter.id)}
      <section
        class="c-continuous-chapter"
        class:c-continuous-chapter--kanban={chapter.view === 'kanban'}
        data-chapter-id={chapter.id}
        use:searchHighlight={highlightForChapter(chapter.id)}
      >
        {#if chapter.view === 'kanban'}
          <Layout bleed headFullwidth={$kanbanReaderBoardFullwidth}>
            {#snippet head()}
              <Head
                title={chapter.title}
                lede={chapter.lede}
                partEyebrow={chapter.partEyebrow}
                chapterNum={chapter.chapterNum}
                totalChapters={chapter.totalChapters}
                authorUsername={chapter.authorUsername}
                updated={chapter.updated}
                pageHref={chapter.pageHref}
                boardFullwidth={$kanbanReaderBoardFullwidth}
                searchQuery={chapter.id === entryPageId ? searchQuery : null}
                compactFoot
              />
            {/snippet}
            {#snippet body()}
              <Board
                markdown={chapter.markdown}
                pageId={chapter.pageId}
                comments={chapter.comments}
                initialColumns={chapter.kanbanData?.columns ?? []}
                initialLabels={chapter.kanbanData?.labels ?? {}}
              />
            {/snippet}
          </Layout>
        {:else}
          <Layout>
            {#snippet head()}
              <Head
                title={chapter.title}
                lede={chapter.lede}
                partEyebrow={chapter.partEyebrow}
                chapterNum={chapter.chapterNum}
                totalChapters={chapter.totalChapters}
                authorUsername={chapter.authorUsername}
                updated={chapter.updated}
                pageHref={chapter.pageHref}
                searchQuery={chapter.id === entryPageId ? searchQuery : null}
              />
            {/snippet}
            {#snippet body()}
              <div class="c-ch-body">
                <DocView
                  html={bodyHtml(chapter.html)}
                  title={null}
                  comments={chapter.comments}
                  pageId={chapter.pageId}
                />
              </div>
            {/snippet}
          </Layout>
        {/if}
      </section>
      {#if i < chapters.length - 1}
        <div class="c-continuous-join" aria-hidden="true"></div>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .c-continuous-loading-wrap {
    min-height: 40vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 32px;
  }

  .c-continuous-chapter :global(.c-reader) {
    padding-bottom: 48px;
  }

  .c-continuous-chapter--kanban :global(.c-reader) {
    padding-bottom: 64px;
  }

  .c-continuous-join {
    height: 1px;
    margin: 0 auto;
    max-width: var(--reader-measure, 780px);
    background: var(--border);
    opacity: 0.85;
  }

  .c-continuous-loading {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-tertiary);
    margin: 0;
  }

  .c-ch-body :global(.doc-wrap) {
    margin: 0;
  }

  .c-ch-body :global(article.doc-view) {
    max-width: none !important;
    width: 100%;
    font-family: var(--font-prose);
    font-size: var(--reader-font-size, 18px);
    line-height: 1.72;
    color: var(--text-primary);
  }

  .c-ch-body :global(article.doc-view :is(h2)) {
    font-family: var(--font-serif);
    font-size: 30px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.18;
    margin: 56px 0 18px;
    scroll-margin-top: 96px;
  }

  .c-ch-body :global(article.doc-view :is(h3)) {
    font-family: var(--font-serif);
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1.25;
    margin: 36px 0 12px;
    scroll-margin-top: 96px;
  }

  .c-ch-body :global(article.doc-view :is(p, ul, ol)) {
    margin-bottom: 22px;
    text-wrap: pretty;
  }

  .c-ch-body :global(article.doc-view :is(ul, ol)) {
    padding-left: 24px;
    margin: 0 0 22px;
  }

  .c-ch-body :global(article.doc-view li) {
    margin: 0 0 8px;
  }

  .c-ch-body :global(article.doc-view strong) {
    font-weight: 700;
    color: var(--text-primary);
  }

  .c-ch-body :global(article.doc-view em) {
    font-style: italic;
  }

  .c-ch-body :global(article.doc-view a) {
    color: var(--text-primary);
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-thickness: 1.5px;
    text-decoration-color: rgba(0, 0, 0, 0.25);
  }

  :global(.dark) .c-ch-body :global(article.doc-view a) {
    text-decoration-color: rgba(255, 255, 255, 0.3);
  }

  .c-ch-body :global(article.doc-view a:hover) {
    text-decoration-color: var(--text-primary);
  }

  .c-ch-body :global(article.doc-view :not(pre) > code) {
    font-family: var(--font-mono);
    font-size: 0.85em;
    background: rgba(0, 0, 0, 0.05);
    color: var(--text-primary);
    padding: 2px 6px;
    border-radius: 4px;
  }

  :global(.dark) .c-ch-body :global(article.doc-view :not(pre) > code) {
    background: rgba(255, 255, 255, 0.08);
  }

  .c-ch-body :global(article.doc-view pre) {
    padding: 22px 26px;
    border-radius: 12px;
    margin: 28px 0;
  }

  .c-ch-body :global(article.doc-view pre:not(.shiki)) {
    background: #0f0f14;
    color: #e2e8f0;
  }

  .c-ch-body :global(article.doc-view pre code) {
    background: transparent;
    padding: 0;
    font-size: inherit;
  }

  .c-ch-body :global(article.doc-view blockquote) {
    border-left: 3px solid var(--text-primary);
    padding: 2px 0 2px 22px;
    margin: 28px 0;
    font-style: italic;
    color: var(--text-secondary);
    font-size: 1.05em;
  }

  .c-ch-body :global(article.doc-view hr) {
    border: none;
    border-top: 1px solid var(--border);
    margin: 40px 0;
  }
</style>
