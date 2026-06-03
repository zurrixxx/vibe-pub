import { getToken, getBaseUrl } from '../config.js';
import { out } from '../cli-helpers.js';

/** @param {{ format: string }} ctx */
export async function whoamiHandler({ format }) {
  out({ authenticated: !!getToken(), base_url: getBaseUrl() }, format);
}
