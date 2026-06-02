import * as api from '../api.js';
import { out, err } from '../output.js';
import { parseFlags, resolveSlug } from './helpers.js';

/** @typedef {import('./helpers.js').CliContext} CliContext */

/** @param {CliContext} ctx */
export async function commentHandler({ cleanArgs, format }) {
  const slug = cleanArgs[1];
  const body = cleanArgs[2];
  if (!slug || !body) err('Usage: vibe-pub comment <slug> "body" [--anchor blockId]');

  const flags = parseFlags(cleanArgs.slice(3));
  const page = await resolveSlug(slug);
  try {
    const comment = await api.addComment(page.id, body, { anchor: flags.anchor });
    out(comment, format);
  } catch (e) {
    err(e.message, e.status);
  }
}
