import { readFileSync } from 'fs';
import * as api from '../api.js';
import { getToken } from '../config.js';
import { out, err } from '../cli-helpers.js';
import { accessFromOption } from './helpers.js';

function parsePartFlag(value) {
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

/** @param {unknown} entry */
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

/** @param {string} json */
function parsePartsJson(json) {
  const data = JSON.parse(json);
  if (!Array.isArray(data)) {
    throw new Error('parts must be a JSON array');
  }
  return data.map(normalizePartEntry);
}

/** @param {{ part?: string[], parts?: string, partsFile?: string }} opts */
function resolveCreateParts(opts) {
  /** @type {{ title: string, page_slugs: string[] }[]} */
  const parts = [];
  for (const spec of opts.part ?? []) {
    const parsed = parsePartFlag(spec);
    if (parsed) parts.push(parsed);
  }
  if (opts.parts) parts.push(...parsePartsJson(opts.parts));
  if (opts.partsFile) {
    const raw = readFileSync(opts.partsFile, 'utf8');
    parts.push(...parsePartsJson(raw));
  }
  return parts;
}

/**
 * @param {{
 *   title: string, slug?: string, description?: string, readersGuide?: string,
 *   whatItsAbout?: string, whoItsFor?: string, howToReadIt?: string, slugs?: string,
 *   part?: string[], parts?: string, partsFile?: string, access?: string, theme?: string,
 *   noAgentPublished?: boolean, format: string
 * }} ctx
 */
export async function collectionCreateHandler(ctx) {
  let parts = [];
  try {
    parts = resolveCreateParts(ctx);
  } catch (e) {
    err(e.message);
  }

  const options = {
    slug: ctx.slug,
    access: accessFromOption(ctx.access),
    description: ctx.description,
    readers_guide: ctx.readersGuide,
    what_its_about: ctx.whatItsAbout,
    who_its_for: ctx.whoItsFor,
    how_to_read_it: ctx.howToReadIt,
    theme: ctx.theme,
    agentPublished: ctx.noAgentPublished ? false : true,
  };
  if (parts.length) options.parts = parts;
  if (ctx.slugs) {
    options.slugs = String(ctx.slugs)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  try {
    const result = await api.createCollection(ctx.title, options);
    out(result, ctx.format);
  } catch (e) {
    err(e.message, e.status);
  }
}

/** @param {{ format: string }} ctx */
export async function collectionListHandler({ format }) {
  if (!getToken()) err('Not logged in. Run: vibe-pub login');
  try {
    const collections = await api.listCollections();
    out(collections, format);
  } catch (e) {
    err(e.message, e.status);
  }
}

/** @param {{ slug: string, format: string }} ctx */
export async function collectionGetHandler({ slug, format }) {
  try {
    const collection = await api.getCollection(slug);
    out(collection, format);
  } catch (e) {
    err(e.message, e.status);
  }
}

/** @param {{ collSlug: string, pageSlug: string, label?: string, partId?: string, format: string }} ctx */
export async function collectionAddHandler({ collSlug, pageSlug, label, partId, format }) {
  try {
    const result = await api.addToCollection(collSlug, pageSlug, {
      label,
      part_id: partId,
    });
    out(result, format);
  } catch (e) {
    err(e.message, e.status);
  }
}

/** @param {{ collSlug: string, pageSlug: string, format: string }} ctx */
export async function collectionRemoveHandler({ collSlug, pageSlug, format }) {
  try {
    const result = await api.removeFromCollection(collSlug, pageSlug);
    out(result, format);
  } catch (e) {
    err(e.message, e.status);
  }
}

/** @param {{ slug: string, format: string }} ctx */
export async function collectionDeleteHandler({ slug, format }) {
  try {
    await api.deleteCollection(slug);
    out({ deleted: true, slug }, format);
  } catch (e) {
    err(e.message, e.status);
  }
}

/**
 * @param {{
 *   slug: string, title?: string, description?: string, readersGuide?: string,
 *   whatItsAbout?: string, whoItsFor?: string, howToReadIt?: string, access?: string, format: string
 * }} ctx
 */
export async function collectionUpdateHandler(ctx) {
  const data = {};
  if (ctx.title) data.title = ctx.title;
  if (ctx.description) data.description = ctx.description;
  if (ctx.readersGuide) data.readers_guide = ctx.readersGuide;
  if (ctx.whatItsAbout) data.what_its_about = ctx.whatItsAbout;
  if (ctx.whoItsFor) data.who_its_for = ctx.whoItsFor;
  if (ctx.howToReadIt) data.how_to_read_it = ctx.howToReadIt;
  if (ctx.access) data.access = accessFromOption(ctx.access);
  if (!Object.keys(data).length) {
    err(
      'Provide at least one of --title, --description, --readers-guide, --what-its-about, --who-its-for, --how-to-read-it, --access'
    );
  }

  try {
    const result = await api.updateCollection(ctx.slug, data);
    out(result, ctx.format);
  } catch (e) {
    err(e.message, e.status);
  }
}

/** @param {{ collSlug: string, format: string }} ctx */
export async function collectionPartListHandler({ collSlug, format }) {
  try {
    const parts = await api.listCollectionParts(collSlug);
    out(parts, format);
  } catch (e) {
    err(e.message, e.status);
  }
}

/** @param {{ collSlug: string, title: string, sortOrder?: string, format: string }} ctx */
export async function collectionPartAddHandler({ collSlug, title, sortOrder, format }) {
  const options = {};
  if (sortOrder !== undefined) options.sort_order = Number(sortOrder);
  try {
    const result = await api.createCollectionPart(collSlug, title, options);
    out(result, format);
  } catch (e) {
    err(e.message, e.status);
  }
}

/** @param {{ collSlug: string, partId: string, title?: string, sortOrder?: string, format: string }} ctx */
export async function collectionPartUpdateHandler({ collSlug, partId, title, sortOrder, format }) {
  const data = {};
  if (title) data.title = title;
  if (sortOrder !== undefined) data.sort_order = Number(sortOrder);
  if (!Object.keys(data).length) err('Provide at least one of --title, --sort-order');

  try {
    const result = await api.updateCollectionPart(collSlug, partId, data);
    out(result, format);
  } catch (e) {
    err(e.message, e.status);
  }
}

/** @param {{ collSlug: string, partId: string, format: string }} ctx */
export async function collectionPartRemoveHandler({ collSlug, partId, format }) {
  try {
    const result = await api.deleteCollectionPart(collSlug, partId);
    out(result, format);
  } catch (e) {
    err(e.message, e.status);
  }
}
