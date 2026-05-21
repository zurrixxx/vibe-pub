<script lang="ts">
  import { hideGlobalHeader } from '$lib/stores';
  import { browser } from '$app/environment';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  $effect(() => {
    if (!browser) return;
    hideGlobalHeader.set(true);
    return () => hideGlobalHeader.set(false);
  });

  $effect(() => {
    if (!browser) return;
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  });
</script>

<svelte:head>
  <title>{data.collectionTitle} — Print — vibe.pub</title>
</svelte:head>

<div class="print-page">
  <div class="print-toolbar no-print">
    <a href={data.returnHref} class="back-link">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7" /></svg
      >
      Back to collection
    </a>
    <button type="button" class="print-btn" onclick={() => window.print()}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        aria-hidden="true"
        ><path
          d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"
        /><rect x="6" y="14" width="12" height="8" /></svg
      >
      Print / Save as PDF
    </button>
  </div>

  <article class="print-doc print-collection">
    <header class="print-collection-head">
      <h1 class="print-title">{data.collectionTitle}</h1>
      {#if data.ownerUsername}
        <p class="print-meta">@{data.ownerUsername} · {data.chapters.length} chapters</p>
      {:else}
        <p class="print-meta">{data.chapters.length} chapters</p>
      {/if}
    </header>

    {#each data.chapters as chapter (chapter.chapterNum)}
      <section class="print-chapter">
        {#if chapter.partEyebrow}
          <p class="print-eyebrow">{chapter.partEyebrow}</p>
        {/if}
        <p class="print-ch-num">Chapter {chapter.chapterNum}</p>
        <h2 class="print-ch-title">{chapter.title}</h2>
        {#if chapter.view === 'kanban'}
          <pre class="print-kanban-source">{chapter.markdown}</pre>
        {:else}
          <div class="print-body">
            {@html chapter.html}
          </div>
        {/if}
      </section>
    {/each}

    <footer class="print-footer">
      <span>vibe.pub{data.returnHref}</span>
    </footer>
  </article>
</div>

<style>
  .print-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 24px;
  }

  .print-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 0;
    border-bottom: 1px solid var(--border);
    margin-bottom: 32px;
  }

  .back-link {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-secondary);
    text-decoration: none;
  }

  .back-link:hover {
    color: var(--text-primary);
  }

  .print-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 6px 14px;
    cursor: pointer;
  }

  .print-doc {
    background: white;
    padding: 48px;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    margin-bottom: 48px;
  }

  .print-collection-head {
    margin-bottom: 40px;
    padding-bottom: 24px;
    border-bottom: 2px solid #111;
  }

  .print-title {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #111;
    margin: 0 0 8px;
    line-height: 1.2;
  }

  .print-meta {
    font-family: var(--font-mono);
    font-size: 12px;
    color: #666;
    margin: 0;
  }

  .print-chapter {
    margin-bottom: 48px;
    padding-bottom: 40px;
    border-bottom: 1px solid #ddd;
    break-inside: avoid;
  }

  .print-chapter:last-of-type {
    border-bottom: none;
  }

  .print-eyebrow {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #888;
    margin: 0 0 8px;
  }

  .print-ch-num {
    font-family: var(--font-mono);
    font-size: 11px;
    color: #888;
    margin: 0 0 6px;
  }

  .print-ch-title {
    font-family: var(--font-serif);
    font-size: 24px;
    font-weight: 700;
    color: #111;
    margin: 0 0 24px;
    line-height: 1.25;
  }

  .print-body {
    font-family: var(--font-serif);
    font-size: 15px;
    line-height: 1.8;
    color: #111;
  }

  .print-body :global(h2) {
    font-size: 20px;
    margin: 1.5em 0 0.4em;
  }

  .print-body :global(h3) {
    font-size: 17px;
    margin: 1.2em 0 0.3em;
  }

  .print-body :global(p) {
    margin: 0 0 1em;
  }

  .print-kanban-source {
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    background: #f5f5f5;
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
  }

  .print-footer {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid #ddd;
    font-family: var(--font-mono);
    font-size: 11px;
    color: #888;
  }

  @media print {
    .no-print {
      display: none !important;
    }

    .print-page {
      max-width: none;
      padding: 0;
    }

    .print-doc {
      box-shadow: none;
      padding: 0;
      border-radius: 0;
    }

    .print-chapter {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  }
</style>
