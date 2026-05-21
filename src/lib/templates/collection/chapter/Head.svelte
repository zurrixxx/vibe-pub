<script lang="ts">
  import { formatChapterDate, titleEmphasisParts } from './index';
  import { searchHighlight } from '../search/highlight';

  interface Props {
    title: string;
    lede?: string | null;
    partEyebrow?: string | null;
    chapterNum: number;
    totalChapters: number;
    authorUsername?: string | null;
    updated: string;
    /** Tighter spacing below byline when kanban board follows (not doc prose). */
    compactFoot?: boolean;
    /** Canonical published page URL (e.g. `/my-slug-id`). */
    pageHref?: string | null;
    /** Align chapter head with full-width kanban board (Reader_Kanban page-head). */
    boardFullwidth?: boolean;
    searchQuery?: string | null;
  }

  let {
    title,
    lede = null,
    partEyebrow = null,
    chapterNum,
    totalChapters,
    authorUsername = null,
    updated,
    compactFoot = false,
    pageHref = null,
    boardFullwidth = false,
    searchQuery = null,
  }: Props = $props();

  const highlightParams = $derived(
    searchQuery?.trim() ? { query: searchQuery, defer: false, scroll: false } : null
  );

  const titleParts = $derived(titleEmphasisParts(title));
  const dateLabel = $derived(formatChapterDate(updated));
</script>

<header
  class="c-ch-head"
  class:board-fullwidth={boardFullwidth}
  use:searchHighlight={highlightParams}
>
  {#if partEyebrow || totalChapters > 0}
    <div class="c-ch-eyebrow">
      {#if partEyebrow}
        <span class="c-ch-part">{partEyebrow}</span>
        <span class="c-ch-sep">/</span>
      {/if}
      <span class="c-ch-num">Chapter {chapterNum} of {totalChapters}</span>
    </div>
  {/if}

  <h1 class="c-ch-title">
    {#if titleParts.emphasis}
      {titleParts.lead} <em>{titleParts.emphasis}</em>.
    {:else}
      {titleParts.lead}
    {/if}
  </h1>

  {#if lede?.trim()}
    <p class="c-ch-lede">{lede}</p>
  {/if}

  {#if authorUsername || dateLabel || pageHref}
    <div class="c-ch-byline" class:compact-foot={compactFoot}>
      {#if authorUsername}
        <span class="c-ch-author">@{authorUsername}</span>
      {/if}
      {#if authorUsername && dateLabel}
        <span class="c-ch-sep">·</span>
      {/if}
      {#if dateLabel}
        <span>{dateLabel}</span>
      {/if}
      {#if pageHref}
        {#if authorUsername || dateLabel}
          <span class="c-ch-byline-dot" aria-hidden="true"></span>
        {/if}
        <a href={pageHref} class="c-ch-page-btn">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
            ><path
              d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"
            /></svg
          >
          <span class="c-ch-page-btn-text">Open page</span>
        </a>
      {/if}
    </div>
  {/if}
</header>

<style>
  .c-ch-eyebrow {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
    margin-bottom: 18px;
  }

  .c-ch-part {
    color: var(--text-secondary);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 600;
  }

  .c-ch-num {
    font-variant-numeric: tabular-nums;
  }

  .c-ch-eyebrow .c-ch-sep {
    opacity: 0.45;
  }

  .c-ch-title {
    font-family: var(--font-serif);
    font-size: clamp(36px, 6vw, 52px);
    font-weight: 400;
    line-height: 1.04;
    letter-spacing: -0.028em;
    color: var(--text-primary);
    margin: 0 0 18px;
    text-wrap: balance;
  }

  .c-ch-title em {
    font-style: italic;
  }

  .c-ch-lede {
    font-family: var(--font-prose);
    font-size: 21px;
    line-height: 1.5;
    color: var(--text-secondary);
    margin: 0 0 32px;
    text-wrap: pretty;
  }

  .c-ch-byline {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-tertiary);
    margin: 0 0 44px;
    padding-bottom: 18px;
    border-bottom: 1px solid var(--border);
  }

  .c-ch-author {
    color: var(--text-secondary);
    font-weight: 500;
  }

  .c-ch-byline .c-ch-sep {
    opacity: 0.4;
  }

  .c-ch-byline.compact-foot {
    margin-bottom: 0;
    padding-bottom: 12px;
  }

  .c-ch-byline-dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--text-tertiary);
    flex-shrink: 0;
    opacity: 0.45;
  }

  /* Matches PublishedPage .meta-outline-btn (Hide outline) */
  .c-ch-page-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    padding: 4px 8px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.02em;
    text-decoration: none;
    cursor: pointer;
    transition:
      background 140ms ease,
      color 140ms ease;
  }

  .c-ch-page-btn svg {
    flex-shrink: 0;
  }

  .c-ch-page-btn:hover {
    color: var(--text-primary);
    background: rgba(0, 0, 0, 0.04);
  }

  :global(.dark) .c-ch-page-btn:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .c-ch-page-btn-text {
    white-space: nowrap;
  }

  .c-ch-head.board-fullwidth {
    max-width: none;
    padding-left: 32px;
    padding-right: 32px;
    box-sizing: border-box;
  }
</style>
