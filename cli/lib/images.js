import { readFileSync, existsSync } from 'fs';

/** Keep in sync with src/lib/shared/page-images.ts */
export const MAX_PAGE_IMAGE_BYTES = 1_500_000;
export const MAX_PAGE_IMAGES = 10;

const ALLOWED_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

/** @param {string} path */
export function normalizeAssetPath(path) {
  return path.trim().replace(/\\/g, '/');
}

/** @param {string} src */
export function isLocalImagePath(src) {
  const trimmed = src.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  if (/^data:/i.test(trimmed)) return false;
  if (/^\/i\//.test(trimmed)) return false;
  if (trimmed.includes('://')) return false;
  if (trimmed.startsWith('/')) return true;
  return /^[A-Za-z]:[\\/]/.test(trimmed);
}

/** @param {string} markdown */
export function extractLocalImagePathMap(markdown) {
  /** @type {Map<string, string>} normalized path -> original path from markdown */
  const map = new Map();
  for (const match of markdown.matchAll(MARKDOWN_IMAGE_RE)) {
    const src = (match[2] ?? '').trim();
    if (!isLocalImagePath(src)) continue;
    const normalized = normalizeAssetPath(src);
    if (!map.has(normalized)) map.set(normalized, src);
  }
  return map;
}

/** @param {Uint8Array} data */
function detectImageMimeType(data) {
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

/**
 * Read local absolute-path images referenced in markdown for upload.
 * @param {string} markdown
 * @returns {{ path: string, mime_type: string, data_base64: string }[]}
 */
export function collectLocalImageAssets(markdown) {
  const pathMap = extractLocalImagePathMap(markdown);
  if (pathMap.size > MAX_PAGE_IMAGES) {
    throw new Error(`Too many local images (max ${MAX_PAGE_IMAGES})`);
  }
  if (pathMap.size === 0) return [];

  /** @type {{ path: string, mime_type: string, data_base64: string }[]} */
  const assets = [];
  for (const [normalizedPath, readPath] of pathMap) {
    if (!existsSync(readPath)) {
      throw new Error(`Image not found: ${readPath}`);
    }
    let buf;
    try {
      buf = readFileSync(readPath);
    } catch {
      throw new Error(`Could not read image: ${readPath}`);
    }
    if (buf.byteLength === 0) throw new Error(`Image is empty: ${readPath}`);
    if (buf.byteLength > MAX_PAGE_IMAGE_BYTES) {
      throw new Error(`Image too large (max ${MAX_PAGE_IMAGE_BYTES} bytes): ${readPath}`);
    }
    const mime = detectImageMimeType(buf);
    if (!mime || !ALLOWED_IMAGE_MIMES.has(mime)) {
      throw new Error(`Unsupported image type (use png, jpeg, gif, or webp): ${readPath}`);
    }
    assets.push({
      path: normalizedPath,
      mime_type: mime,
      data_base64: buf.toString('base64'),
    });
  }
  return assets;
}

/**
 * @param {string} markdown
 * @returns {{ markdown: string, assets?: { path: string, mime_type: string, data_base64: string }[] }}
 */
export function prepareMarkdownWithAssets(markdown) {
  const assets = collectLocalImageAssets(markdown);
  if (!assets.length) return { markdown };
  return { markdown, assets };
}
