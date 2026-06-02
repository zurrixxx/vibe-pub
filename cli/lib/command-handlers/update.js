import * as api from '../api.js';
import { out, err } from '../output.js';
import { accessFromFlags, parseFlags, readStdin, readMarkdown, resolveSlug } from './helpers.js';

/** @typedef {import('./helpers.js').CliContext} CliContext */

/** @param {CliContext} ctx */
export async function updateHandler({ cleanArgs, format }) {
  const slug = cleanArgs[1];
  if (!slug) err('Usage: vibe-pub update <slug> [file] [--access <level>]');

  const fileArg = cleanArgs[2] && !cleanArgs[2].startsWith('--') ? cleanArgs[2] : null;
  const flagArgs = fileArg ? cleanArgs.slice(3) : cleanArgs.slice(2);
  const flags = parseFlags(flagArgs);

  const page = await resolveSlug(slug);

  if (flags.access) {
    try {
      const result = await api.updatePage(page.id, { access: accessFromFlags(flags) });
      out(result, format);
    } catch (e) {
      err(e.message, e.status);
    }
    return;
  }

  const markdown = readMarkdown(fileArg) ?? (await readStdin());
  if (!markdown || !markdown.trim()) err('No markdown content');

  try {
    const result = await api.update(page.id, markdown, {});
    out(result, format);
  } catch (e) {
    err(e.message, e.status);
  }
}
