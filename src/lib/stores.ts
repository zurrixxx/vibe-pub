import { get, writable } from 'svelte/store';

/** Must match `.comments-panel` slide-out duration in PublishedPage.svelte */
export const COMMENTS_PANEL_TRANSITION_MS = 240;

/** When true, the global header is hidden (e.g. collection pages render their own) */
export const hideGlobalHeader = writable(false);

/** Doc article page: slide-in comments panel (header or block comment control) */
export const docCommentsPanelOpen = writable(false);

/** When set, panel shows only comments anchored to this block + bottom composer */
export const docCommentsPanelBlockId = writable<string | null>(null);

/** Page id for the doc chapter that owns the active comment thread */
export const docCommentsPanelPageId = writable<string | null>(null);

/** Non-owner: slide-in version history (Reader_Doc `.history-panel`) */
export const readerHistoryPanelOpen = writable(false);

let pendingCommentsPanelBlockClearTimer: ReturnType<typeof setTimeout> | null = null;

/** Cancel delayed block-id clear (call before opening the panel or changing thread again). */
export function cancelDeferredCommentsPanelBlockClear() {
  if (pendingCommentsPanelBlockClearTimer !== null) {
    clearTimeout(pendingCommentsPanelBlockClearTimer);
    pendingCommentsPanelBlockClearTimer = null;
  }
}

/**
 * Close the comments rail. Clear `docCommentsPanelBlockId` only after the slide-out animation
 * so the header/body don’t flash to the “all threads” layout while the panel is still visible.
 */
export function closeDocCommentsPanel() {
  cancelDeferredCommentsPanelBlockClear();
  docCommentsPanelOpen.set(false);
  pendingCommentsPanelBlockClearTimer = setTimeout(() => {
    docCommentsPanelBlockId.set(null);
    docCommentsPanelPageId.set(null);
    pendingCommentsPanelBlockClearTimer = null;
  }, COMMENTS_PANEL_TRANSITION_MS);
}

export function closeReaderHistoryPanel() {
  readerHistoryPanelOpen.set(false);
}

export function openDocCommentsPanelAllThreads(pageId?: string | null) {
  cancelDeferredCommentsPanelBlockClear();
  readerHistoryPanelOpen.set(false);
  docCommentsPanelBlockId.set(null);
  if (pageId) docCommentsPanelPageId.set(pageId);
  docCommentsPanelOpen.set(true);
}

/** Header "comments" control: open all threads, or close if already showing all threads. */
export function toggleDocCommentsPanelAllThreads() {
  if (get(docCommentsPanelOpen) && get(docCommentsPanelBlockId) === null) {
    closeDocCommentsPanel();
  } else {
    cancelDeferredCommentsPanelBlockClear();
    readerHistoryPanelOpen.set(false);
    docCommentsPanelBlockId.set(null);
    docCommentsPanelOpen.set(true);
  }
}

/** Open block thread on a specific doc page (collection + standalone reader). */
export function openDocCommentsPanelForBlock(pageId: string, blockId: string) {
  cancelDeferredCommentsPanelBlockClear();
  readerHistoryPanelOpen.set(false);
  docCommentsPanelPageId.set(pageId);
  docCommentsPanelBlockId.set(blockId);
  docCommentsPanelOpen.set(true);
}

/** Doc/kanban reader: slide-in version history rail (Header ··· → History). */
export function openReaderHistoryPanel() {
  cancelDeferredCommentsPanelBlockClear();
  docCommentsPanelOpen.set(false);
  docCommentsPanelBlockId.set(null);
  readerHistoryPanelOpen.set(true);
}
