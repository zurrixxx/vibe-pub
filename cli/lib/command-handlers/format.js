import { KANBAN_FORMAT_DOC, DOC_FORMAT_DOC } from './format-text/index.js';
import { out, err } from '../output.js';

/** @typedef {import('./helpers.js').CliContext} CliContext */

/** @param {CliContext} ctx */
export async function formatHandler({ cleanArgs, format }) {
  const name = cleanArgs[1];
  if (!name) {
    if (format === 'human') {
      out('Format references:\n\n  vibe-pub format kanban\n  vibe-pub format doc', 'human');
    } else {
      out({ formats: ['kanban', 'doc'], usage: 'vibe-pub format <kanban|doc>' }, format);
    }
    return;
  }
  if (name === 'kanban') {
    if (format === 'human') {
      out(KANBAN_FORMAT_DOC, 'human');
    } else {
      out({ format: 'kanban', documentation: KANBAN_FORMAT_DOC }, format);
    }
    return;
  }
  if (name === 'doc') {
    if (format === 'human') {
      out(DOC_FORMAT_DOC, 'human');
    } else {
      out({ format: 'doc', documentation: DOC_FORMAT_DOC }, format);
    }
    return;
  }
  err(`Unknown format: ${name}. Available: kanban, doc (e.g. vibe-pub format doc)`);
}
