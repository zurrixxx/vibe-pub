import { writable } from 'svelte/store';

/** When true, the global header is hidden (e.g. collection pages render their own) */
export const hideGlobalHeader = writable(false);

/** Doc article page: slide-in comments panel (header or block comment control) */
export const docCommentsPanelOpen = writable(false);

/** When set, panel shows only comments anchored to this block + bottom composer */
export const docCommentsPanelBlockId = writable<string | null>(null);

export function closeDocCommentsPanel() {
  docCommentsPanelOpen.set(false);
  docCommentsPanelBlockId.set(null);
}

export function openDocCommentsPanelAllThreads() {
  docCommentsPanelBlockId.set(null);
  docCommentsPanelOpen.set(true);
}
