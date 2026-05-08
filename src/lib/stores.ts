import { get, writable } from 'svelte/store';

/** When true, the global header is hidden (e.g. collection pages render their own) */
export const hideGlobalHeader = writable(false);

/** Doc article page: slide-in comments panel (header or block comment control) */
export const docCommentsPanelOpen = writable(false);

/** When set, panel shows only comments anchored to this block + bottom composer */
export const docCommentsPanelBlockId = writable<string | null>(null);

/** Non-owner: slide-in version history (Reader_Doc `.history-panel`) */
export const readerHistoryPanelOpen = writable(false);

export function closeDocCommentsPanel() {
  docCommentsPanelOpen.set(false);
  docCommentsPanelBlockId.set(null);
}

export function closeReaderHistoryPanel() {
  readerHistoryPanelOpen.set(false);
}

export function openDocCommentsPanelAllThreads() {
  readerHistoryPanelOpen.set(false);
  docCommentsPanelBlockId.set(null);
  docCommentsPanelOpen.set(true);
}

/** Header "comments" control: open all threads, or close if already showing all threads. */
export function toggleDocCommentsPanelAllThreads() {
  if (get(docCommentsPanelOpen) && get(docCommentsPanelBlockId) === null) {
    closeDocCommentsPanel();
  } else {
    readerHistoryPanelOpen.set(false);
    docCommentsPanelBlockId.set(null);
    docCommentsPanelOpen.set(true);
  }
}

/** Header History (non-owner): open reader history rail; closes comments. */
export function openReaderHistoryPanel() {
  closeDocCommentsPanel();
  readerHistoryPanelOpen.set(true);
}
