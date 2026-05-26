import { get, writable } from 'svelte/store';

export const myPageSearchPanelOpen = writable(false);

export function openMyPageSearchPanel() {
  myPageSearchPanelOpen.set(true);
}

export function closeMyPageSearchPanel() {
  myPageSearchPanelOpen.set(false);
}

export function toggleMyPageSearchPanel() {
  if (get(myPageSearchPanelOpen)) closeMyPageSearchPanel();
  else openMyPageSearchPanel();
}
