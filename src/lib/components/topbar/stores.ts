import { writable } from 'svelte/store';

/** Kanban reader: full-width board (Header ··· + Appearance panel + board toolbar). */
export const kanbanReaderBoardFullwidth = writable(true);

/** Reader “Appearance” side panel open state. */
export const readerAppearancePanelOpen = writable(false);

export function openReaderAppearancePanel() {
  readerAppearancePanelOpen.set(true);
}

export function closeReaderAppearancePanel() {
  readerAppearancePanelOpen.set(false);
}
