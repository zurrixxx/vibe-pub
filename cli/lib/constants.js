/** Keep in sync with src/lib/constants/page.ts (CLI package cannot import SvelteKit src). */

export const RESOURCE_ACCESS = ['public', 'private'];

/** All `pages.view` values (DB CHECK). detectView() only heuristically returns the first four. */
export const PAGE_VIEW_TYPE = ['doc', 'kanban', 'changelog', 'timeline', 'slides', 'dashboard'];

export const PAGE_THEME = [
  'default',
  'paper',
  'terminal',
  'midnight',
  'rose',
  'ocean',
  'stripe',
  'claude',
  'raycast',
  'nord',
  'monokai',
  'dracula',
  'solarized',
  'github',
];
