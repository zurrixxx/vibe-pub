import * as api from '../api.js';
import { out, err } from '../output.js';
import { parseFlags, resolveSlug } from './helpers.js';

/** @typedef {import('./helpers.js').CliContext} CliContext */

/** @param {CliContext} ctx */
export async function resolveHandler({ cleanArgs, format }) {
  const slug = cleanArgs[1];
  if (!slug) err('Usage: vibe-pub resolve <slug> [--all] [--ids id1,id2]');

  const flags = parseFlags(cleanArgs.slice(2));
  const page = await resolveSlug(slug);
  const options = {};
  if (flags.all === true) options.all = true;
  if (flags.ids) options.comment_ids = flags.ids.split(',');

  if (!options.all && !options.comment_ids) {
    err('Provide --all or --ids <id1,id2,...>');
  }

  try {
    const result = await api.resolveComments(page.id, options);
    out(result, format);
  } catch (e) {
    err(e.message, e.status);
  }
}
