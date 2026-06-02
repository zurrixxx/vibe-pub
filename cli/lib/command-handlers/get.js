import * as api from '../api.js';
import { out, err } from '../output.js';

/** @typedef {import('./helpers.js').CliContext} CliContext */

/** @param {CliContext} ctx */
export async function getHandler({ cleanArgs, format }) {
  const slug = cleanArgs[1];
  if (!slug) err('Usage: vibe-pub get <slug>');
  try {
    const page = await api.getBySlug(slug);
    out(page, format);
  } catch (e) {
    err(e.message, e.status);
  }
}
