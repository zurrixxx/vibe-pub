import { readFileSync } from 'fs';
import * as api from '../api.js';
import { getToken } from '../config.js';
import { out, err } from '../output.js';
import { accessFromFlags, parseFlags } from './helpers.js';

/** @typedef {import('./helpers.js').CliContext} CliContext */

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

/** @param {string[]} argv */
function parseCollectionCreateArgv(argv) {
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

/** @param {CliContext} ctx */
export async function collectionHandler({ cleanArgs, format }) {
  const sub = cleanArgs[1];

  if (sub === 'create') {
    const title = cleanArgs[2];
    if (!title)
      err(
        'Usage: vibe-pub collection create <title> [--slug s] [--description d] [--readers-guide …] [--what-its-about …] [--who-its-for …] [--how-to-read-it …] [--part "Title:p1,p2"] [--slugs p1,p2] ...'
      );
    let parts = [];
    let flags = {};
    try {
      ({ flags, parts } = parseCollectionCreateArgv(cleanArgs.slice(3)));
    } catch (e) {
      err(e.message);
    }
    const options = {
      slug: flags.slug,
      access: accessFromFlags(flags),
      description: flags.description,
      readers_guide: flags['readers-guide'],
      what_its_about: flags['what-its-about'],
      who_its_for: flags['who-its-for'],
      how_to_read_it: flags['how-to-read-it'],
      theme: flags.theme,
      agentPublished: flags['no-agent-published'] ? false : true,
    };
    if (parts.length) options.parts = parts;
    if (flags.slugs)
      options.slugs = String(flags.slugs)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    try {
      const result = await api.createCollection(title, options);
      out(result, format);
    } catch (e) {
      err(e.message, e.status);
    }
    return;
  }

  if (sub === 'list' || sub === 'ls') {
    if (!getToken()) err('Not logged in. Run: vibe-pub login');
    try {
      const collections = await api.listCollections();
      out(collections, format);
    } catch (e) {
      err(e.message, e.status);
    }
    return;
  }

  if (sub === 'get') {
    const slug = cleanArgs[2];
    if (!slug) err('Usage: vibe-pub collection get <slug>');
    try {
      const collection = await api.getCollection(slug);
      out(collection, format);
    } catch (e) {
      err(e.message, e.status);
    }
    return;
  }

  if (sub === 'add') {
    const collSlug = cleanArgs[2];
    const pageSlug = cleanArgs[3];
    if (!collSlug || !pageSlug)
      err(
        'Usage: vibe-pub collection add <collection-slug> <page-slug> [--label "Name"] [--part-id id]'
      );
    const flags = parseFlags(cleanArgs.slice(4));
    try {
      const result = await api.addToCollection(collSlug, pageSlug, {
        label: flags.label,
        part_id: flags['part-id'] ?? flags.part_id,
      });
      out(result, format);
    } catch (e) {
      err(e.message, e.status);
    }
    return;
  }

  if (sub === 'remove' || sub === 'rm') {
    const collSlug = cleanArgs[2];
    const pageSlug = cleanArgs[3];
    if (!collSlug || !pageSlug)
      err('Usage: vibe-pub collection remove <collection-slug> <page-slug>');
    try {
      const result = await api.removeFromCollection(collSlug, pageSlug);
      out(result, format);
    } catch (e) {
      err(e.message, e.status);
    }
    return;
  }

  if (sub === 'delete') {
    const slug = cleanArgs[2];
    if (!slug) err('Usage: vibe-pub collection delete <slug>');
    try {
      await api.deleteCollection(slug);
      out({ deleted: true, slug }, format);
    } catch (e) {
      err(e.message, e.status);
    }
    return;
  }

  if (sub === 'update') {
    const slug = cleanArgs[2];
    if (!slug)
      err(
        'Usage: vibe-pub collection update <slug> [--title t] [--description d] [--readers-guide …] [--what-its-about …] [--who-its-for …] [--how-to-read-it …] [--access a]'
      );
    const flags = parseFlags(cleanArgs.slice(3));
    const data = {};
    if (flags.title) data.title = flags.title;
    if (flags.description) data.description = flags.description;
    if (flags['readers-guide']) data.readers_guide = flags['readers-guide'];
    if (flags['what-its-about']) data.what_its_about = flags['what-its-about'];
    if (flags['who-its-for']) data.who_its_for = flags['who-its-for'];
    if (flags['how-to-read-it']) data.how_to_read_it = flags['how-to-read-it'];
    if (flags.access) data.access = accessFromFlags(flags);
    if (!Object.keys(data).length)
      err(
        'Provide at least one of --title, --description, --readers-guide, --what-its-about, --who-its-for, --how-to-read-it, --access'
      );
    try {
      const result = await api.updateCollection(slug, data);
      out(result, format);
    } catch (e) {
      err(e.message, e.status);
    }
    return;
  }

  if (sub === 'part') {
    const partSub = cleanArgs[2];
    const collSlug = cleanArgs[3];

    if (partSub === 'list' || partSub === 'ls') {
      if (!collSlug) err('Usage: vibe-pub collection part list <collection-slug>');
      try {
        const parts = await api.listCollectionParts(collSlug);
        out(parts, format);
      } catch (e) {
        err(e.message, e.status);
      }
      return;
    }

    if (partSub === 'add') {
      const title = cleanArgs[4];
      if (!collSlug || !title)
        err('Usage: vibe-pub collection part add <collection-slug> <title> [--sort-order n]');
      const flags = parseFlags(cleanArgs.slice(5));
      const options = {};
      if (flags['sort-order'] !== undefined) options.sort_order = Number(flags['sort-order']);
      try {
        const result = await api.createCollectionPart(collSlug, title, options);
        out(result, format);
      } catch (e) {
        err(e.message, e.status);
      }
      return;
    }

    if (partSub === 'update') {
      const partId = cleanArgs[4];
      if (!collSlug || !partId)
        err(
          'Usage: vibe-pub collection part update <collection-slug> <part-id> [--title t] [--sort-order n]'
        );
      const flags = parseFlags(cleanArgs.slice(5));
      const data = {};
      if (flags.title) data.title = flags.title;
      if (flags['sort-order'] !== undefined) data.sort_order = Number(flags['sort-order']);
      if (!Object.keys(data).length) err('Provide at least one of --title, --sort-order');
      try {
        const result = await api.updateCollectionPart(collSlug, partId, data);
        out(result, format);
      } catch (e) {
        err(e.message, e.status);
      }
      return;
    }

    if (partSub === 'remove' || partSub === 'rm') {
      const partId = cleanArgs[4];
      if (!collSlug || !partId)
        err('Usage: vibe-pub collection part remove <collection-slug> <part-id>');
      try {
        const result = await api.deleteCollectionPart(collSlug, partId);
        out(result, format);
      } catch (e) {
        err(e.message, e.status);
      }
      return;
    }

    err('Usage: vibe-pub collection part <list|add|update|remove> <collection-slug> ...');
    return;
  }

  err('Usage: vibe-pub collection <create|list|get|add|remove|delete|update|part>');
}
