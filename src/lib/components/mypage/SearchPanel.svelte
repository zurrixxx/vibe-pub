<script lang="ts">
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import {
    buildMyPageSearchEntries,
    highlightSnippet,
    searchMyPage,
    type MyPageSearchEntry,
  } from './search';
  import { closeMyPageSearchPanel, myPageSearchPanelOpen, openMyPageSearchPanel } from './stores';

  interface Props {
    pages: {
      id: string;
      title?: string | null;
      slug?: string | null;
      canonicalPath: string;
      view?: string | null;
    }[];
    collections: { slug: string; title: string; description?: string | null }[];
  }

  let { pages, collections }: Props = $props();

  let query = $state('');
  let activeIndex = $state(0);
  let inputEl = $state<HTMLInputElement | null>(null);
  let resultsEl = $state<HTMLDivElement | null>(null);

  const entries = $derived(buildMyPageSearchEntries(pages, collections));
  const hits = $derived(searchMyPage(entries, query));
  const showPanel = $derived($myPageSearchPanelOpen);

  $effect(() => {
    if (!showPanel) {
      query = '';
      activeIndex = 0;
      return;
    }
    requestAnimationFrame(() => inputEl?.focus());
  });

  $effect(() => {
    query;
    activeIndex = 0;
  });

  /** Keep keyboard-selected hit visible inside the scrollable results list. */
  $effect(() => {
    const idx = activeIndex;
    const count = hits.length;
    if (!browser || !resultsEl || count === 0) return;
    requestAnimationFrame(() => {
      const hit = resultsEl?.querySelectorAll<HTMLElement>('.c-search-hit')[idx];
      hit?.scrollIntoView({ block: 'nearest' });
    });
  });

  function close() {
    closeMyPageSearchPanel();
  }

  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }

  function goToHit(index: number) {
    const hit = hits[index];
    if (!hit) return;
    close();
    goto(hit.entry.href);
  }

  function onInputKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (hits.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % hits.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + hits.length) % hits.length;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      goToHit(activeIndex);
    }
  }

  function kindLabel(entry: MyPageSearchEntry): string {
    return entry.kind === 'collection' ? 'Collection' : entry.meta;
  }

  $effect(() => {
    if (!browser || !showPanel) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && $myPageSearchPanelOpen) close();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  $effect(() => {
    if (!browser) return;
    function onShortcut(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if ($myPageSearchPanelOpen) close();
        else openMyPageSearchPanel();
      }
    }
    document.addEventListener('keydown', onShortcut);
    return () => document.removeEventListener('keydown', onShortcut);
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="c-search-backdrop" class:open={showPanel} onclick={onBackdropClick} role="presentation">
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="c-search-panel"
    class:open={showPanel}
    role="dialog"
    aria-modal="true"
    aria-label="Search pages and collections"
    onclick={(e) => e.stopPropagation()}
  >
    <div class="c-search-field">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"
        ><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg
      >
      <input
        bind:this={inputEl}
        type="search"
        class="c-search-input"
        placeholder="Search pages and collections…"
        bind:value={query}
        onkeydown={onInputKeydown}
        autocomplete="off"
        spellcheck="false"
        aria-label="Search pages and collections"
      />
      <kbd class="c-search-kbd" aria-hidden="true">esc</kbd>
    </div>

    <div class="c-search-results" bind:this={resultsEl} role="listbox" aria-label="Search results">
      {#if !query.trim()}
        <p class="c-search-msg">Search page titles, slugs, and collection names.</p>
      {:else if hits.length === 0}
        <p class="c-search-msg">No pages or collections match “{query.trim()}”.</p>
      {:else}
        {#each hits as hit, i (hit.entry.href)}
          <button
            type="button"
            class="c-search-hit"
            class:active={i === activeIndex}
            role="option"
            aria-selected={i === activeIndex}
            onclick={() => goToHit(i)}
            onmouseenter={() => (activeIndex = i)}
          >
            <span class="c-search-hit-title">
              <span class="c-search-hit-num">{kindLabel(hit.entry)}</span>
              {hit.entry.title}
            </span>
            <span class="c-search-hit-part">{hit.entry.href}</span>
            <span class="c-search-hit-snippet">{@html highlightSnippet(hit.snippet, query)}</span>
          </button>
        {/each}
      {/if}
    </div>

    <p class="c-search-foot">
      <span>↑↓ navigate</span>
      <span>↵ open</span>
      <span><kbd>⌘</kbd><kbd>K</kbd> toggle</span>
    </p>
  </div>
</div>

<style>
  .c-search-backdrop {
    position: fixed;
    inset: 0;
    z-index: 210;
    background: rgba(20, 18, 15, 0.45);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 180ms ease;
  }

  .c-search-backdrop.open {
    opacity: 1;
    pointer-events: auto;
  }

  .c-search-panel {
    position: fixed;
    top: 72px;
    left: 50%;
    transform: translateX(-50%) translateY(-8px);
    width: min(560px, calc(100vw - 32px));
    max-height: min(480px, calc(100vh - 120px));
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 14px;
    box-shadow:
      0 24px 64px -12px rgba(60, 45, 20, 0.35),
      0 0 0 1px rgba(60, 45, 20, 0.04);
    display: flex;
    flex-direction: column;
    opacity: 0;
    pointer-events: none;
    transition:
      opacity 200ms ease,
      transform 200ms ease;
    overflow: hidden;
  }

  .c-search-panel.open {
    opacity: 1;
    pointer-events: auto;
    transform: translateX(-50%) translateY(0);
  }

  .c-search-field {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .c-search-field svg {
    width: 18px;
    height: 18px;
    color: var(--text-tertiary);
    flex-shrink: 0;
  }

  .c-search-input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    font-family: var(--font-sans);
    font-size: 15px;
    color: var(--text-primary);
    outline: none;
  }

  .c-search-input::placeholder {
    color: var(--text-tertiary);
  }

  .c-search-kbd {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-tertiary);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 2px 6px;
    flex-shrink: 0;
  }

  .c-search-results {
    overflow-y: auto;
    padding: 6px;
    flex: 1;
    min-height: 0;
  }

  .c-search-msg {
    margin: 20px 14px;
    font-family: var(--font-prose);
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .c-search-hit {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    width: 100%;
    text-align: left;
    padding: 10px 12px;
    border: none;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    transition: background 120ms ease;
  }

  .c-search-hit:hover,
  .c-search-hit.active {
    background: color-mix(in srgb, var(--text-primary) 6%, transparent);
  }

  .c-search-hit-title {
    font-family: var(--font-serif);
    font-size: 15px;
    color: var(--text-primary);
    line-height: 1.3;
  }

  .c-search-hit-num {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
    margin-right: 6px;
    text-transform: capitalize;
  }

  .c-search-hit-part {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.04em;
    color: var(--text-tertiary);
  }

  .c-search-hit-snippet {
    font-family: var(--font-prose);
    font-size: 12px;
    line-height: 1.45;
    color: var(--text-secondary);
  }

  .c-search-hit-snippet :global(mark) {
    background: var(--search-highlight);
    color: var(--search-highlight-text);
    border-radius: 3px;
    padding: 0 2px;
    font-weight: 600;
  }

  .c-search-foot {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 14px;
    padding: 10px 16px;
    border-top: 1px solid var(--border);
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-tertiary);
    flex-shrink: 0;
  }

  .c-search-foot kbd {
    font-family: inherit;
    font-size: inherit;
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 0 4px;
    margin: 0 1px;
  }
</style>
