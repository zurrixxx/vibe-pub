/**
 * Collection reader — `/c/[slug]` multi-page shell.
 * Not a markdown template spec (see `templates/index.ts` for doc/kanban/etc.).
 *
 * Layout: Reader + Cover/Topbar/Spine | chapter/* | search/* | settings/* | server/*
 */

export { default as Reader } from './Reader.svelte';
export { default as Cover } from './Cover.svelte';
export { default as Spine } from './Spine.svelte';
export { default as Topbar } from './Topbar.svelte';

export {
  chapterLede,
  formatChapterDate,
  ledeFromHtml,
  titleEmphasisParts,
  type ChapterLink,
} from './chapter/index';

export {
  closeSearchPanel,
  closeSettingsPanel,
  openSearchPanel,
  openSettingsPanel,
  searchPanelOpen,
  settingsPanelOpen,
  toggleSearchPanel,
} from './stores';

/** @deprecated Use Reader */
export { default as CollectionReader } from './Reader.svelte';
