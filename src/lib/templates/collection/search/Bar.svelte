<script lang="ts">
  import { goto } from '$app/navigation';
  import { clearSearchFromUrl } from './highlight';

  interface Props {
    searchQuery: string;
    pathname: string;
    search: string;
  }

  let { searchQuery, pathname, search }: Props = $props();

  const show = $derived(Boolean(searchQuery.trim()));

  function clearHighlights() {
    const url = new URL(pathname + search, window.location.origin);
    goto(clearSearchFromUrl(url), { replaceState: true, noScroll: true, keepFocus: true });
  }
</script>

{#if show}
  <div class="c-search-hl-bar" role="status">
    <span class="c-search-hl-label">
      Search result for: <strong>“{searchQuery.trim()}”</strong>
    </span>
    <button type="button" class="c-search-hl-clear" onclick={clearHighlights}>
      Clear result
    </button>
  </div>
{/if}

<style>
  .c-search-hl-bar {
    position: sticky;
    top: 56px;
    z-index: 39;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 8px 32px;
    background: color-mix(in srgb, var(--accent) 12%, var(--bg) 92%);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid color-mix(in srgb, var(--accent) 25%, var(--border));
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-secondary);
  }

  .c-search-hl-label strong {
    font-weight: 600;
    color: var(--text-primary);
  }

  .c-search-hl-clear {
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 500;
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text-primary);
    cursor: pointer;
    transition:
      background 140ms ease,
      border-color 140ms ease;
  }

  .c-search-hl-clear:hover {
    border-color: var(--border-hover);
    background: var(--surface-hover);
  }

  @media (max-width: 720px) {
    .c-search-hl-bar {
      padding: 8px 16px;
    }
  }
</style>
