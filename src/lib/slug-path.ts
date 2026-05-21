const MAX_SLUG_LEN = 60;

/** Derive a cosmetic slug from a title. Returns `''` when nothing usable. */
export function slugifyTitle(title: string | null | undefined): string {
  if (!title) return '';
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LEN)
    .replace(/-+$/g, '');
  return slug;
}

/** Canonical URL path for a page: `/<slug>-<id>` or `/<id>` when no slug. */
export function buildCanonicalPath(page: {
  id: string;
  slug: string | null;
  title: string | null;
}): string {
  const stored = (page.slug ?? '').trim();
  const part = stored !== '' ? stored : slugifyTitle(page.title);
  return part ? `/${part}-${page.id}` : `/${page.id}`;
}
