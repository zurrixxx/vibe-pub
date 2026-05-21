<script lang="ts">
  import type { ChapterLink } from './index';
  import { preserveSearchQueryOnHref } from '../search/highlight';

  interface Props {
    chapterNum: number;
    totalChapters: number;
    prev?: ChapterLink | null;
    next?: ChapterLink | null;
    searchQuery?: string | null;
  }

  let { chapterNum, totalChapters, prev = null, next = null, searchQuery = null }: Props = $props();

  const prevHref = $derived(prev ? preserveSearchQueryOnHref(prev.href, searchQuery) : null);
  const nextHref = $derived(next ? preserveSearchQueryOnHref(next.href, searchQuery) : null);
</script>

{#if prev || next}
  <nav class="c-pager" aria-label="Chapter navigation">
    {#if prev}
      <a class="c-pager-link c-pager-prev" href={prevHref}>
        <span class="c-pl-lbl">← Previous</span>
        <span class="c-pl-title">{prev.title}</span>
      </a>
    {:else}
      <span class="c-pager-link c-pager-prev disabled" aria-hidden="true">
        <span class="c-pl-lbl">← Previous</span>
        <span class="c-pl-title">—</span>
      </span>
    {/if}

    <div class="c-pager-center">
      <span class="c-pager-dots">{chapterNum} / {totalChapters}</span>
      <span class="c-pager-hint">in this collection</span>
    </div>

    {#if next}
      <a class="c-pager-link c-pager-next" href={nextHref}>
        <span class="c-pl-lbl">Next →</span>
        <span class="c-pl-title">{next.title}</span>
      </a>
    {:else}
      <span class="c-pager-link c-pager-next disabled" aria-hidden="true">
        <span class="c-pl-lbl">Next →</span>
        <span class="c-pl-title">—</span>
      </span>
    {/if}
  </nav>
{/if}

<style>
  .c-pager {
    margin-top: 80px;
    padding-top: 28px;
    border-top: 1px solid var(--border);
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 20px;
    align-items: stretch;
  }

  .c-pager-link {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 16px 18px;
    border-radius: 12px;
    text-decoration: none;
    color: inherit;
    transition: all 0.15s;
    border: 1px solid var(--border);
    background: transparent;
    min-width: 0;
  }

  .c-pager-link:hover {
    background: var(--surface);
    border-color: var(--text-primary);
    transform: translateY(-1px);
  }

  .c-pager-link.disabled {
    opacity: 0.35;
    pointer-events: none;
  }

  .c-pl-lbl {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-tertiary);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .c-pl-title {
    font-family: var(--font-serif);
    font-size: 18px;
    font-weight: 400;
    line-height: 1.25;
    color: var(--text-primary);
    letter-spacing: -0.01em;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .c-pager-next {
    text-align: right;
    align-items: flex-end;
  }

  .c-pager-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .c-pager-dots {
    font-variant-numeric: tabular-nums;
    color: var(--text-secondary);
    font-weight: 600;
    margin-bottom: 6px;
  }

  .c-pager-hint {
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  @media (max-width: 720px) {
    .c-pager {
      grid-template-columns: 1fr;
    }

    .c-pager-center {
      order: -1;
      padding: 0 0 8px;
    }

    .c-pager-next {
      text-align: left;
      align-items: flex-start;
    }
  }
</style>
