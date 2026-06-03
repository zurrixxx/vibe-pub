import { saveConfig } from '../config.js';
import { out, err } from '../cli-helpers.js';

/** @param {{ token?: string, baseUrl?: string, format: string }} ctx */
export async function configHandler({ token, baseUrl, format }) {
  if (token) {
    saveConfig({ token });
    out({ saved: 'token' }, format);
  } else if (baseUrl) {
    saveConfig({ baseUrl });
    out({ saved: 'base_url', value: baseUrl }, format);
  } else {
    err('Usage: vibe-pub config --token <token> | --base-url <url>');
  }
}
