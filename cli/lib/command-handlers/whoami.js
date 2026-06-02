import { getToken, getBaseUrl } from '../config.js';
import { out } from '../output.js';

/** @typedef {import('./helpers.js').CliContext} CliContext */

/** @param {CliContext} ctx */
export async function whoamiHandler({ format }) {
  out({ authenticated: !!getToken(), base_url: getBaseUrl() }, format);
}
