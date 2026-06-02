import * as api from '../api.js';
import { out, err } from '../output.js';
import { resolveSlug } from './helpers.js';

/** @typedef {import('./helpers.js').CliContext} CliContext */

/** @param {CliContext} ctx */
export async function commentsHandler({ cleanArgs, format }) {
  const slug = cleanArgs[1];
  if (!slug) err('Usage: vibe-pub comments <slug> [-a|--all]');

  const flagArgs = cleanArgs.slice(2);
  let includeAll = false;
  for (const a of flagArgs) {
    if (a === '-a' || a === '--all') includeAll = true;
    else err(`Unknown argument: ${a}. Usage: vibe-pub comments <slug> [-a|--all]`);
  }

  const page = await resolveSlug(slug);
  try {
    const comments = await api.getComments(page.id, { all: includeAll });
    out(comments, format);
  } catch (e) {
    err(e.message, e.status);
  }
}
