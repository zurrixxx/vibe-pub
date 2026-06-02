import * as api from '../api.js';
import { out, err } from '../output.js';
import { resolveSlug } from './helpers.js';

/** @typedef {import('./helpers.js').CliContext} CliContext */

/** @param {CliContext} ctx */
export async function deleteHandler({ cleanArgs, format }) {
  const slug = cleanArgs[1];
  if (!slug) err('Usage: vibe-pub delete <slug>');

  const page = await resolveSlug(slug);
  try {
    await api.remove(page.id);
    out({ deleted: true, id: page.id, slug: page.slug }, format);
  } catch (e) {
    err(e.message, e.status);
  }
}
