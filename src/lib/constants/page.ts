/**
 * Page / collection field enums — aligned with D1 CHECK constraints in migrations/.
 * Import from `$lib/constants/page` or `$lib/constants`.
 */

/** Link visibility for pages and collections. */
export const RESOURCE_ACCESS_TPYE = ['public', 'unlisted', 'private'] as const;
export type ResourceAccess = (typeof RESOURCE_ACCESS_TPYE)[number];

/** Visibility choices in ShareAccessPanel (unlisted omitted; still valid in DB/API). */
export const RESOURCE_ACCESS_PANEL_LEVELS = ['public', 'private'] as const;
export type ResourceAccessPanelLevel = (typeof RESOURCE_ACCESS_PANEL_LEVELS)[number];

/** @deprecated Use ResourceAccess — pages and collections share the same access enum. */
export type PageAccess = ResourceAccess;

export const DEFAULT_RESOURCE_ACCESS: ResourceAccess = 'unlisted';

/** Map stored access to a panel dropdown value (unlisted → public). */
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
