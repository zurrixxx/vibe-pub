import { get, writable } from 'svelte/store';
import { closeReaderAppearancePanel } from '$lib/components/topbar';

/** Collection reader: chapter order & view settings panel */
export const settingsPanelOpen = writable(false);

export function openSettingsPanel() {
  closeReaderAppearancePanel();
  settingsPanelOpen.set(true);
}

export function closeSettingsPanel() {
  settingsPanelOpen.set(false);
}

/** Collection reader: search across chapters */
export const searchPanelOpen = writable(false);

export function openSearchPanel() {
  closeReaderAppearancePanel();
  closeSettingsPanel();
  searchPanelOpen.set(true);
}

export function closeSearchPanel() {
  searchPanelOpen.set(false);
}

export function toggleSearchPanel() {
  if (get(searchPanelOpen)) {
    closeSearchPanel();
  } else {
    openSearchPanel();
  }
}
