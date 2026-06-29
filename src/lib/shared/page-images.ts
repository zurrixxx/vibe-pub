/** Max bytes per image row (D1 single-row limit is 2 MB; leave headroom for metadata). */
export const MAX_PAGE_IMAGE_BYTES = 1_500_000;

/** Max images attached to one publish/update request. */
export const MAX_PAGE_IMAGES = 10;

export const ALLOWED_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

export interface MarkdownImageRef {
  alt: string;
  src: string;
  start: number;
  end: number;
}

export function normalizeAssetPath(path: string): string {
  return path.trim().replace(/\\/g, '/');
}

/** True for local absolute paths (Unix `/…` or Windows `C:/…`). */
export function isLocalImagePath(src: string): boolean {
  const trimmed = src.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  if (/^data:/i.test(trimmed)) return false;
  if (/^\/i\//.test(trimmed)) return false;
  if (/^vibe\.pub\/i\//i.test(trimmed)) return false;
  if (trimmed.includes('://')) return false;
  if (trimmed.startsWith('/')) return true;
  return /^[A-Za-z]:[\\/]/.test(trimmed);
}

export function extractMarkdownImageRefs(markdown: string): MarkdownImageRef[] {
  const refs: MarkdownImageRef[] = [];
  for (const match of markdown.matchAll(MARKDOWN_IMAGE_RE)) {
    const full = match[0];
    const alt = match[1] ?? '';
    const src = match[2] ?? '';
    const start = match.index ?? 0;
    refs.push({ alt, src, start, end: start + full.length });
  }
  return refs;
}

export function extractLocalImagePaths(markdown: string): string[] {
  const seen = new Set<string>();
  const paths: string[] = [];
  for (const ref of extractMarkdownImageRefs(markdown)) {
    const raw = ref.src.trim();
    if (!isLocalImagePath(raw)) continue;
    const normalized = normalizeAssetPath(raw);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    paths.push(normalized);
  }
  return paths;
}

/** Matches `/i/{id}` in hosted asset URLs (ids are 12 lowercase hex chars). */
const HOSTED_ASSET_ID_RE = /\/i\/([0-9a-f]{12})(?:\?|#|$|[^0-9a-f])/i;

/** Asset ids referenced by markdown image links pointing at `/i/{id}`. */
export function extractHostedAssetIds(markdown: string): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const ref of extractMarkdownImageRefs(markdown)) {
    const match = ref.src.trim().match(HOSTED_ASSET_ID_RE);
    if (!match) continue;
    const id = match[1].toLowerCase();
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function rewriteMarkdownImagePaths(
  markdown: string,
  pathToUrl: ReadonlyMap<string, string>
): string {
  if (pathToUrl.size === 0) return markdown;
  return markdown.replace(MARKDOWN_IMAGE_RE, (match, alt: string, src: string) => {
    const trimmed = src.trim();
    const normalized = normalizeAssetPath(trimmed);
    const url = pathToUrl.get(normalized) ?? pathToUrl.get(trimmed);
    if (!url) return match;
    return `![${alt}](${url})`;
  });
}

export function detectImageMimeType(data: Uint8Array): string | null {
  if (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47
  ) {
    return 'image/png';
  }
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    data.length >= 6 &&
    data[0] === 0x47 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x38
  ) {
    return 'image/gif';
  }
  if (
    data.length >= 12 &&
    data[0] === 0x52 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x46 &&
    data[8] === 0x57 &&
    data[9] === 0x45 &&
    data[10] === 0x42 &&
    data[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

export function filenameFromPath(path: string): string {
  const normalized = normalizeAssetPath(path);
  const slash = normalized.lastIndexOf('/');
  return slash >= 0 ? normalized.slice(slash + 1) : normalized;
}
