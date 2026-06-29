import {
  ALLOWED_IMAGE_MIMES,
  MAX_PAGE_IMAGE_BYTES,
  MAX_PAGE_IMAGES,
  detectImageMimeType,
  filenameFromPath,
  normalizeAssetPath,
  rewriteMarkdownImagePaths,
  extractLocalImagePaths,
  extractHostedAssetIds,
} from '$lib/shared/page-images';

export interface PageAssetRow {
  id: string;
  page_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  data: ArrayBuffer;
  created: string;
}

export interface AssetInput {
  path: string;
  mime_type?: string;
  data_base64: string;
}

function generateAssetId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function decodeBase64(dataBase64: string): Uint8Array {
  const binary = atob(dataBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeHex(dataHex: string): Uint8Array {
  const hex = dataHex.trim();
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** D1/miniflare may return BLOB columns as ArrayBuffer, Uint8Array, Blob, or an ambiguous string. */
async function readD1Blob(db: D1Database, id: string, raw: unknown): Promise<ArrayBuffer | null> {
  if (raw instanceof ArrayBuffer) return raw;
  if (raw instanceof Uint8Array) return toArrayBuffer(raw);
  if (typeof Blob !== 'undefined' && raw instanceof Blob) {
    return raw.arrayBuffer();
  }

  // String/other shapes: do not guess hex vs base64 — SQLite hex() is unambiguous.
  const hexRow = await db
    .prepare('SELECT hex(data) AS hex FROM page_assets WHERE id = ?')
    .bind(id)
    .first<{ hex: string }>();
  if (hexRow?.hex) return toArrayBuffer(decodeHex(hexRow.hex));
  return null;
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  const digest = await crypto.subtle.digest('SHA-256', copy);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function assetPublicUrl(baseUrl: string, assetId: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}/i/${assetId}`;
}

function validateAssetInput(
  input: AssetInput,
  index: number
): {
  path: string;
  mimeType: string;
  data: Uint8Array;
  filename: string;
} {
  if (!input.path?.trim()) {
    throw new Error(`assets[${index}]: path is required`);
  }
  if (!input.data_base64?.trim()) {
    throw new Error(`assets[${index}]: data_base64 is required`);
  }

  let data: Uint8Array;
  try {
    data = decodeBase64(input.data_base64);
  } catch {
    throw new Error(`assets[${index}]: invalid base64 data`);
  }

  if (data.byteLength === 0) {
    throw new Error(`assets[${index}]: empty image data`);
  }
  if (data.byteLength > MAX_PAGE_IMAGE_BYTES) {
    throw new Error(
      `assets[${index}]: image exceeds ${MAX_PAGE_IMAGE_BYTES} bytes (got ${data.byteLength})`
    );
  }

  const detected = detectImageMimeType(data);
  const mimeType = input.mime_type?.trim() || detected;
  if (!mimeType || !ALLOWED_IMAGE_MIMES.has(mimeType)) {
    throw new Error(`assets[${index}]: unsupported image type (allowed: png, jpeg, gif, webp)`);
  }
  if (detected && detected !== mimeType) {
    throw new Error(`assets[${index}]: mime_type ${mimeType} does not match file contents`);
  }

  const path = normalizeAssetPath(input.path);
  return {
    path,
    mimeType,
    data,
    filename: filenameFromPath(path),
  };
}

/**
 * Store uploaded images for a page and rewrite local absolute paths in markdown
 * to hosted `/i/{id}` URLs. Drops page_assets rows no longer referenced afterward.
 */
export async function ingestPageAssets(
  db: D1Database,
  pageId: string,
  markdown: string,
  assets: AssetInput[] | undefined,
  baseUrl: string
): Promise<string> {
  let result = markdown;

  if (assets?.length) {
    if (assets.length > MAX_PAGE_IMAGES) {
      throw new Error(`Too many images (max ${MAX_PAGE_IMAGES})`);
    }

    const localPaths = extractLocalImagePaths(markdown);
    const assetPaths = new Set(assets.map((a) => normalizeAssetPath(a.path)));
    for (const localPath of localPaths) {
      if (!assetPaths.has(localPath)) {
        throw new Error(`Missing asset upload for local image path: ${localPath}`);
      }
    }

    const pathToUrl = new Map<string, string>();

    for (let i = 0; i < assets.length; i++) {
      const validated = validateAssetInput(assets[i], i);
      const hash = await sha256Hex(validated.data);

      const existing = await db
        .prepare('SELECT id FROM page_assets WHERE page_id = ? AND sha256 = ?')
        .bind(pageId, hash)
        .first<{ id: string }>();

      let assetId = existing?.id;
      if (!assetId) {
        assetId = generateAssetId();
        await db
          .prepare(
            `INSERT INTO page_assets (id, page_id, filename, mime_type, size_bytes, sha256, data)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            assetId,
            pageId,
            validated.filename,
            validated.mimeType,
            validated.data.byteLength,
            hash,
            validated.data
          )
          .run();
      }

      const url = assetPublicUrl(baseUrl, assetId);
      pathToUrl.set(validated.path, url);
    }

    const rewritten = rewriteMarkdownImagePaths(markdown, pathToUrl);
    result = finalizeRewrittenMarkdown(rewritten);
  }

  await pruneUnreferencedPageAssets(db, pageId, result);
  return result;
}

function finalizeRewrittenMarkdown(rewritten: string): string {
  const remaining = extractLocalImagePaths(rewritten);
  if (remaining.length > 0) {
    throw new Error(`Failed to rewrite local image paths: ${remaining.join(', ')}`);
  }
  return rewritten;
}

/** Remove page_assets rows no longer referenced in markdown `/i/{id}` links. */
async function pruneUnreferencedPageAssets(
  db: D1Database,
  pageId: string,
  markdown: string
): Promise<void> {
  const referenced = extractHostedAssetIds(markdown);
  if (referenced.length === 0) {
    await db.prepare('DELETE FROM page_assets WHERE page_id = ?').bind(pageId).run();
    return;
  }

  const placeholders = referenced.map(() => '?').join(', ');
  await db
    .prepare(`DELETE FROM page_assets WHERE page_id = ? AND id NOT IN (${placeholders})`)
    .bind(pageId, ...referenced)
    .run();
}

export async function getAssetById(db: D1Database, id: string): Promise<PageAssetRow | null> {
  const row = await db
    .prepare(
      'SELECT id, page_id, filename, mime_type, size_bytes, sha256, data, created FROM page_assets WHERE id = ?'
    )
    .bind(id)
    .first<{
      id: string;
      page_id: string;
      filename: string;
      mime_type: string;
      size_bytes: number;
      sha256: string;
      data: unknown;
      created: string;
    }>();

  if (!row) return null;

  const data = await readD1Blob(db, id, row.data);
  if (!data) return null;

  return {
    id: row.id,
    page_id: row.page_id,
    filename: row.filename,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    sha256: row.sha256,
    data,
    created: row.created,
  };
}
