import * as api from '../api.js';
import { out, err } from '../output.js';
import { resolveSlug } from './helpers.js';

/** @typedef {import('./helpers.js').CliContext} CliContext */

/** @param {CliContext} ctx */
export async function versionHandler({ cleanArgs, format }) {
  const slug = cleanArgs[1];
  const num = cleanArgs[2];
  if (!slug || !num) err('Usage: vibe-pub version <slug> <num>');

  const page = await resolveSlug(slug);
  try {
    const version = await api.getVersion(page.id, num);
    out(version, format);
  } catch (e) {
    err(e.message, e.status);
  }
}
