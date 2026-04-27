<script lang="ts">
  import { hideGlobalHeader } from '$lib/stores';
  import { browser } from '$app/environment';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Hide global header
  $effect(() => {
    if (!browser) return;
    hideGlobalHeader.set(true);
    return () => hideGlobalHeader.set(false);
  });

  // Auto-trigger print dialog
  $effect(() => {
    if (browser) {
      setTimeout(() => window.print(), 600);
    }
  });
</script>

<svelte:head>
  <title>{data.title} — vibe.pub</title>
</svelte:head>

<div class="print-page">
  <!-- Print toolbar (hidden when printing) -->
  <div class="print-toolbar no-print">
    <a href="/{data.slug}" class="back-link">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"><path d="M19 12H5m7-7-7 7 7 7" /></svg
      >
      Back to page
    </a>
    <button class="print-btn" onclick={() => window.print()}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        ><path
          d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"
        /><rect x="6" y="14" width="12" height="8" /></svg
      >
      Print
    </button>
  </div>

  <!-- Document -->
  <article class="print-doc">
    <header class="print-header">
      <h1 class="print-title">{data.title}</h1>
      {#if data.updated}
        <time class="print-date"
          >{new Date(data.updated).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}</time
        >
      {/if}
    </header>
    <div class="print-body">
      {@html data.html}
    </div>
    <footer class="print-footer">
      <span>vibe.pub/{data.slug}</span>
    </footer>
  </article>
</div>

<style>
  /* ═══ Screen styles ═══ */
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

  .print-btn:hover {
    border-color: var(--border-hover);
  }

  /* Document */
  .print-doc {
    background: white;
    padding: 48px;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    margin-bottom: 48px;
  }

  .print-header {
    margin-bottom: 32px;
    padding-bottom: 20px;
    border-bottom: 1px solid #e5e5e5;
  }

  .print-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #111;
    margin: 0 0 8px;
    line-height: 1.3;
  }

  .print-date {
    font-size: 13px;
    color: #888;
  }

  .print-body {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 15px;
    line-height: 1.8;
    color: #222;
  }

  .print-body :global(h1) {
    font-size: 24px;
    font-weight: 700;
    margin: 1.8em 0 0.5em;
    color: #111;
  }
  .print-body :global(h2) {
    font-size: 20px;
    font-weight: 700;
    margin: 1.5em 0 0.4em;
    color: #111;
  }
  .print-body :global(h3) {
    font-size: 17px;
    font-weight: 600;
    margin: 1.3em 0 0.3em;
    color: #111;
  }
  .print-body :global(p) {
    margin: 0 0 1em;
  }
  .print-body :global(strong) {
    color: #111;
  }
  .print-body :global(a) {
    color: #111;
    text-decoration: underline;
  }
  .print-body :global(blockquote) {
    border-left: 3px solid #ddd;
    padding-left: 16px;
    color: #555;
    font-style: italic;
    margin: 1em 0;
  }
  .print-body :global(ul),
  .print-body :global(ol) {
    padding-left: 1.5em;
    margin: 0 0 1em;
  }
  .print-body :global(li + li) {
    margin-top: 0.3em;
  }
  .print-body :global(code) {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.85em;
    background: #f5f5f5;
    padding: 2px 5px;
    border-radius: 3px;
  }
  .print-body :global(pre) {
    background: #f8f8f8;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    padding: 16px;
    overflow-x: auto;
    font-size: 13px;
    line-height: 1.6;
    margin: 1em 0;
  }
  .print-body :global(pre code) {
    background: none;
    padding: 0;
  }
  .print-body :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 14px;
  }
  .print-body :global(th) {
    text-align: left;
    font-weight: 600;
    padding: 8px 12px;
    border-bottom: 2px solid #ddd;
  }
  .print-body :global(td) {
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
  }
  .print-body :global(img) {
    max-width: 100%;
  }
  .print-body :global(hr) {
    border: none;
    border-top: 1px solid #ddd;
    margin: 2em 0;
  }

  .print-footer {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid #e5e5e5;
    font-size: 11px;
    color: #aaa;
    font-family: monospace;
  }

  /* ═══ Print styles ═══ */
  @media print {
    .no-print {
      display: none !important;
    }

    .print-page {
      max-width: none;
      padding: 0;
    }

    .print-doc {
      background: none;
      box-shadow: none;
      border-radius: 0;
      padding: 0;
      margin: 0;
    }

    .print-title {
      font-size: 24pt;
    }
    .print-body {
      font-size: 11pt;
      line-height: 1.6;
    }
    .print-body :global(h1) {
      font-size: 18pt;
    }
    .print-body :global(h2) {
      font-size: 15pt;
    }
    .print-body :global(h3) {
      font-size: 13pt;
    }
    .print-body :global(pre) {
      border: 1px solid #ccc;
      font-size: 9pt;
      page-break-inside: avoid;
    }
    .print-body :global(table) {
      font-size: 10pt;
    }
    .print-body :global(img) {
      max-width: 80%;
      page-break-inside: avoid;
    }
    .print-body :global(h1),
    .print-body :global(h2),
    .print-body :global(h3) {
      page-break-after: avoid;
    }

    .print-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 8pt;
      color: #bbb;
      border-top: 0.5pt solid #ddd;
      padding-top: 8pt;
    }

    @page {
      margin: 0;
      size: A4;
    }

    .print-doc {
      padding: 2cm;
    }
  }
</style>
