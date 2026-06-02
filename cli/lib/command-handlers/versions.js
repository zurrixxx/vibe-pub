import * as api from '../api.js';
import { out, err } from '../output.js';
import { resolveSlug } from './helpers.js';

/** @typedef {import('./helpers.js').CliContext} CliContext */

/** @param {CliContext} ctx */
export async function versionsHandler({ cleanArgs, format }) {
  const slug = cleanArgs[1];
  if (!slug) err('Usage: vibe-pub versions <slug>');

  const page = await resolveSlug(slug);
  try {
    const versions = await api.getVersions(page.id);
    out(versions, format);
  } catch (e) {
    err(e.message, e.status);
  }
}
