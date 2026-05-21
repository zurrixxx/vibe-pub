import { readFileSync } from 'fs';

/**
 * Parse `Title` or `Title:page-slug-1,page-slug-2` (only first `:` splits title from slugs).
 */
export function parsePartFlag(value) {
  const raw = String(value).trim();
  if (!raw) return null;
  const idx = raw.indexOf(':');
  if (idx === -1) {
    return { title: raw, page_slugs: [] };
  }
  const title = raw.slice(0, idx).trim();
  const page_slugs = raw
    .slice(idx + 1)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!title) return null;
  return { title, page_slugs };
}

/**
 * @param {string} json
 * @returns {{ title: string, page_slugs?: string[] }[]}
 */
export function parsePartsJson(json) {
  const data = JSON.parse(json);
  if (!Array.isArray(data)) {
    throw new Error('parts must be a JSON array');
  }
  return data.map(normalizePartEntry);
}

/**
 * @param {unknown} entry
 */
function normalizePartEntry(entry) {
  if (!entry || typeof entry !== 'object' || !('title' in entry)) {
    throw new Error('each part must be an object with a title');
  }
  const title = String(/** @type {{ title: unknown }} */ (entry).title).trim();
  if (!title) throw new Error('each part must have a non-empty title');
  const page_slugs = Array.isArray(/** @type {{ page_slugs?: unknown }} */ (entry).page_slugs)
    ? /** @type {{ page_slugs: unknown[] }} */ (entry).page_slugs
        .map((s) => String(s).trim())
        .filter(Boolean)
    : [];
  return { title, page_slugs };
}

/**
 * Parse collection create argv: supports repeated --part, --parts JSON, --parts-file.
 * @param {string[]} argv
 */
export function parseCollectionCreateArgv(argv) {
  /** @type {Record<string, string | boolean>} */
  const flags = {};
  /** @type {{ title: string, page_slugs: string[] }[]} */
  const parts = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--part' && argv[i + 1]) {
      const parsed = parsePartFlag(argv[++i]);
      if (parsed) parts.push(parsed);
      continue;
    }
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }

  if (flags.parts && typeof flags.parts === 'string') {
    parts.push(...parsePartsJson(flags.parts));
  }

  if (flags['parts-file'] && typeof flags['parts-file'] === 'string') {
    const raw = readFileSync(flags['parts-file'], 'utf8');
    parts.push(...parsePartsJson(raw));
  }

  return { flags, parts };
}
