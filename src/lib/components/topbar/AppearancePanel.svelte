<script lang="ts">
  import { browser } from '$app/environment';
  import {
    READER_APPEARANCE_THEMES,
    READER_MEASURE_OPTIONS,
    measureLabel,
    readerFontSize,
    readerMeasure,
    readerReadingMode,
    readerThemePreview,
    type ReaderMeasure,
    type ReaderReadingMode,
  } from './appearance';
  import {
    closeReaderAppearancePanel,
    kanbanReaderBoardFullwidth,
    readerAppearancePanelOpen,
  } from './stores';
  import type { PageTheme } from '$lib/types';

  interface Props {
    /** Published / collection default theme when no session preview is set. */
    publishedTheme?: PageTheme | null;
    /** Collection reader only — doc pages hide line length. */
    showLineLength?: boolean;
    /** Collection reader only — doc pages hide reading mode. */
    showReadingMode?: boolean;
    /** Kanban chapter — board width toggle (same store as View toolbar). */
    showKanbanBoardWidth?: boolean;
  }

  let {
    publishedTheme = null,
    showLineLength = false,
    showReadingMode = false,
    showKanbanBoardWidth = false,
  }: Props = $props();

  let effectiveTheme = $derived(($readerThemePreview ?? publishedTheme ?? 'default') as PageTheme);
  let measureValLabel = $derived(measureLabel($readerMeasure));

  function onThemePick(id: PageTheme) {
    readerThemePreview.set(id);
  }

  function onMeasurePick(value: ReaderMeasure) {
    readerMeasure.set(value);
  }

  function onModePick(mode: ReaderReadingMode) {
    readerReadingMode.set(mode);
  }

  $effect(() => {
    if (!browser || !$readerAppearancePanelOpen) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (t.closest?.('.appearance-panel')) return;
      if (t.closest?.('.more-wrap [data-appearance-trigger]')) return;
      closeReaderAppearancePanel();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeReaderAppearancePanel();
    }
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  });

  $effect(() => {
    if (!browser) return;
    document.documentElement.style.setProperty('--reader-font-size', `${$readerFontSize}px`);
    if (showLineLength) {
      document.documentElement.style.setProperty('--reader-measure', $readerMeasure);
    } else {
      document.documentElement.style.removeProperty('--reader-measure');
    }
  });
</script>

<div
  class="appearance-panel"
  class:open={$readerAppearancePanelOpen}
  role="dialog"
  aria-modal="false"
  aria-label="Appearance"
  aria-hidden={!$readerAppearancePanelOpen}
>
  <div class="ap-section">
    <div class="ap-label">
      Theme <span class="val">{effectiveTheme}</span>
    </div>
    <div class="theme-grid">
      {#each READER_APPEARANCE_THEMES as row (row.id)}
        <button
          type="button"
          class="theme-chip {row.chipClass}"
          class:active={effectiveTheme === row.id}
          onclick={() => onThemePick(row.id)}
        >
          <span class="name">{row.label}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="ap-section">
    <div class="ap-label">
      Font size <span class="val">{$readerFontSize}px</span>
    </div>
    <input
      type="range"
      min="14"
      max="22"
      step="1"
      value={$readerFontSize}
      oninput={(e) => readerFontSize.set(Number(e.currentTarget.value))}
      aria-label="Font size"
    />
  </div>

  {#if showLineLength}
    <div class="ap-section">
      <div class="ap-label">
        Line length <span class="val">{measureValLabel}</span>
      </div>
      <div class="ap-row">
        {#each READER_MEASURE_OPTIONS as opt (opt.value)}
          <button
            type="button"
            class="ap-btn"
            class:active={$readerMeasure === opt.value}
            onclick={() => onMeasurePick(opt.value)}
          >
            {opt.label}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if showReadingMode}
    <div class="ap-section">
      <div class="ap-label">Reading mode</div>
      <div class="ap-row">
        <button
          type="button"
          class="ap-btn"
          class:active={$readerReadingMode === 'paged'}
          onclick={() => onModePick('paged')}
        >
          paged
        </button>
        <button
          type="button"
          class="ap-btn"
          class:active={$readerReadingMode === 'scroll'}
          onclick={() => onModePick('scroll')}
        >
          continuous
        </button>
      </div>
    </div>
  {/if}

  {#if showKanbanBoardWidth}
    <div class="ap-section">
      <div class="ap-label">
        Board width <span class="val">{$kanbanReaderBoardFullwidth ? 'full' : 'standard'}</span>
      </div>
      <div class="ap-row">
        <button
          type="button"
          class="ap-btn"
          class:active={!$kanbanReaderBoardFullwidth}
          onclick={() => kanbanReaderBoardFullwidth.set(false)}
        >
          standard
        </button>
        <button
          type="button"
          class="ap-btn"
          class:active={$kanbanReaderBoardFullwidth}
          onclick={() => kanbanReaderBoardFullwidth.set(true)}
        >
          full width
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .appearance-panel {
    position: fixed;
    top: 68px;
    right: 16px;
    width: 320px;
    max-width: calc(100vw - 32px);
    background: var(--bg);
    border-radius: 16px;
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.12),
      0 0 0 1px rgba(0, 0, 0, 0.06);
    padding: 20px;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-8px);
    transition:
      opacity 180ms ease,
      transform 180ms ease;
    z-index: 50;
    box-sizing: border-box;
  }

  .appearance-panel.open {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }

  .ap-section {
    margin-bottom: 18px;
  }

  .ap-section:last-child {
    margin-bottom: 0;
  }

  .ap-label {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-tertiary);
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .ap-label .val {
    color: var(--text-secondary);
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0;
  }

  .theme-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .theme-chip {
    position: relative;
    border-radius: 10px;
    padding: 10px 8px 8px;
    cursor: pointer;
    border: 1.5px solid transparent;
    transition: all 0.15s;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 10px;
    min-height: 54px;
  }

  .theme-chip.active {
    border-color: currentColor;
  }

  .theme-chip:hover {
    transform: translateY(-1px);
  }

  .theme-chip .name {
    font-weight: 600;
    text-transform: lowercase;
    letter-spacing: 0;
    font-size: 11px;
  }

  :global(.ap-chip-default) {
    background: #edeae5;
    color: #1a1917;
  }
  :global(.ap-chip-paper) {
    background: #faf8f5;
    color: #1c1917;
  }
  :global(.ap-chip-claude) {
    background: #f5f4ed;
    color: #c96442;
  }
  :global(.ap-chip-solarized) {
    background: #fdf6e3;
    color: #268bd2;
  }
  :global(.ap-chip-midnight) {
    background: #0f172a;
    color: #a5b4fc;
  }
  :global(.ap-chip-terminal) {
    background: #0c0c0c;
    color: #4ade80;
  }

  .ap-row {
    display: flex;
    gap: 6px;
  }

  .ap-btn {
    flex: 1;
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 500;
    padding: 8px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s;
  }

  .ap-btn:hover {
    color: var(--text-primary);
    border-color: var(--border-hover, var(--border));
  }

  .ap-btn.active {
    background: var(--text-primary);
    color: var(--bg);
    border-color: var(--text-primary);
  }

  input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 4px;
    background: var(--border);
    border-radius: 999px;
    outline: none;
  }

  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: var(--text-primary);
    border-radius: 50%;
    cursor: pointer;
  }

  input[type='range']::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: var(--text-primary);
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }
</style>
