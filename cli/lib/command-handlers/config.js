import { saveConfig } from '../config.js';
import { out, err } from '../output.js';
import { parseFlags } from './helpers.js';

/** @typedef {import('./helpers.js').CliContext} CliContext */

/** @param {CliContext} ctx */
export async function configHandler({ cleanArgs, format }) {
  const flags = parseFlags(cleanArgs.slice(1));
  if (flags.token) {
    saveConfig({ token: flags.token });
    out({ saved: 'token' }, format);
  } else if (flags['base-url']) {
    saveConfig({ baseUrl: flags['base-url'] });
    out({ saved: 'base_url', value: flags['base-url'] }, format);
  } else {
    err('Usage: vibe-pub config --token <token> | --base-url <url>');
  }
}
