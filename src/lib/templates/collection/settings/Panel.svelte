<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { browser } from '$app/environment';
  import {
    type SettingsChapter,
    type SettingsPart,
    buildDropSlotMap,
    buildSettingsListRows,
    computeSortOrders,
    isNoOpDrop,
    isSlotAboveFirstPart,
    listRowKey,
    showBeforeChapterSlot,
    viewToPill,
  } from './index';
  import { closeSettingsPanel, settingsPanelOpen } from '../stores';

  interface Props {
    collectionSlug: string;
    collectionTitle: string;
    chapters: SettingsChapter[];
    parts: SettingsPart[];
  }

  let { collectionSlug, collectionTitle, chapters: initialChapters, parts }: Props = $props();

  let working = $state<SettingsChapter[]>([]);
  let saving = $state(false);
  let saveError = $state<string | null>(null);
  let dragFrom = $state<number | null>(null);
  let activeDropSlot = $state<string | null>(null);
  /** Detached drag image — must not live under a transformed ancestor. */
  let dragGhostEl: HTMLElement | null = null;

  const dropSlots = $derived(buildDropSlotMap(working, parts));
  const listRows = $derived(buildSettingsListRows(working, parts));

  $effect(() => {
    if ($settingsPanelOpen) {
      working = initialChapters.map((ch) => ({ ...ch }));
      saveError = null;
      dragFrom = null;
      activeDropSlot = null;
      removeDragGhost();
    }
  });

  function setActiveSlot(slotId: string | null) {
    if (dragFrom === null || !slotId) {
      activeDropSlot = null;
      return;
    }
    if (isSlotAboveFirstPart(slotId, working, parts)) {
      activeDropSlot = null;
      return;
    }
    const slot = dropSlots.get(slotId);
    if (!slot) {
      activeDropSlot = null;
      return;
    }
    const ch = working[dragFrom];
    activeDropSlot = isNoOpDrop(dragFrom, slot, ch) ? null : slotId;
  }

  function pointerIsTopHalf(e: DragEvent): boolean {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return e.clientY < rect.top + rect.height / 2;
  }

  function close() {
    closeSettingsPanel();
  }

  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && $settingsPanelOpen) close();
  }

  $effect(() => {
    if (!browser || !$settingsPanelOpen) return;
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  });

  function removeDragGhost() {
    dragGhostEl?.remove();
    dragGhostEl = null;
  }

  function onDragStart(e: DragEvent, index: number) {
    const el = e.currentTarget as HTMLElement | null;
    if (!el || !e.dataTransfer) return;

    e.dataTransfer.effectAllowed = 'move';

    const rect = el.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    removeDragGhost();
    const ghost = el.cloneNode(true) as HTMLElement;
    ghost.removeAttribute('draggable');
    ghost.classList.remove('dragging');
    ghost.classList.add('cfg-chapter-drag-ghost');
    ghost.style.position = 'fixed';
    ghost.style.top = '-9999px';
    ghost.style.left = '0';
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.boxSizing = 'border-box';
    ghost.style.opacity = '1';
    ghost.style.pointerEvents = 'none';
    ghost.style.margin = '0';
    document.body.appendChild(ghost);
    dragGhostEl = ghost;

    e.dataTransfer.setDragImage(ghost, offsetX, offsetY);
    dragFrom = index;
  }

  function onSlotDragOver(e: DragEvent, slotId: string) {
    e.preventDefault();
    e.stopPropagation();
    setActiveSlot(slotId);
  }

  function onPartHeaderDragOver(e: DragEvent, partId: string, isFirstPart: boolean) {
    e.preventDefault();
    e.stopPropagation();
    if (pointerIsTopHalf(e) && isFirstPart) {
      setActiveSlot(null);
      return;
    }
    setActiveSlot(pointerIsTopHalf(e) ? `before-part-${partId}` : `after-part-${partId}`);
  }

  function onChapterDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    if (dragFrom === null) return;
    const top = pointerIsTopHalf(e);
    const ch = working[index];
    const partIdx = ch.partId ? parts.findIndex((p) => p.id === ch.partId) : -1;

    if (top) {
      if (partIdx >= 0) {
        const prevInPart = index > 0 && working[index - 1].partId === ch.partId;
        setActiveSlot(prevInPart ? `before-${index}` : `after-part-${ch.partId}`);
      } else {
        setActiveSlot(`before-${index}`);
      }
      return;
    }

    if (partIdx >= 0 && partIdx < parts.length - 1) {
      const nextPart = parts[partIdx + 1];
      const nextHasChapters = working.some((c) => c.partId === nextPart.id);
      if (!nextHasChapters) {
        setActiveSlot(`in-part-${nextPart.id}`);
        return;
      }
    }

    if (index + 1 < working.length) {
      const next = working[index + 1];
      if (next.partId && next.partId !== ch.partId) {
        setActiveSlot(`before-part-${next.partId}`);
      } else {
        setActiveSlot(`before-${index + 1}`);
      }
    } else {
      setActiveSlot('after-last');
    }
  }

  function onListDragOver(e: DragEvent) {
    e.preventDefault();
  }

  function onListDragLeave(e: DragEvent) {
    const list = e.currentTarget as HTMLElement;
    const related = e.relatedTarget as Node | null;
    if (related && list.contains(related)) return;
    activeDropSlot = null;
  }

  function onDropSlot(slotId: string) {
    const slot = dropSlots.get(slotId);
    if (dragFrom === null || !slot || isNoOpDrop(dragFrom, slot, working[dragFrom])) {
      dragFrom = null;
      activeDropSlot = null;
      return;
    }
    const next = [...working];
    const [moved] = next.splice(dragFrom, 1);
    const targetIndex = dragFrom < slot.insertAt ? slot.insertAt - 1 : slot.insertAt;
    next.splice(targetIndex, 0, moved);
    moved.partId = slot.partId;
    working = next;
    dragFrom = null;
    activeDropSlot = null;
  }

  function onSlotDrop(e: DragEvent, slotId: string) {
    e.preventDefault();
    e.stopPropagation();
    onDropSlot(activeDropSlot ?? slotId);
  }

  function onDragEnd() {
    dragFrom = null;
    activeDropSlot = null;
    removeDragGhost();
  }

  async function save() {
    if (saving) return;
    saving = true;
    saveError = null;

    const initialById = new Map(initialChapters.map((ch) => [ch.id, ch]));
    const newSortOrders = computeSortOrders(working);

    try {
      for (const ch of working) {
        const orig = initialById.get(ch.id);
        if (!orig) continue;

        const nextSort = newSortOrders.get(ch.id)!;

        if (nextSort !== orig.sortOrder || ch.partId !== orig.partId) {
          const res = await fetch(
            `/api/collection/${encodeURIComponent(collectionSlug)}/pages/${encodeURIComponent(ch.pageSlug)}`,
            {
              method: 'PUT',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                sort_order: nextSort,
                part_id: ch.partId,
              }),
            }
          );
          if (!res.ok) throw new Error(`Could not update order for ${ch.title}`);
        }
      }

      await invalidateAll();
      close();
    } catch (e) {
      saveError = e instanceof Error ? e.message : 'Save failed';
    } finally {
      saving = false;
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="cfg-backdrop"
  class:open={$settingsPanelOpen}
  onclick={onBackdropClick}
  role="presentation"
>
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="cfg-panel"
    class:open={$settingsPanelOpen}
    role="dialog"
    aria-modal="true"
    aria-label="Collection settings"
    onclick={(e) => e.stopPropagation()}
  >
    <div class="cfg-head">
      <div>
        <div class="kicker">collection settings</div>
        <h2>{collectionTitle}</h2>
      </div>
      <button type="button" class="cfg-close" aria-label="Close" onclick={close}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
          ><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg
        >
      </button>
    </div>

    <div class="cfg-body">
      <div class="cfg-section">
        <div class="cfg-section-head">
          <div>
            <h3>Chapter order &amp; view</h3>
            <p class="hint">
              Drag to reorder chapters. The <code>doc</code> / <code>deck</code> /
              <code>kanban</code> badge reflects each page’s current view.
            </p>
          </div>
        </div>

        <div
          class="cfg-chapter-list"
          role="list"
          ondragover={onListDragOver}
          ondragleave={onListDragLeave}
        >
          {#each listRows as row, ri (listRowKey(row))}
            {@const next = listRows[ri + 1]}
            {#if row.type === 'ungrouped-label'}
              <div class="cfg-chapter cfg-chapter--divider">
                <span class="part-divider">Ungrouped</span>
              </div>
            {:else if row.type === 'part'}
              {@const part = row.part}
              <div class="cfg-part-block">
                {#if !row.isFirstPart}
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div
                    class="drop-slot"
                    ondragover={(e) => onSlotDragOver(e, `before-part-${part.id}`)}
                    ondrop={(e) => onSlotDrop(e, `before-part-${part.id}`)}
                  >
                    {#if activeDropSlot === `before-part-${part.id}`}
                      <div class="drop-line" aria-hidden="true"></div>
                    {/if}
                  </div>
                {/if}
                <div
                  class="cfg-chapter cfg-chapter--divider"
                  ondragover={(e) => onPartHeaderDragOver(e, part.id, row.isFirstPart)}
                  ondrop={(e) => onSlotDrop(e, activeDropSlot ?? `after-part-${part.id}`)}
                >
                  <span class="part-divider">Part {part.partNum} · {part.title}</span>
                </div>
                {#if next?.type === 'chapter'}
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div
                    class="drop-slot"
                    ondragover={(e) => onSlotDragOver(e, `after-part-${part.id}`)}
                    ondrop={(e) => onSlotDrop(e, `after-part-${part.id}`)}
                  >
                    {#if activeDropSlot === `after-part-${part.id}`}
                      <div class="drop-line" aria-hidden="true"></div>
                    {/if}
                  </div>
                {/if}
              </div>
            {:else if row.type === 'empty-part-drop'}
              {@const part = row.part}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="drop-slot cfg-part-empty"
                ondragover={(e) => onSlotDragOver(e, `in-part-${part.id}`)}
                ondrop={(e) => onSlotDrop(e, `in-part-${part.id}`)}
              >
                {#if activeDropSlot === `in-part-${part.id}`}
                  <div class="drop-line" aria-hidden="true"></div>
                {/if}
              </div>
            {:else if row.type === 'chapter'}
              {@const index = row.chapterIndex}
              {@const ch = working[index]}
              {@const viewLabel = viewToPill(ch.view)}
              {#if showBeforeChapterSlot(ri, listRows, parts)}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                  class="drop-slot"
                  ondragover={(e) => onSlotDragOver(e, `before-${index}`)}
                  ondrop={(e) => onSlotDrop(e, `before-${index}`)}
                >
                  {#if activeDropSlot === `before-${index}`}
                    <div class="drop-line" aria-hidden="true"></div>
                  {/if}
                </div>
              {/if}
              <div
                class="cfg-chapter"
                class:dragging={dragFrom === index}
                draggable="true"
                role="listitem"
                ondragstart={(e) => onDragStart(e, index)}
                ondragover={(e) => onChapterDragOver(e, index)}
                ondrop={(e) => onSlotDrop(e, activeDropSlot ?? `before-${index}`)}
                ondragend={onDragEnd}
              >
                <span class="drag" aria-hidden="true">⋮⋮</span>
                <span class="cn">{index + 1} · {ch.title}</span>
                <span class="cfg-ch-meta">
                  <span
                    class="cv-pill"
                    class:deck={viewLabel === 'deck'}
                    class:kanban={viewLabel === 'kanban'}
                    aria-label="View: {viewLabel}"
                  >
                    {viewLabel}
                  </span>
                  <span class="cfilename" title={ch.filename}>{ch.filename}</span>
                </span>
              </div>
            {/if}
          {/each}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="drop-slot"
            ondragover={(e) => onSlotDragOver(e, 'after-last')}
            ondrop={(e) => onSlotDrop(e, 'after-last')}
          >
            {#if activeDropSlot === 'after-last'}
              <div class="drop-line" aria-hidden="true"></div>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <div class="cfg-foot">
      {#if saveError}
        <span class="cfg-error" role="alert">{saveError}</span>
      {:else}
        <span class="hint">Changes apply to this collection immediately.</span>
      {/if}
      <div class="cfg-foot-r">
        <button type="button" class="cfg-btn ghost" onclick={close} disabled={saving}>Cancel</button
        >
        <button type="button" class="cfg-btn primary" onclick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .cfg-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(20, 18, 15, 0.5);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    z-index: 200;
    opacity: 0;
    pointer-events: none;
    transition: opacity 220ms ease;
  }

  .cfg-backdrop.open {
    opacity: 1;
    pointer-events: auto;
  }

  .cfg-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -48%) scale(0.98);
    width: min(780px, calc(100vw - 48px));
    max-height: min(720px, calc(100vh - 80px));
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 14px;
    box-shadow:
      0 40px 80px -20px rgba(60, 45, 20, 0.35),
      0 0 0 1px rgba(60, 45, 20, 0.04);
    z-index: 201;
    display: flex;
    flex-direction: column;
    opacity: 0;
    pointer-events: none;
    transition:
      opacity 260ms ease,
      transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
    overflow: hidden;
  }

  .cfg-panel.open {
    opacity: 1;
    pointer-events: auto;
    transform: translate(-50%, -50%) scale(1);
  }

  .cfg-head {
    padding: 22px 26px 18px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    background: var(--surface-hover);
  }

  .cfg-head .kicker {
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin-bottom: 6px;
  }

  .cfg-head h2 {
    font-family: var(--font-serif);
    font-size: 22px;
    font-weight: 500;
    letter-spacing: -0.01em;
    margin: 0;
    color: var(--text-primary);
  }

  .cfg-close {
    background: transparent;
    border: 1px solid var(--border);
    width: 30px;
    height: 30px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 140ms ease;
  }

  .cfg-close:hover {
    color: var(--text-primary);
    border-color: var(--border-hover);
    background: var(--surface-hover);
  }

  .cfg-close svg {
    width: 14px;
    height: 14px;
  }

  .cfg-body {
    overflow-y: auto;
    padding: 4px 26px 16px;
    flex: 1;
  }

  .cfg-section {
    padding: 16px 0;
  }

  .cfg-section-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    margin-bottom: 12px;
  }

  .cfg-section h3 {
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.005em;
    color: var(--text-primary);
    margin: 0 0 3px;
  }

  .cfg-section .hint {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0;
    max-width: 560px;
  }

  .cfg-section .hint code {
    font-family: var(--font-mono);
    font-size: 11px;
    background: var(--surface-hover);
    border: 1px solid var(--border);
    padding: 0 4px;
    border-radius: 3px;
    color: var(--accent);
  }

  .cfg-chapter-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .cfg-part-block {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* Zero-height in flow; hit area + line are absolutely positioned (no layout jump on drag). */
  .drop-slot {
    position: relative;
    height: 0;
    margin: 0;
    padding: 0;
    flex-shrink: 0;
    overflow: visible;
    z-index: 2;
  }

  .drop-slot::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: -6px;
    height: 12px;
  }

  .drop-line {
    position: absolute;
    left: 4px;
    right: 4px;
    top: 0;
    height: 2px;
    margin: 0;
    transform: translateY(-50%);
    border-radius: 1px;
    background: var(--accent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent);
    pointer-events: none;
  }

  /* Empty part: invisible hit area only (no placeholder bar). */
  .cfg-part-empty {
    margin: 0;
  }

  .cfg-part-empty::before {
    top: -4px;
    height: 16px;
  }

  .cfg-chapter {
    display: grid;
    grid-template-columns: 16px minmax(0, 1fr) minmax(0, 13rem);
    gap: 10px;
    align-items: center;
    padding: 9px 12px;
    background: var(--surface-hover);
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 13px;
    cursor: grab;
    transition:
      border-color 140ms ease,
      background 140ms ease;
  }

  .cfg-chapter--divider {
    grid-template-columns: 1fr;
    cursor: default;
    background: transparent;
    border-color: transparent;
    padding: 8px 12px 2px;
  }

  .cfg-chapter:hover:not(.cfg-chapter--divider) {
    border-color: var(--border-hover);
  }

  .cfg-chapter.dragging {
    opacity: 0.4;
    cursor: grabbing;
    border-color: var(--border);
    box-shadow: none;
  }

  .cfg-chapter .drag {
    color: var(--border-hover);
    font-family: var(--font-mono);
    font-size: 14px;
    line-height: 1;
    letter-spacing: -2px;
  }

  .cfg-chapter .cn {
    color: var(--text-primary);
    font-family: var(--font-serif);
    font-size: 14px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cfg-ch-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    max-width: 100%;
    justify-self: stretch;
  }

  .cv-pill {
    flex-shrink: 0;
    width: 52px;
    box-sizing: border-box;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.06em;
    padding: 2px 0;
    border-radius: 4px;
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    cursor: default;
    user-select: none;
    text-transform: lowercase;
    text-align: center;
  }

  .cv-pill.deck {
    color: #3a5fa0;
    border-color: #c8d4e8;
    background: #eaf0f9;
  }

  .cv-pill.kanban {
    color: #7a5228;
    border-color: #e5d2b5;
    background: #f6ecd9;
  }

  .cfilename {
    flex: 1 1 0;
    min-width: 0;
    font-size: 10px;
    opacity: 0.55;
    font-family: var(--font-mono);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: right;
  }

  .part-divider {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-secondary);
    opacity: 0.7;
  }

  .cfg-foot {
    padding: 14px 26px;
    border-top: 1px solid var(--border);
    background: var(--surface-hover);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .cfg-foot .hint {
    font-size: 11px;
    color: var(--text-secondary);
    font-family: var(--font-mono);
  }

  .cfg-error {
    font-size: 12px;
    color: #b42318;
  }

  .cfg-foot-r {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .cfg-btn {
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 500;
    padding: 8px 16px;
    border-radius: 7px;
    cursor: pointer;
    transition: all 140ms ease;
    border: 1px solid var(--border);
  }

  .cfg-btn.ghost {
    background: transparent;
    color: var(--text-secondary);
  }

  .cfg-btn.ghost:hover:not(:disabled) {
    color: var(--text-primary);
    background: var(--bg);
  }

  .cfg-btn.primary {
    background: var(--text-primary);
    color: var(--bg);
    border-color: var(--text-primary);
  }

  .cfg-btn.primary:hover:not(:disabled) {
    background: var(--accent);
    border-color: var(--accent);
  }

  .cfg-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  /* Drag ghost is mounted on document.body — needs :global (scoped CSS won't apply). */
  :global(.cfg-chapter-drag-ghost) {
    display: grid;
    grid-template-columns: 16px minmax(0, 1fr) minmax(0, 13rem);
    gap: 10px;
    align-items: center;
    padding: 9px 12px;
    background: var(--surface-hover);
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 13px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    color: var(--text-primary);
  }

  :global(.cfg-chapter-drag-ghost .drag) {
    color: var(--border-hover);
    font-family: var(--font-mono);
    font-size: 14px;
    line-height: 1;
    letter-spacing: -2px;
  }

  :global(.cfg-chapter-drag-ghost .cn) {
    font-family: var(--font-serif);
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.cfg-chapter-drag-ghost .cfg-ch-meta) {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    max-width: 100%;
  }

  :global(.cfg-chapter-drag-ghost .cv-pill) {
    flex-shrink: 0;
    width: 52px;
    box-sizing: border-box;
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 2px 0;
    border-radius: 4px;
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    text-align: center;
    text-transform: lowercase;
  }

  :global(.cfg-chapter-drag-ghost .cv-pill.deck) {
    color: #3a5fa0;
    border-color: #c8d4e8;
    background: #eaf0f9;
  }

  :global(.cfg-chapter-drag-ghost .cv-pill.kanban) {
    color: #7a5228;
    border-color: #e5d2b5;
    background: #f6ecd9;
  }

  :global(.cfg-chapter-drag-ghost .cfilename) {
    flex: 1 1 0;
    min-width: 0;
    font-size: 10px;
    opacity: 0.55;
    font-family: var(--font-mono);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: right;
  }
</style>
