<script lang="ts">
  import Head from './Head.svelte';
  import Layout from './Layout.svelte';
  import Pager from './Pager.svelte';
  import type { ChapterLink } from './index';
  import { searchHighlight } from '../search/highlight';
  import DocView from '$lib/templates/doc/DocView.svelte';
  import type { Comment } from '$lib/types';

  interface Props {
    title: string;
    html: string;
    lede?: string | null;
    partEyebrow?: string | null;
    chapterNum: number;
    totalChapters: number;
    authorUsername?: string | null;
    updated: string;
    comments?: Comment[];
    pageId: string;
    pageHref: string;
    prev?: ChapterLink | null;
    next?: ChapterLink | null;
    /** From URL `?q=` — highlight matches in chapter content. */
    searchQuery?: string | null;
  }

  let {
    title,
    html,
    lede = null,
    partEyebrow = null,
    chapterNum,
    totalChapters,
    authorUsername = null,
    updated,
    comments = $bindable([]),
    pageId,
    pageHref,
    prev = null,
    next = null,
    searchQuery = null,
  }: Props = $props();

  const highlightParams = $derived(
    searchQuery?.trim() ? { query: searchQuery, defer: true } : null
  );

  const bodyHtml = $derived(html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, ''));
</script>

<Layout>
  {#snippet head()}
    <Head
      {title}
      {lede}
      {partEyebrow}
      {chapterNum}
      {totalChapters}
      {authorUsername}
      {updated}
      {pageHref}
      {searchQuery}
    />
  {/snippet}

  {#snippet body()}
    <div class="c-ch-body" use:searchHighlight={highlightParams}>
      <DocView html={bodyHtml} title={null} bind:comments {pageId} />
    </div>
  {/snippet}

  {#snippet foot()}
    <Pager {chapterNum} {totalChapters} {prev} {next} {searchQuery} />
  {/snippet}
</Layout>

<style>
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
