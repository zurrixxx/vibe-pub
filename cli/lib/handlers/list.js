import * as api from '../api.js';
import { getToken } from '../config.js';
import { out, err } from '../cli-helpers.js';

/** @param {{ format: string, sharedWithMe?: boolean }} ctx */
export async function listHandler({ format, sharedWithMe }) {
  if (!getToken()) err('Not logged in. Run: vibe-pub login');
  try {
    const pages = await api.list(sharedWithMe);
    out(pages, format);
  } catch (e) {
    err(e.message, e.status);
  }
}
