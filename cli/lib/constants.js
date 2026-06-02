/** Keep in sync with src/lib/constants/page.ts (CLI package cannot import SvelteKit src). */

export const RESOURCE_ACCESS = ['public', 'private'];

/** Legacy scripts/MCP may still pass `unlisted`; coerced to `public` before API calls. */
export const LEGACY_RESOURCE_ACCESS = 'unlisted';

export const RESOURCE_ACCESS_INPUT = [...RESOURCE_ACCESS, LEGACY_RESOURCE_ACCESS];

/** @param {string | undefined} access */
export function coerceLegacyAccess(access) {
  if (access === undefined || access === null) return undefined;
  return access === LEGACY_RESOURCE_ACCESS ? 'public' : access;
}

/**
 * Resolve `--access` for CLI commands. Legacy `unlisted` → `public`.
 * @param {string | undefined} access
 * @param {(message: string) => never} onError
 */
export function resolveCliAccessFlag(access, onError) {
  if (access === undefined || access === true) return undefined;
  if (access === LEGACY_RESOURCE_ACCESS) return 'public';
  if (RESOURCE_ACCESS.includes(access)) return access;
  onError(
    `Invalid --access "${access}". Use "public" or "private". ("unlisted" is no longer supported; use "public".)`
  );
}

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
