/**
 * Page / collection field enums — aligned with D1 CHECK constraints in migrations/.
 * Import from `$lib/constants/page` or `$lib/constants`.
 */

/** Link visibility for pages and collections. `unlisted` is legacy-only (existing DB rows); new publishes default to `public`. */
export const RESOURCE_ACCESS_TPYE = ['public', 'unlisted', 'private'] as const;
export type ResourceAccess = (typeof RESOURCE_ACCESS_TPYE)[number];

/** Share panel dropdown — public/private only. Legacy `unlisted` rows are mapped via {@link accessForSharePanel}. */
export const RESOURCE_ACCESS_PANEL_LEVELS = ['public', 'private'] as const;
export type ResourceAccessPanelLevel = (typeof RESOURCE_ACCESS_PANEL_LEVELS)[number];

/** @deprecated Use ResourceAccess — pages and collections share the same access enum. */
export type PageAccess = ResourceAccess;

export const DEFAULT_RESOURCE_ACCESS: ResourceAccess = 'public';

/** Legacy assign/API may send `unlisted`; store and treat as `public`. */
export function coerceLegacyAccess(access: string): string {
  return access === 'unlisted' ? 'public' : access;
}

/** Resolve access on create/update; coerces legacy `unlisted`, falls back when unknown. */
export function resolveAssignableAccess(
  access: string | undefined,
  fallback: ResourceAccess = DEFAULT_RESOURCE_ACCESS
): ResourceAccess {
  if (access === undefined) return fallback;
  const coerced = coerceLegacyAccess(access);
  if (coerced === 'public' || coerced === 'private') return coerced;
  return fallback;
}

/** Strict assign parse for API handlers that must reject unknown values. */
export function parseAssignableAccess(access: string): ResourceAccess | null {
  const coerced = coerceLegacyAccess(access);
  if (coerced === 'public' || coerced === 'private') return coerced;
  return null;
}

/** Map stored access to a ShareAccessPanel value. Legacy rows may still have `unlisted`; show as `public`. */
export function accessForSharePanel(access: ResourceAccess): ResourceAccessPanelLevel {
  return access === 'unlisted' ? 'public' : access;
}

export function isResourceAccess(value: string): value is ResourceAccess {
  return (RESOURCE_ACCESS_TPYE as readonly string[]).includes(value);
}

export const RESOURCE_ACCESS_VALIDATION_MESSAGE = 'access must be public, unlisted, or private';

/**
 * Reader template — all values allowed in `pages.view` (DB CHECK).
 *
 * Resolved at publish time: API/CLI `view` → YAML `view:` → `detectView(markdown)`.
 *
 * `detectView()` only heuristically returns `doc | kanban | changelog | timeline`.
 * `slides` and `dashboard` are never inferred from markdown; set them explicitly
 * via frontmatter or `--view` (see `src/lib/templates/detect.ts`).
 */
export const PAGE_VIEW_TYPE = [
  'doc',
  'kanban',
  'changelog',
  'timeline',
  'slides',
  'dashboard',
] as const;
export type PageView = (typeof PAGE_VIEW_TYPE)[number];

export const DEFAULT_PAGE_VIEW: PageView = 'doc';

export function isPageView(value: string): value is PageView {
  return (PAGE_VIEW_TYPE as readonly string[]).includes(value);
}

/** `pages.theme` */
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
] as const;
export type PageTheme = (typeof PAGE_THEME)[number];

export const DEFAULT_PAGE_THEME: PageTheme = 'default';

export function isPageTheme(value: string): value is PageTheme {
  return (PAGE_THEME as readonly string[]).includes(value);
}
