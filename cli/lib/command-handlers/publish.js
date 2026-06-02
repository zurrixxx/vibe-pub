import * as api from '../api.js';
import { out, err } from '../output.js';
import { accessFromFlags, parseFlags, readStdin, readMarkdown } from './helpers.js';

/** @typedef {import('./helpers.js').CliContext} CliContext */

/** @param {CliContext} ctx */
export async function publishHandler({ cleanArgs, format }) {
  const fileArg = cleanArgs[1] && !cleanArgs[1].startsWith('--') ? cleanArgs[1] : null;
  const flagArgs = fileArg ? cleanArgs.slice(2) : cleanArgs.slice(1);
  const flags = parseFlags(flagArgs);

  const markdown = readMarkdown(fileArg) ?? (await readStdin());
  if (!markdown || !markdown.trim()) err('No markdown content');

  try {
    const result = await api.publish(markdown, {
      slug: flags.slug,
      view: flags.view,
      access: accessFromFlags(flags),
      theme: flags.theme,
      agentPublished: flags['no-agent-published'] ? false : true,
    });
    out(result, format);
  } catch (e) {
    err(e.message, e.status);
  }
}
